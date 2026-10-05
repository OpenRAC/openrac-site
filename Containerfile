# OpenRAC website. Build:  podman build -t localhost/openrac:latest .
#
# Node 24 is the active LTS line. To move to a newer one, change NODE_VERSION here (or pass
# --build-arg NODE_VERSION=…); every stage follows it.
ARG NODE_VERSION=24

FROM docker.io/library/node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies on their own layer: rebuilt only when package*.json change.
FROM base AS deps
COPY package.json package-lock.json ./
# The npm cache is kept between builds (not in the image), so reinstalling is quick.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS run
LABEL org.opencontainers.image.title="OpenRAC website" \
      org.opencontainers.image.description="Progress hub for the community decompilations of the Ratchet & Clank series" \
      org.opencontainers.image.url="https://openrac.dev" \
      org.opencontainers.image.source="https://github.com/OpenRAC/openrac-site" \
      org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    IMAGE_DIR=/data/img
# The standalone server needs only node itself: drop npm, npx, corepack and yarn from the
# final image (smaller, and fewer packages for scanners to flag).
# `.next/cache` holds the server-side page cache, so it must stay writable
# (the Quadlet unit mounts a volume there and runs the rest read-only).
# `/data/img` is where the card backdrops are read from; mount a folder there (see deploy/openrac.container).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
 && mkdir -p .next/cache /data/img \
 && chown -R node:node /app /data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Next.js handles SIGTERM itself, so `podman stop` shuts the server down cleanly.
CMD ["node", "server.js"]
