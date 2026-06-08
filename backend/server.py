"""
Proxy HTTP opzionale verso le API Next.js.

Mantiene compatibilita' con installazioni che espongono la porta 8001 e
inoltra le richieste verso l'app Next.js sulla porta 3000.
"""
from contextlib import asynccontextmanager
import logging
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy")

TARGET = os.getenv("NEXTJS_TARGET", "http://localhost:3000").rstrip("/")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(follow_redirects=False, timeout=60.0)
    try:
        yield
    finally:
        await app.state.http_client.aclose()


app = FastAPI(lifespan=lifespan)


def response_headers(headers: httpx.Headers) -> dict[str, str]:
    blocked = {"content-encoding", "content-length", "transfer-encoding"}
    return {k: v for k, v in headers.items() if k.lower() not in blocked}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def proxy(request: Request, path: str):
    full_path = f"/api/{path}" if not path.startswith("api/") else f"/{path}"
    qs = request.url.query
    url = f"{TARGET}{full_path}"
    if qs:
        url += f"?{qs}"

    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    body = await request.body()

    client: httpx.AsyncClient = request.app.state.http_client
    upstream = await client.request(
        method=request.method,
        url=url,
        headers=headers,
        content=body,
    )

    if upstream.status_code >= 500:
        logger.warning("Upstream response %s for %s %s", upstream.status_code, request.method, url)

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers(upstream.headers),
        media_type=upstream.headers.get("content-type"),
    )
