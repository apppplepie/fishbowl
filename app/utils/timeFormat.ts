/**
 * 时间格式化工具
 * 显示相对时间（刚刚、X分钟前、X小时前、X天前）
 */

/**
 * 格式化相对时间
 * @param dateString - 日期字符串（ISO 格式或普通日期字符串）
 * @returns 格式化后的时间字符串
 */
export function formatRelativeTime(dateString: string | Date | undefined | null): string {
  if (!dateString) {
    return '未知时间';
  }

  const now = new Date();
  const date = new Date(dateString);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('Invalid date string:', dateString);
    return '未知时间';
  }
  
  // 计算时间差（毫秒）
  const diffMs = now.getTime() - date.getTime();
  
  // 转换为各个时间单位
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 1分钟以内
  if (diffMinutes < 1) {
    return '刚刚';
  }
  
  // 1小时以内
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  
  // 1天以内
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  
  // 3天以内
  if (diffDays <= 3) {
    return `${diffDays}天前`;
  }
  
  // 超过3天，显示具体日期（年-月-日 时:分）
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 简化版：只显示到分钟
 */
export function formatTimeToMinute(dateString: string | Date | undefined | null): string {
  if (!dateString) {
    return '未知时间';
  }

  const date = new Date(dateString);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('Invalid date string:', dateString);
    return '未知时间';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

