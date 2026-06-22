FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "bun mikro-orm migration:up && bun run src/main.ts"]
