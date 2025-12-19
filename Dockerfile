FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 先拷贝依赖文件（利用缓存）
COPY package*.json ./

# 安装依赖
RUN npm install

# 拷贝项目全部代码
COPY . .

# 构建 Next 应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动 Next 应用
CMD ["npm", "run", "start"]


