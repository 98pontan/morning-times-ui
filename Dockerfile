# --- build ---
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
RUN npm run build

# --- serve ---
# Unprivileged nginx: runs as uid 101 and listens on 8080
FROM docker.io/nginxinc/nginx-unprivileged:1.27-alpine
ENV BACKEND_URL=http://morning-times:80
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
