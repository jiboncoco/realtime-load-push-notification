# Backend (Bun + Hono). Build context: ./backend
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
# Jalankan migrasi (idempoten) lalu serve. DATABASE_URL dll dari env compose.
CMD ["sh", "-c", "bun run migrate && bun run start"]
