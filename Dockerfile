# Stage 1 — Build the Vite frontend
FROM node:22-alpine AS builder
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY shared/ shared/
COPY src/ src/
COPY public/ public/
RUN pnpm build

# Stage 2 — Deno runtime
FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY server/ ./server/
COPY shared/ ./shared/
ENV PORT=8001
EXPOSE 8001
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-ffi", "--allow-sys", "server/main.ts"]
