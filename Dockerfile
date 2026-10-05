FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:web \
  && pnpm prune --prod

FROM base AS runtime
ARG CLAUDE_CODE_VERSION=2.1.289
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
  && npm cache clean --force
ENV NODE_ENV=production \
  CLAUDE_CONFIG_DIR=/data/claude \
  TZ=America/Sao_Paulo \
  PORT=3000 \
  DATABASE_PATH=/data/baixa.db \
  WEB_ROOT=/app/dist/web
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/web ./dist/web
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN mkdir /data && chown node:node /data
VOLUME /data
EXPOSE 3000
USER node
CMD ["node_modules/.bin/tsx", "src/server/index.ts"]
