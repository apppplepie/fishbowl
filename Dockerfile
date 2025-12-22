# ---------- build ----------
    FROM node:20-alpine AS builder

    WORKDIR /app

    COPY package.json package-lock.json* ./

    # 关键在这里 👇
    RUN npm install --legacy-peer-deps --force

    COPY . .

    RUN npm run build

    # ---------- runtime ----------
    FROM node:20-alpine

    WORKDIR /app
    ENV NODE_ENV=production

    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package.json ./package.json
    COPY --from=builder /app/next.config.* ./

# 创建 uploads 目录并设置权限
RUN mkdir -p /app/public/uploads && \
    chown -R node:node /app && \
    chmod -R 755 /app/public/uploads

# 使用 node 用户运行（避免权限问题）
USER node

    EXPOSE 3000
    CMD ["npm", "run", "start"]
