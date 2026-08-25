FROM node:24-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS migrator

COPY prisma ./prisma

FROM dependencies AS build

COPY . .
# Prisma loads prisma.config.ts while generating the client. This placeholder is
# only used at image-build time; Compose supplies the real database URL at run time.
ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder
RUN npx prisma generate && npm run build

FROM base AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir uploads && chown -R node:node /app

USER node
EXPOSE 3012 50000
CMD ["node", "dist/src/main"]
