# ---------- build stage ----------
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # 1. 只拷依赖清单，最大化缓存命中
    COPY package.json package-lock.json* ./
    
    # 2. 安装依赖（稳定、可复现）
    RUN npm ci --prefer-offline --no-audit
    
    # 3. 拷贝源码
    COPY . .
    
    # 4. 构建 Next.js
    RUN npm run build
    
    
    # ---------- runtime stage ----------
    FROM node:20-alpine
    
    WORKDIR /app
    ENV NODE_ENV=production
    
    # 5. 拷贝运行时必需文件
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/package.json ./package.json
    COPY --from=builder /app/next.config.* ./
    
    # 6. 使用非 root 用户（你之前就这么做，没问题）
    USER node
    
    EXPOSE 3000
    
    # 7. 使用 Next 官方启动方式（最稳）
    CMD ["npm", "run", "start"]
    