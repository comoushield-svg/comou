FROM node:20-alpine

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
COPY packages/comou-safe-detector/package.json ./packages/comou-safe-detector/

RUN npm install

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN nest build && echo "=== BUILD SUCCESS ===" && ls -la /app/dist/

COPY . .

EXPOSE 3000

CMD ["node", "dist/main"]
