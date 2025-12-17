// 简单测试权限逻辑
function checkAccess(userAccessLevel, blockAccessLevel) {
  return userAccessLevel >= blockAccessLevel;
}

console.log('测试权限逻辑:');
console.log('游客(max_access_level=2)访问等级1内容:', checkAccess(2, 1)); // true
console.log('游客(max_access_level=2)访问等级2内容:', checkAccess(2, 2)); // true
console.log('游客(max_access_level=2)访问等级3内容:', checkAccess(2, 3)); // false
console.log('会员(max_access_level=3)访问等级3内容:', checkAccess(3, 3)); // true
console.log('管理员(max_access_level=5)访问等级4内容:', checkAccess(5, 4)); // true

// 测试占位块结构
const placeholderBlock = {
  id: 'block-1',
  type: 'placeholder',
  order: 0,
  original_type: 'image',
  required_access_level: 3,
  user_access_level: 2,
  message: '需要等级3及以上权限才能查看此内容'
};

console.log('\n占位块示例:');
console.log(JSON.stringify(placeholderBlock, null, 2));