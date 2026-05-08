FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DB_PATH=/data/pulseops.db

COPY package*.json ./

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && npm_config_build_from_source=true npm install --omit=dev \
  && npm rebuild better-sqlite3 --build-from-source \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /data

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
