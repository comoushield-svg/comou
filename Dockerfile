FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/comou-safe-detector/package.json ./packages/comou-safe-detector/

RUN npm install --cache .npm-cache

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
