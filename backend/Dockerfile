# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12.9
FROM python:${PYTHON_VERSION}-alpine AS base

RUN apk update && \
    apk add --no-cache musl-dev libpq-dev gcc

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

RUN mkdir /app/uploads && chown appuser:appuser /app/uploads

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install -r requirements.txt

COPY . .

RUN chmod +x /app/start.sh

USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]