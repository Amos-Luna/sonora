FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json ./
RUN pnpm install

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
