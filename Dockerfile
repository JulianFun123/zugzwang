# Build Vite app
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm


COPY . .
RUN pnpm ci
RUN pnpm run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/packages/app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY config/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]