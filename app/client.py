import argparse, concurrent.futures, csv, json, statistics, threading, time, uuid
import grpc
from .generated import cinema_pb2 as pb, cinema_pb2_grpc as rpc
from .config import settings
def channel(): return grpc.insecure_channel(settings.rpc_target)
def call(fn):
    for attempt in range(settings.retry_count+1):
        try: return fn(timeout=settings.rpc_timeout)
        except grpc.RpcError as e:
            if e.code() not in (grpc.StatusCode.UNAVAILABLE,grpc.StatusCode.DEADLINE_EXCEEDED) or attempt>=settings.retry_count: raise
            time.sleep(min(.2*(2**attempt),1))
def benchmark(stub):
    rows=[]
    for concurrency in (1,5,20):
        n=100; lat=[]; errors=[0]; lock=threading.Lock(); start=time.perf_counter()
        def work(_):
            t=time.perf_counter()
            try: stub.DaftarKursi(pb.ShowRequest(show_id='SHOW-001'),timeout=settings.rpc_timeout)
            except grpc.RpcError:
                with lock: errors[0]+=1
            with lock: lat.append((time.perf_counter()-t)*1000)
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as ex: list(ex.map(work,range(n)))
        elapsed=time.perf_counter()-start; success=n-errors[0]
        rows.append({'concurrency':concurrency,'requests':n,'success':success,'errors':errors[0],'total_seconds':round(elapsed,4),'avg_latency_ms':round(statistics.mean(lat),3),'p95_latency_ms':round(sorted(lat)[int(.95*len(lat))-1],3),'throughput_rps':round(success/elapsed,3)})
    with open('results/benchmark.csv','w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=rows[0]); w.writeheader(); w.writerows(rows)
    import matplotlib.pyplot as plt
    fig, axis = plt.subplots()
    axis.bar([str(r['concurrency']) for r in rows], [r['throughput_rps'] for r in rows])
    axis.set(xlabel='Client bersamaan', ylabel='Request/detik', title='Benchmark DaftarKursi')
    fig.tight_layout(); fig.savefig('results/benchmark.png'); plt.close(fig)
    print(json.dumps(rows,indent=2))
def main():
    p=argparse.ArgumentParser(prog='cinema'); s=p.add_subparsers(dest='command',required=True)
    for name in ('list','watch','benchmark','race-test'): s.add_parser(name)
    b=s.add_parser('book'); b.add_argument('show_id'); b.add_argument('seat_no'); b.add_argument('customer_name'); b.add_argument('--request-id')
    g=s.add_parser('get'); g.add_argument('booking_id')
    c=s.add_parser('cancel'); c.add_argument('booking_id'); c.add_argument('--request-id')
    a=p.parse_args(); stub=rpc.CinemaServiceStub(channel())
    if a.command=='list': print(json.dumps([{'seat_no':x.seat_no,'status':x.status,'customer_name':x.customer_name} for x in call(lambda **kw:stub.DaftarKursi(pb.ShowRequest(show_id='SHOW-001'),**kw)).seats],indent=2))
    elif a.command=='book': print(call(lambda **kw:stub.PesanKursi(pb.BookSeatRequest(request_id=a.request_id or str(uuid.uuid4()),show_id=a.show_id,seat_no=a.seat_no,customer_name=a.customer_name),**kw)))
    elif a.command=='get': print(call(lambda **kw:stub.GetPemesanan(pb.BookingLookupRequest(booking_id=a.booking_id),**kw)))
    elif a.command=='cancel': print(call(lambda **kw:stub.BatalkanPemesanan(pb.CancelBookingRequest(request_id=a.request_id or str(uuid.uuid4()),booking_id=a.booking_id),**kw)))
    elif a.command=='watch':
        try:
            for event in stub.StreamStatusKursi(pb.ShowRequest(show_id='SHOW-001')): print(event,flush=True)
        except KeyboardInterrupt: pass
    elif a.command=='benchmark': benchmark(stub)
    elif a.command=='race-test':
        gate=threading.Barrier(2); results=[]
        def task(i):
            gate.wait()
            try: results.append(('SUCCESS',stub.PesanKursi(pb.BookSeatRequest(request_id=str(uuid.uuid4()),show_id='SHOW-001',seat_no='A1',customer_name='client-%s'%i),timeout=settings.rpc_timeout).booking_id))
            except grpc.RpcError as e: results.append((e.code().name,e.details()))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex: list(ex.map(task,range(2)))
        print(json.dumps(results,indent=2))
if __name__=='__main__': main()

