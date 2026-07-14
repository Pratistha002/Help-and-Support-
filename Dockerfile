# ── Stage 1: install dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: build Next.js (standalone output) ───────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Client-visible URLs must be set at build time (Next.js inlines NEXT_PUBLIC_*).
ARG NEXT_PUBLIC_SUPPORT_EMAIL=Saarthiworkforce@gmail.com
ARG NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY=+1 878 732 2485
ARG NEXT_PUBLIC_SUPPORT_PHONE_E164=+18787322485
ARG NEXT_PUBLIC_WORKFORCE_APP_URL=https://saarthix.com
ARG NEXT_PUBLIC_SAARTHIX_URL=https://saarthix.com
ARG NEXT_PUBLIC_INTERVIEWX_ORIGIN=
ARG NEXT_PUBLIC_HELP_SUPPORT_URL=

ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY=$NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY
ENV NEXT_PUBLIC_SUPPORT_PHONE_E164=$NEXT_PUBLIC_SUPPORT_PHONE_E164
ENV NEXT_PUBLIC_WORKFORCE_APP_URL=$NEXT_PUBLIC_WORKFORCE_APP_URL
ENV NEXT_PUBLIC_SAARTHIX_URL=$NEXT_PUBLIC_SAARTHIX_URL
ENV NEXT_PUBLIC_INTERVIEWX_ORIGIN=$NEXT_PUBLIC_INTERVIEWX_ORIGIN
ENV NEXT_PUBLIC_HELP_SUPPORT_URL=$NEXT_PUBLIC_HELP_SUPPORT_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: production runtime ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/data ./data

USER nextjs
EXPOSE 3003

CMD ["node", "server.js"]
