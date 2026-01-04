# ---------- build ----------
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # 复制依赖文件
    COPY package.json package-lock.json* ./
    
    # 安装依赖（使用缓存加速）
# 安装依赖，使用 prefer-offline 加速，跳过安全审计
RUN npm install --prefer-offline --no-audit
    
    # 复制源代码并构建应用
    COPY . .
    RUN npm run build
    
    # ---------- runtime ----------
    FROM node:20-alpine
    
    WORKDIR /app
    ENV NODE_ENV=production
    
    # 从构建阶段复制文件
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package.json ./package.json
    COPY --from=builder /app/next.config.* ./
    
    # 创建上传目录并设置权限
    RUN mkdir -p /app/public/uploads && \
        chown -R node:node /app && \
        chmod -R 755 /app/public/uploads
    
    # 使用 node 用户运行
    USER node
    
    EXPOSE 3000
    CMD ["npm", "run", "start"]
    