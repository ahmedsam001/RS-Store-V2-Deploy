FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npm run db:generate -w @rs-store/api
RUN npm run build -w @rs-store/api

FROM node:22-alpine AS runner
USER root
RUN apk add --no-cache chromium
ENV SHEIN_BROWSER_PATH=/usr/bin/chromium-browser
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
RUN npm prune --omit=dev
USER node
EXPOSE 3000
CMD ["npm", "run", "start:prod", "-w", "@rs-store/api"]
