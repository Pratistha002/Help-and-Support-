# Production deploy — SaarthiWorkforce Help & Support

Same Docker image you run locally, configured for a public host.

## Quick start (Linux / VPS)

```bash
cd Help-and-Support-
cp .env.production.example .env
# Edit .env: JWT_SECRET, MONGODB_URI, APP_FRONTEND_URL, SUPPORT_WEBHOOK_BASE_URL,
# NEXT_PUBLIC_WORKFORCE_APP_URL, Brevo + Twilio keys
chmod +x scripts/deploy-production.sh scripts/verify-production.sh
./scripts/deploy-production.sh
```

Full rebuild (no cache):

```bash
FULL_REBUILD=1 ./scripts/deploy-production.sh
```

## Quick start (Windows)

```powershell
cd Help-and-Support-
Copy-Item .env.production.example .env
# Edit .env with production values
.\scripts\deploy-production.ps1
# Optional: .\scripts\deploy-production.ps1 -FullRebuild
```

## What the script does

1. Checks Docker + `.env` (refuses placeholder JWT / missing Mongo URI)
2. Ensures Docker network `somethingx_saarthix-network` exists
3. Builds with `docker-compose.yml` + `docker-compose.prod.yml` (bakes `NEXT_PUBLIC_*` at build time)
4. Starts `help-support-web` and waits for health
5. Smoke-checks `/` and `/admin/`

## npm shortcuts

```bash
npm run deploy:prod        # bash deploy
npm run deploy:prod:win    # PowerShell deploy
npm run docker:prod        # compose up only
npm run verify:prod        # SITE_URL=https://... npm run verify:prod
```

## Reverse proxy

Point your nginx/Caddy host to `127.0.0.1:3003` (or `HELP_SUPPORT_HOST_PORT`).  
Set `APP_FRONTEND_URL` and `SUPPORT_WEBHOOK_BASE_URL` to that public HTTPS origin so Twilio webhooks and CORS match production.
