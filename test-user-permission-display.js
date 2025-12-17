// 测试用户权限显示逻辑
function getUserLevelColor(level) {
  const numLevel = Number(level);
  return numLevel <= 2 ? '#52c41a' :  // 绿色
         numLevel === 3 ? '#faad14' : // 橙色
         numLevel === 4 ? '#f5222d' : // 红色
         numLevel >= 5 ? '#722ed1' : // 紫色
         '#666'; // 默认灰色
}

function getUserLevelDisplay(level) {
  return `等级${Number(level)}`;
}

// 测试不同权限等级的显示
console.log('用户权限显示测试:');
[1, 2, 3, 4, 5, 9].forEach(level => {
  console.log(`权限等级 ${level}: 颜色=${getUserLevelColor(level)}, 显示=${getUserLevelDisplay(level)}`);
});