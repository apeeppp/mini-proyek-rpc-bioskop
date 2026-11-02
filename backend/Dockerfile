FROM python:3.12-slim
WORKDIR /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python scripts/generate_proto.py
ENV PYTHONPATH=/workspace
EXPOSE 50051 8000
CMD ["python", "-m", "app.api"]
