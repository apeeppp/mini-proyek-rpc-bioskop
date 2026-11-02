import sys
from pathlib import Path
from grpc_tools import protoc
root = Path(__file__).resolve().parents[1]
out = root / 'app/generated'
out.mkdir(parents=True, exist_ok=True)
result = protoc.main(['grpc_tools.protoc', '-I' + str(root / 'proto'), '--python_out=' + str(out), '--grpc_python_out=' + str(out), str(root / 'proto/cinema.proto')])
if result:
    raise SystemExit(result)
(out / '__init__.py').touch()
grpc_file = out / 'cinema_pb2_grpc.py'
source = grpc_file.read_text(encoding='utf-8').replace('import cinema_pb2 as cinema__pb2', 'from . import cinema_pb2 as cinema__pb2')
grpc_file.write_text(source, encoding='utf-8')
