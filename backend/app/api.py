import asyncio
import logging
import threading
import uuid
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import grpc

from .generated import cinema_pb2 as pb, cinema_pb2_grpc as rpc
from .config import settings
from .server import serve as start_grpc_server, get_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cinema_api")

_grpc_server_thread = None

def get_grpc_stub():
    target = f"localhost:{settings.grpc_port}"
    ch = grpc.insecure_channel(target)
    return rpc.CinemaServiceStub(ch)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _grpc_server_thread
    logger.info("Memulai gRPC server di background thread...")
    _grpc_server_thread = threading.Thread(target=start_grpc_server, daemon=True)
    _grpc_server_thread.start()
    await asyncio.sleep(0.5)
    logger.info("FastAPI siap menerima koneksi.")
    yield
    logger.info("FastAPI shut down.")

app = FastAPI(
    title="CinemaRPC Web Gateway",
    description="REST & WebSocket API Gateway untuk Cinema gRPC Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BookRequestModel(BaseModel):
    show_id: str = "SHOW-001"
    seat_no: str
    customer_name: str
    request_id: Optional[str] = None

class CancelRequestModel(BaseModel):
    booking_id: str
    request_id: Optional[str] = None

def handle_grpc_error(e: grpc.RpcError):
    code = e.code()
    details = e.details()
    if code == grpc.StatusCode.NOT_FOUND:
        raise HTTPException(status_code=404, detail=details)
    elif code == grpc.StatusCode.ALREADY_EXISTS:
        raise HTTPException(status_code=409, detail=details)
    elif code == grpc.StatusCode.INVALID_ARGUMENT:
        raise HTTPException(status_code=400, detail=details)
    elif code == grpc.StatusCode.FAILED_PRECONDITION:
        raise HTTPException(status_code=412, detail=details)
    raise HTTPException(status_code=500, detail=details or "Internal Server Error")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "grpc_target": f"localhost:{settings.grpc_port}"}

@app.get("/api/shows/{show_id}/seats")
def list_seats(show_id: str = "SHOW-001"):
    stub = get_grpc_stub()
    try:
        response = stub.DaftarKursi(pb.ShowRequest(show_id=show_id), timeout=settings.rpc_timeout)
        seats = [
            {
                "seat_no": s.seat_no,
                "status": s.status,
                "customer_name": s.customer_name,
                "booking_id": s.booking_id
            }
            for s in response.seats
        ]
        return {"show_id": response.show_id, "seats": seats}
    except grpc.RpcError as e:
        handle_grpc_error(e)

@app.post("/api/bookings")
def book_seat(payload: BookRequestModel):
    stub = get_grpc_stub()
    req_id = payload.request_id or str(uuid.uuid4())
    try:
        res = stub.PesanKursi(
            pb.BookSeatRequest(
                request_id=req_id,
                show_id=payload.show_id,
                seat_no=payload.seat_no,
                customer_name=payload.customer_name
            ),
            timeout=settings.rpc_timeout
        )
        return {
            "success": res.success,
            "message": res.message,
            "booking_id": res.booking_id,
            "request_id": res.request_id,
            "show_id": res.show_id,
            "seat_no": res.seat_no,
            "customer_name": res.customer_name,
            "status": res.status
        }
    except grpc.RpcError as e:
        handle_grpc_error(e)

@app.get("/api/bookings/{booking_id}")
def get_booking(booking_id: str):
    stub = get_grpc_stub()
    try:
        res = stub.GetPemesanan(pb.BookingLookupRequest(booking_id=booking_id), timeout=settings.rpc_timeout)
        return {
            "success": res.success,
            "message": res.message,
            "booking_id": res.booking_id,
            "request_id": res.request_id,
            "show_id": res.show_id,
            "seat_no": res.seat_no,
            "customer_name": res.customer_name,
            "status": res.status
        }
    except grpc.RpcError as e:
        handle_grpc_error(e)

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, payload: Optional[CancelRequestModel] = Body(default=None)):
    stub = get_grpc_stub()
    req_id = (payload.request_id if payload and payload.request_id else str(uuid.uuid4()))
    try:
        res = stub.BatalkanPemesanan(
            pb.CancelBookingRequest(request_id=req_id, booking_id=booking_id),
            timeout=settings.rpc_timeout
        )
        return {
            "success": res.success,
            "message": res.message,
            "booking_id": res.booking_id,
            "request_id": res.request_id,
            "show_id": res.show_id,
            "seat_no": res.seat_no,
            "customer_name": res.customer_name,
            "status": res.status
        }
    except grpc.RpcError as e:
        handle_grpc_error(e)

@app.websocket("/ws/shows/{show_id}")
async def websocket_seat_stream(websocket: WebSocket, show_id: str):
    await websocket.accept()
    service = get_service()
    
    # Ambil snapshot awal langsung dari repository
    try:
        initial_seats = service.repo.list_seats(show_id)
        for s in initial_seats:
            await websocket.send_json({
                "show_id": show_id,
                "seat_no": s["seat_no"],
                "status": s["status"],
                "customer_name": s["customer_name"],
                "booking_id": s["booking_id"],
                "event": "SNAPSHOT"
            })
    except Exception as err:
        logger.warning("Gagal mengirim snapshot kursi: %s", err)

    # Berlangganan langsung ke stream_manager tanpa memakan thread pool gRPC
    sub_queue = service.streams.subscribe(show_id)
    try:
        while True:
            # Polling queue secara non-blocking di async loop
            try:
                event = sub_queue.get_nowait()
                data = {
                    "show_id": event.show_id,
                    "seat_no": event.seat_no,
                    "status": event.status,
                    "customer_name": event.customer_name,
                    "booking_id": event.booking_id,
                    "event": event.event
                }
                await websocket.send_json(data)
            except Exception:
                await asyncio.sleep(0.15)
    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("WebSocket disconnected for show_id %s", show_id)
    finally:
        service.streams.unsubscribe(show_id, sub_queue)

def main():
    import uvicorn
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
