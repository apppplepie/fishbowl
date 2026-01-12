# 花园基准线系统设计文档

## 📋 概述

基准线系统用于在花园画布上定义一条隐形的横线，所有植物都从这条基准线开始向上生长。系统支持全局配置，只有登录用户（user、moderator、admin）可以修改配置。

## 🗄️ 数据库设计

### garden_baseline_config 表

```sql
CREATE TABLE garden_baseline_config (
  id VARCHAR(36) PRIMARY KEY,
  baseline_y_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.6,  -- 基准线相对高度（0-1）
  updated_by VARCHAR(36) NOT NULL,                      -- 最后更新者
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**字段说明：**
- `baseline_y_ratio`: 基准线在画布中的相对位置（0-1），默认 0.6（60%高度处）
- `updated_by`: 最后更新者的用户ID
- `updated_at`: 最后更新时间

**特点：**
- 全局单一配置（只存储一条记录）
- 默认值：0.6（画布高度的60%）

## 🔌 API 设计

### GET /api/garden/baseline

**功能：** 获取基准线配置（公开接口）

**请求：** 无需参数

**响应：**
```json
{
  "success": true,
  "baseline": {
    "baseline_y_ratio": 0.6,
    "updated_at": "2024-12-10T10:00:00Z"
  }
}
```

**说明：**
- 如果数据库中没有配置，返回默认值 0.6
- 无需登录，公开访问

### POST /api/garden/baseline

**功能：** 保存基准线配置（需要登录）

**权限要求：**
- 必须登录
- 用户角色：user、moderator、admin 都可以
- 用户状态必须为 active

**请求体：**
```json
{
  "baseline_y_ratio": 0.6
}
```

**响应：**
```json
{
  "success": true,
  "message": "基准线配置已更新",
  "baseline": {
    "baseline_y_ratio": 0.6,
    "updated_at": "2024-12-10T10:00:00Z"
  }
}
```

**错误响应：**
- 401: 未登录
- 403: 账号状态异常
- 400: baseline_y_ratio 必须是 0-1 之间的数字
- 500: 服务器错误

## 🎨 前端组件设计

### GardenCanvas 组件增强

**新增功能：**
1. 从 API 读取基准线配置
2. 计算基准线位置：`baseline_y = FIXED_HEIGHT * baseline_y_ratio`
3. 可选：在画布上显示基准线（半透明横线）

**实现方式：**

#### 1. 添加状态和配置读取

```typescript
const [baselineYRatio, setBaselineYRatio] = useState(0.6); // 默认值

useEffect(() => {
  // 读取基准线配置
  fetch('/api/garden/baseline')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setBaselineYRatio(data.baseline.baseline_y_ratio);
      }
    })
    .catch(err => console.error('读取基准线配置失败:', err));
}, []);
```

#### 2. 计算基准线位置

```typescript
const baselineY = FIXED_HEIGHT * baselineYRatio;
```

#### 3. 显示基准线（可选）

在画布上添加一个 div 来显示基准线：

```tsx
{/* 基准线可视化（可选） */}
{showBaseline && (
  <div
    className="absolute left-0 right-0 pointer-events-none"
    style={{
      top: `${baselineY}px`,
      height: '1px',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      zIndex: 5,
    }}
  />
)}
```

**Props 扩展：**
- `showBaseline?: boolean` - 是否显示基准线（默认 false，开发/调试时可用）

## 📐 使用场景

### 1. 种植植物时

```typescript
// 计算相对位置
const position_x_ratio = click_x / container_width;
const position_y_offset = baseline_y - click_y; // 负数表示在基准线上方

// 保存到数据库
await savePlant({
  position_x_ratio,
  position_y_offset,
  dna_json: JSON.stringify(plantSettings)
});
```

### 2. 加载植物时

```typescript
// 从数据库读取
const plant = await getPlant(plantId);

// 计算实际坐标
const current_width = containerRef.current.offsetWidth;
const baseline_y = FIXED_HEIGHT * baselineYRatio;
const x = current_width * plant.position_x_ratio;
const y = baseline_y + plant.position_y_offset;

// 重现植物
spawnPlant(x, y, JSON.parse(plant.dna_json));
```

## 🚀 部署步骤

### 1. 创建数据库表

```bash
npx ts-node --project tsconfig.node.json scripts/create-garden-baseline-config-table.ts
```

或直接执行 SQL：

```bash
mysql -u root -p test < scripts/create-garden-baseline-config-table.sql
```

### 2. 验证 API

```bash
# 读取配置
curl http://localhost:3000/api/garden/baseline

# 保存配置（需要登录，先获取 token）
curl -X POST http://localhost:3000/api/garden/baseline \
  -H "Content-Type: application/json" \
  -H "Cookie: access-token=YOUR_TOKEN" \
  -d '{"baseline_y_ratio": 0.65}'
```

### 3. 前端集成

在 `GardenCanvas.tsx` 中添加基准线读取和显示逻辑。

## 🔒 权限说明

- **读取配置**：公开，无需登录
- **保存配置**：需要登录，且用户状态为 active
- **角色要求**：user、moderator、admin 都可以保存配置
- **验证流程**：
  1. 检查 JWT token
  2. 验证用户存在
  3. 验证用户状态为 active
  4. 验证参数合法性

## 📝 注意事项

1. **全局单一配置**：系统只维护一个全局基准线配置，所有页面共享
2. **默认值**：如果数据库中没有配置，使用默认值 0.6
3. **响应式适配**：基准线使用相对高度（ratio），自动适配不同屏幕
4. **向后兼容**：如果 API 调用失败，使用默认值 0.6，不影响现有功能

## 🎯 未来扩展

1. **按页面配置**：可以为不同页面设置不同的基准线
2. **用户自定义**：允许每个用户设置自己的基准线偏好
3. **基准线拖动**：在画布上直接拖动基准线调整位置
4. **基准线预设**：提供几个常用位置（顶部、中部、底部）的快捷选择

