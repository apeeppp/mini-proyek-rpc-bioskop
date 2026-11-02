import logging
from concurrent import futures
import grpc
from .generated import cinema_pb2 as pb, cinema_pb2_grpc as rpc
from .config import settings
from .repository import Repository, RepositoryError
from .stream_manager import StreamManager
logging.basicConfig(level=logging.INFO)
class CinemaService(rpc.CinemaServiceServicer):
    def __init__(self): self.repo=Repository(); self.streams=StreamManager()
    def fail(self, context, error):
        codes={'INVALID_ARGUMENT':grpc.StatusCode.INVALID_ARGUMENT,'NOT_FOUND':grpc.StatusCode.NOT_FOUND,'ALREADY_EXISTS':grpc.StatusCode.ALREADY_EXISTS,'FAILED_PRECONDITION':grpc.StatusCode.FAILED_PRECONDITION}
        context.abort(codes.get(error.code,grpc.StatusCode.INTERNAL),error.message)
    def DaftarKursi(self, request, context):
        if not request.show_id: context.abort(grpc.StatusCode.INVALID_ARGUMENT,'show_id wajib diisi')
        try: rows=self.repo.list_seats(request.show_id)
        except RepositoryError as e: self.fail(context,e)
        return pb.SeatList(show_id=request.show_id,seats=[pb.Seat(**r) for r in rows])
    def PesanKursi(self, request, context):
        if not all((request.request_id,request.show_id,request.seat_no,request.customer_name)): context.abort(grpc.StatusCode.INVALID_ARGUMENT,'Semua field wajib diisi')
        try: result=self.repo.book(request.request_id,request.show_id,request.seat_no,request.customer_name)
        except RepositoryError as e: self.fail(context,e)
        self.streams.publish(result['show_id'],pb.SeatStatus(show_id=result['show_id'],seat_no=result['seat_no'],status='BOOKED',customer_name=result['customer_name'],booking_id=result['booking_id'],event='BOOKED'))
        return pb.BookingResponse(**result)
    def GetPemesanan(self, request, context):
        try: return pb.BookingResponse(**self.repo.get_booking(request.booking_id))
        except RepositoryError as e: self.fail(context,e)
    def BatalkanPemesanan(self, request, context):
        if not request.request_id or not request.booking_id: context.abort(grpc.StatusCode.INVALID_ARGUMENT,'request_id dan booking_id wajib diisi')
        try: result=self.repo.cancel(request.request_id,request.booking_id)
        except RepositoryError as e: self.fail(context,e)
        self.streams.publish(result['show_id'],pb.SeatStatus(show_id=result['show_id'],seat_no=result['seat_no'],status='AVAILABLE',event='CANCELLED'))
        return pb.BookingResponse(**result)
    def StreamStatusKursi(self, request, context):
        try: rows=self.repo.list_seats(request.show_id)
        except RepositoryError as e: self.fail(context,e); return
        q=self.streams.subscribe(request.show_id)
        try:
            for row in rows: yield pb.SeatStatus(show_id=request.show_id,seat_no=row['seat_no'],status=row['status'],customer_name=row['customer_name'],booking_id=row['booking_id'],event='SNAPSHOT')
            while context.is_active():
                try: yield q.get(timeout=.5)
                except Exception: continue
        finally: self.streams.unsubscribe(request.show_id,q)
def serve():
    server=grpc.server(futures.ThreadPoolExecutor(max_workers=32)); rpc.add_CinemaServiceServicer_to_server(CinemaService(),server)
    server.add_insecure_port('%s:%s' % (settings.grpc_host,settings.grpc_port)); server.start(); logging.info('gRPC listening on %s',settings.grpc_port); server.wait_for_termination()
if __name__=='__main__': serve()

