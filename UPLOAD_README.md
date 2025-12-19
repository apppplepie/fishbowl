# 文件上传功能说明

## 📁 文件存储结构

```
public/
  └── uploads/          # 媒体文件存储文件夹
      ├── .gitignore    # Git 忽略配置
      ├── .gitkeep      # 确保文件夹被追踪
      └── [上传的图片文件]
```

## 🚀 上传 API

### 接口地址
`POST /api/upload`

### 请求格式
- Content-Type: `multipart/form-data`
- 字段: `file` (文件对象)

### 支持的文件类型
- JPEG / JPG
- PNG
- GIF
- WebP

### 文件大小限制
- 最大 5MB

### 响应格式

**成功响应 (200):**
```json
{
  "success": true,
  "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
  "filename": "550e8400-e29b-41d4-a716-446655440000.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

**失败响应 (400/500):**
```json
{
  "error": "错误信息"
}
```

## 📝 使用方法

### 1. 在发布文章页面上传图片

1. 访问 `/publish-article`
2. 点击"添加新块" → 选择"图片块"
3. 可以选择两种方式：
   - **方式一**：输入图片 URL
   - **方式二**：点击上传按钮，选择本地图片
4. 点击确定，图片会自动上传到服务器

### 2. 图片存储和访问

- 上传的图片保存在 `public/uploads/` 文件夹
- 文件名使用 UUID 生成，避免冲突
- 访问 URL: `http://localhost:3000/uploads/[filename]`

### 3. 在代码中使用上传 API

```typescript
// 上传图片示例
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('图片URL:', result.url);
    // 使用 result.url 在页面上显示图片
  }
};
```

## 🔒 安全措施

1. **文件类型限制**: 只允许图片格式
2. **文件大小限制**: 最大 5MB
3. **文件名随机化**: 使用 UUID 避免文件名冲突和猜测
4. **Git 忽略**: 上传的文件不会被提交到 Git 仓库

## ⚠️ 注意事项

### 生产环境建议

在生产环境中，建议：

1. **使用云存储服务**
   - 阿里云 OSS
   - 腾讯云 COS
   - AWS S3
   - 七牛云

2. **添加图片处理**
   - 自动压缩
   - 生成缩略图
   - 添加水印

3. **增强安全性**
   - 添加用户认证
   - 限制上传频率
   - 病毒扫描

4. **性能优化**
   - CDN 加速
   - 图片格式转换（WebP）
   - 懒加载

### 本地开发

- uploads 文件夹已在 Git 中忽略（除了 .gitkeep）
- 如果部署时 uploads 文件夹丢失，会自动创建
- 本地测试上传功能时，文件会保存在 `public/uploads/`

## 🛠️ 配置修改

如需修改上传配置，编辑 `app/api/upload/route.ts`:

```typescript
// 修改文件大小限制
const maxSize = 10 * 1024 * 1024; // 改为 10MB

// 添加更多文件类型
const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml', // 添加 SVG
];

// 修改保存路径
const filepath = join(process.cwd(), 'public', 'uploads', 'images', filename);
```

## 📊 文件管理

### 查看已上传的文件

直接查看 `public/uploads/` 文件夹

### 删除文件

目前暂不支持通过 API 删除文件，需要手动删除：
1. 导航到 `public/uploads/` 文件夹
2. 删除对应的图片文件

### 清理空间

定期清理不再使用的图片文件，可以编写脚本：
```bash
# 查找 30 天前的文件并删除
find public/uploads -type f -mtime +30 -delete
```

## 🎯 下一步功能

未来可以添加的功能：
- [ ] 图片裁剪和编辑
- [ ] 视频上传支持
- [ ] 文件管理界面
- [ ] 批量上传
- [ ] 拖拽上传
- [ ] 上传进度显示
- [ ] 云存储集成

