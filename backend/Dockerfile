FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund
COPY . .
RUN test -f prisma/migrations/20260724061000_initial/migration.sql
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN test -f prisma/migrations/20260724061000_initial/migration.sql
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
RUN mkdir -p /data/uploads
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
