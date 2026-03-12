# syntax=docker/dockerfile:1

FROM node:25-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:25-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:25-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/uploads/artworks /app/uploads/blog-covers
RUN addgroup --system appgroup && adduser --system --home /home/appuser --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
