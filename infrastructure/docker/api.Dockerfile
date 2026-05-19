# FleetOS API — production image (includes Chromium for settlement PDFs)
FROM node:20-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @fleetos/shared-types build \
  && pnpm --filter @fleetos/api exec prisma generate \
  && pnpm --filter @fleetos/api build

FROM node:20-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates chromium \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY infrastructure/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/apps/api/uploads/settlements /app/apps/api/uploads/logos /app/apps/api/uploads/documents

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
