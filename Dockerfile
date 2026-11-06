# Stage 1 — Build the Vite web app
FROM node:26-alpine AS builder
WORKDIR /build
RUN npm install -g pnpm@12
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts components.json index.html ./
COPY src/ src/
COPY public/ public/
RUN pnpm build

# Stage 2 — Node server (runs the TypeScript sources directly)
FROM node:26-alpine
WORKDIR /app
RUN npm install -g pnpm@12
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --prod --filter dante-server \
  && npm uninstall -g pnpm
COPY server/src/ server/src/
COPY --from=builder /build/dist ./dist

RUN mkdir data && chown node:node data
VOLUME /app/data

# Paths inside the image. PORT (default 3000) and the model settings come from
# the environment at runtime.
ENV DANTE_STATIC_DIR=/app/dist \
  DANTE_DB_PATH=/app/data/dante.db
EXPOSE 3000
USER node
CMD ["node", "server/src/index.ts"]
