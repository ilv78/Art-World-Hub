# syntax=docker/dockerfile:1

FROM node:25-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
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
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
# fontconfig is required for sharp's SVG-text rendering (librsvg uses it to
# resolve font-family -> file). Bundled brand fonts (Playfair Display, Inter)
# are installed system-wide so OG card composition produces brand-correct text.
# Version pin skipped intentionally: fontconfig is a build-time helper for
# fc-cache; pinning would just break on Debian package shifts across base-
# image bumps without any safety benefit. The directive line below must
# stay clean (no trailing prose) for hadolint to recognise it.
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig \
    && rm -rf /var/lib/apt/lists/*
COPY assets/fonts/PlayfairDisplay-Bold.ttf assets/fonts/Inter-Regular.ttf /usr/share/fonts/truetype/vernis9/
RUN fc-cache -f
COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/CHANGELOG.md ./
COPY --from=build /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p /app/uploads/artworks /app/uploads/blog-covers /app/uploads/avatars /app/uploads/og-cards /app/logs
RUN addgroup --system appgroup && adduser --system --home /home/appuser --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser
EXPOSE 5000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.cjs"]
