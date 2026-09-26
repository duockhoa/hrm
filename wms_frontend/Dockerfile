FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json ./
RUN npm install

FROM dependencies AS build

WORKDIR /app
ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ARG NEXT_PUBLIC_ALL_APPLICATIONS_URL
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN \
    NEXT_PUBLIC_ALL_APPLICATIONS_URL=$NEXT_PUBLIC_ALL_APPLICATIONS_URL
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
