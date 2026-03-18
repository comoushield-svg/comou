FROM node:20-alpine

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
COPY packages/comou-safe-detector/package.json ./packages/comou-safe-detector/

RUN npm install

COPY . .

RUN nest build && ls -la dist/

EXPOSE 3000

CMD ["node", "dist/main"]
