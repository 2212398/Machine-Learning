# Final Exam Deploy Information

## Project

- Repository: `https://github.com/2212398/Machine-Learning`
- Production domain: `https://plantdetec.duckdns.org`
- Frontend container: `plantleaf_frontend`
- Backend service: `backend:8000`
- Reverse proxy: Nginx + Docker Compose

## Public frontend environment

These values are safe for frontend/runtime setup:

```env
NEXT_PUBLIC_SUPABASE_URL=<provided privately>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<provided privately>
NEXT_PUBLIC_FASTAPI_URL=http://backend:8000
NEXT_PUBLIC_APP_URL=https://plantdetec.duckdns.org
```

## Private backend environment

Do not commit the real service-role key to GitHub. Provide it to the examiner through a private channel if they need to run backend features that require admin Supabase access.

```env
SUPABASE_SERVICE_ROLE_KEY=<provided privately>
```

## VPS commands

```bash
cd ~/Machine-Learning
git pull origin main
docker-compose up -d --build
docker-compose ps
docker-compose exec frontend wget -qO- http://localhost:3000/api/health
docker-compose logs --tail=120 frontend
docker-compose logs --tail=120 backend
```

Expected health output:

```json
{"status":"ok"}
```
