# Phase 3 Docker Notes

This repo now includes a minimal Docker setup for the production-shaped Phase 3 deployment.

Files added:
- `Dockerfile.backend` for the FastAPI AI service.
- `Dockerfile.frontend` for the Next.js frontend.
- `docker-compose.yml` to run both services together.
- `nginx/default.conf` for reverse proxy and TLS termination.
- `.dockerignore` to keep build context small.

## What the setup covers

- Backend exposes port `8000`.
- Frontend exposes port `3000`.
- Nginx exposes ports `80` and `443` and routes `/` to the frontend and `/api/` to the backend.
- Backend receives the model and label paths from mounted volumes.
- Frontend receives `NEXT_PUBLIC_*` values as build args and runtime env.
- Compose mounts training exports and upload archive folders for persistence.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FASTAPI_URL`
- `DOMAIN` or a direct `NEXT_PUBLIC_FASTAPI_URL` pointing to the HTTPS site served by Nginx
- `SUPABASE_URL` (if the backend export job needs it)
- `SUPABASE_SERVICE_ROLE_KEY` (if the backend export job needs it)

## Nginx and SSL

The reverse proxy uses a standard Nginx container and a checked-in config file:

- HTTP requests redirect to HTTPS.
- `/api/` is proxied to the FastAPI backend.
- All other requests are proxied to the Next.js frontend.
- TLS certs are expected under `/etc/letsencrypt/live/<domain>/`.

The checked-in Nginx config uses `example.com` as a placeholder certificate path. Replace it with your actual domain before deploying.

## Example run

```powershell
docker compose up --build
```

## Report note

The current Docker setup is intentionally simple but now includes a production-shaped Nginx layer for HTTPS termination and API routing. If you later want automated cert renewal, you can add Certbot as a follow-up layer.
