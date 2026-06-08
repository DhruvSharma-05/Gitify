FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ .

ENV PYTHONUNBUFFERED=1
ENV GITIFY_DB_PATH=/data/gitify.db
ENV GITIFY_CORS_ORIGINS=http://localhost:5173,http://localhost:8080
ENV GITIFY_SESSION_ROOT=/tmp/gitify-sessions

RUN mkdir -p /data /tmp/gitify-sessions

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
