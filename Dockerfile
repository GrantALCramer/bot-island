# Bot Island server image. Data (events, chat, access key, config) lives in /data (mount a volume).
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx vite build && npm prune --omit=dev

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.js cli.mjs AGENT_REPORTING.md report.sh report-git.sh island-report.sh reply.sh reply-git.sh register.sh ./
COPY lib ./lib
ENV BOTISLAND_HOME=/data BOTISLAND_REMOTE=1 BOTISLAND_REMOTE_PORT=8797 BOTISLAND_REMOTE_BIND=0.0.0.0 BOTISLAND_OPEN=0 BOTISLAND_INSTALL=docker
VOLUME /data
EXPOSE 8797
USER node
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","server.js"]
