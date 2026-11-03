import hashlib, json, uuid
from psycopg.types.json import Jsonb
from .database import connection

class RepositoryError(Exception):
    def __init__(self, code, message): self.code, self.message = code, message; super().__init__(message)

def digest(value): return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
def row_response(row, success=True, message='OK'):
    return dict(success=success, message=message, booking_id=str(row['booking_id']), request_id=row['request_id'], show_id=row['show_id'], seat_no=row['seat_no'], customer_name=row['customer_name'], status=row['status'])

class Repository:
    def list_seats(self, show_id):
        with connection() as c:
            if not c.execute('SELECT 1 FROM shows WHERE show_id=%s',(show_id,)).fetchone(): raise RepositoryError('NOT_FOUND','Jadwal tidak ditemukan')
            return c.execute("SELECT s.seat_no,s.status,COALESCE(b.customer_name,'') customer_name,COALESCE(s.booking_id::text,'') booking_id FROM seats s LEFT JOIN bookings b ON b.booking_id=s.booking_id WHERE s.show_id=%s ORDER BY s.seat_no",(show_id,)).fetchall()
    def book(self, request_id, show_id, seat_no, customer_name):
        payload={'show_id':show_id,'seat_no':seat_no,'customer_name':customer_name}; ph=digest(payload)
        with connection() as c:
            c.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',(request_id,))
            prior=c.execute('SELECT * FROM bookings WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
            if prior:
                if prior['payload_hash'] != ph: raise RepositoryError('INVALID_ARGUMENT','request_id sudah digunakan dengan payload berbeda')
                return row_response(prior, message='Hasil retry idempoten')
            seat=c.execute('SELECT * FROM seats WHERE show_id=%s AND seat_no=%s FOR UPDATE',(show_id,seat_no)).fetchone()
            if not seat: raise RepositoryError('NOT_FOUND','Jadwal atau kursi tidak ditemukan')
            if seat['status'] != 'AVAILABLE': raise RepositoryError('ALREADY_EXISTS','Kursi sudah dipesan')
            bid=uuid.uuid4()
            row=c.execute("INSERT INTO bookings(booking_id,request_id,payload_hash,show_id,seat_no,customer_name,status) VALUES(%s,%s,%s,%s,%s,%s,'CONFIRMED') RETURNING *",(bid,request_id,ph,show_id,seat_no,customer_name)).fetchone()
            c.execute("UPDATE seats SET status='BOOKED',booking_id=%s,updated_at=now() WHERE show_id=%s AND seat_no=%s",(bid,show_id,seat_no))
            return row_response(row, message='Pemesanan berhasil')
    def get_booking(self, booking_id):
        with connection() as c:
            row=c.execute('SELECT * FROM bookings WHERE booking_id=%s',(booking_id,)).fetchone()
            if not row: raise RepositoryError('NOT_FOUND','Pemesanan tidak ditemukan')
            return row_response(row)
    def cancel(self, request_id, booking_id):
        ph=digest({'booking_id':booking_id})
        with connection() as c:
            c.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))',(request_id,))
            op=c.execute('SELECT * FROM operation_requests WHERE request_id=%s FOR UPDATE',(request_id,)).fetchone()
            if op:
                if op['operation']!='cancel' or op['payload_hash']!=ph: raise RepositoryError('INVALID_ARGUMENT','request_id sudah digunakan dengan payload berbeda')
                return op['response']
            row=c.execute('SELECT * FROM bookings WHERE booking_id=%s FOR UPDATE',(booking_id,)).fetchone()
            if not row: raise RepositoryError('NOT_FOUND','Pemesanan tidak ditemukan')
            if row['status']!='CONFIRMED': raise RepositoryError('FAILED_PRECONDITION','Pemesanan sudah dibatalkan')
            c.execute("UPDATE bookings SET status='CANCELLED',updated_at=now() WHERE booking_id=%s",(booking_id,))
            c.execute("UPDATE seats SET status='AVAILABLE',booking_id=NULL,updated_at=now() WHERE show_id=%s AND seat_no=%s",(row['show_id'],row['seat_no']))
            result=row_response(dict(row, status='CANCELLED',request_id=request_id),message='Pemesanan dibatalkan')
            c.execute('INSERT INTO operation_requests(request_id,operation,payload_hash,response) VALUES(%s,%s,%s,%s)',(request_id,'cancel',ph,Jsonb(result)))
            return result
    def list_bookings(self, show_id):
        with connection() as c:
            rows = c.execute(
                "SELECT booking_id::text, request_id, show_id, seat_no, customer_name, status, created_at, updated_at "
                "FROM bookings WHERE show_id=%s ORDER BY created_at DESC",
                (show_id,)
            ).fetchall()
            return [
                {
                    "booking_id": r["booking_id"],
                    "request_id": r["request_id"],
                    "show_id": r["show_id"],
                    "seat_no": r["seat_no"],
                    "customer_name": r["customer_name"],
                    "status": r["status"],
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else "",
                    "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else ""
                }
                for r in rows
            ]

