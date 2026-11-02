import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://cinema:cinema@db:5432/cinema")
    grpc_host: str = os.getenv("GRPC_HOST", "0.0.0.0")
    grpc_port: int = int(os.getenv("GRPC_PORT", "50051"))
    rpc_target: str = os.getenv("RPC_TARGET", "server:50051")
    rpc_timeout: float = float(os.getenv("RPC_TIMEOUT", "3"))
    retry_count: int = int(os.getenv("RETRY_COUNT", "3"))

settings = Settings()
