FROM node:20-alpine

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
COPY packages/comou-safe-detector/package.json ./packages/comou-safe-detector/

RUN npm install

# Copy all source files - any change here busts nest build cache
COPY . .

# Remove any stale tsbuildinfo cache, then compile fresh
RUN rm -f tsconfig.build.tsbuildinfo && nest build && echo "=== BUILD OK ===" && ls dist/

EXPOSE 3000

CMD ["node", "dist/main"]
