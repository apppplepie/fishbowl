/**
 * 文字格式化工具函数
 * 专门用于中文写作的排版需求
 */

/**
 * 首行缩进 - 给每个自然段开头加两个全角空格
 */
export function addIndent(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      return trimmed ? '　　' + trimmed : line;
    })
    .join('\n');
}

/**
 * 去除空行 - 删除所有空行（包括只有空格的行）
 */
export function removeEmptyLines(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n');
}

/**
 * 统一换行 - 规范段落间距（段落间保持单空行，多个空行合并为一个）
 */
export function normalizeBreaks(text: string): string {
  // 先把所有行trim
  const lines = text.split('\n').map(line => line.trim());
  const result: string[] = [];
  let prevEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line) {
      // 非空行直接添加
      result.push(line);
      prevEmpty = false;
    } else {
      // 空行：如果前一行不是空行，且后面还有内容，则添加一个空行
      if (!prevEmpty && i < lines.length - 1 && lines.slice(i + 1).some(l => l)) {
        result.push('');
        prevEmpty = true;
      }
    }
  }

  // 去除开头和结尾的空行
  while (result.length > 0 && result[0] === '') {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return result.join('\n');
}

/**
 * 清理空格 - 删除多余的空格（保留必要的空格）
 */
export function cleanSpaces(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // 清理行首行尾空格
      let cleaned = line.trim();
      // 清理多个连续空格为单个空格
      cleaned = cleaned.replace(/ {2,}/g, ' ');
      // 中文字符间的空格可以选择性删除
      // cleaned = cleaned.replace(/([^\x00-\xff])\s+([^\x00-\xff])/g, '$1$2');
      return cleaned;
    })
    .join('\n');
}

/**
 * 统一标点为全角（中文标点）
 */
export function unifyPunctuation(text: string): string {
  let result = text;
  
  // 替换常用标点为中文全角
  const punctuationMap: Record<string, string> = {
    ',': '，',
    '.': '。',
    ';': '；',
    ':': '：',
    '?': '？',
    '!': '！',
    '(': '（',
    ')': '）',
  };

  for (const [half, full] of Object.entries(punctuationMap)) {
    result = result.replace(new RegExp('\\' + half, 'g'), full);
  }

  return result;
}

/**
 * 一键中文排版 - 应用所有中文排版规则
 */
export function chineseFormat(text: string): string {
  let result = text;
  
  // 1. 统一标点为全角
  result = unifyPunctuation(result);
  
  // 2. 清理多余空格
  result = cleanSpaces(result);
  
  // 3. 统一换行
  result = normalizeBreaks(result);
  
  // 4. 去除连续空行
  result = removeEmptyLines(result);
  
  // 5. 首行缩进
  result = addIndent(result);
  
  return result;
}

/**
 * 移除首行缩进 - 去掉段首的全角空格
 */
export function removeIndent(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^[　\s]+/, ''))
    .join('\n');
}

/**
 * 查找替换
 */
export function findReplace(text: string, findText: string, replaceText: string): string {
  if (!findText) return text;
  
  // 全局替换
  const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return text.replace(regex, replaceText);
}

/**
 * 格式化选项类型
 */
export type FormatOption = 
  | 'indent'           // 首行缩进
  | 'removeEmpty'      // 去除空行
  | 'normalizeBreaks'  // 统一换行
  | 'cleanSpaces'      // 清理空格
  | 'chinese'          // 一键中文排版
  | 'removeIndent';    // 移除缩进

/**
 * 应用格式化
 */
export function applyFormat(text: string, option: FormatOption): string {
  switch (option) {
    case 'indent':
      return addIndent(text);
    case 'removeEmpty':
      return removeEmptyLines(text);
    case 'normalizeBreaks':
      return normalizeBreaks(text);
    case 'cleanSpaces':
      return cleanSpaces(text);
    case 'chinese':
      return chineseFormat(text);
    case 'removeIndent':
      return removeIndent(text);
    default:
      return text;
  }
}

