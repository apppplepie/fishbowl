/**
 * 章节编号工具函数
 * 用于给书籍分类树添加章节号
 */

export interface NumberableNode {
  id: string;
  name: string;
  depth?: number;
  order_index: number;
  node_type?: 'category' | 'article';
  parent_id?: string | null;
  children?: NumberableNode[];
}

interface ChapterCounter {
  [depth: number]: number;
}

/**
 * 获取章节号文字（卷、章、节）
 */
export function getChapterLabel(depth: number, counter: number): string {
  if (depth === 4) {
    return `第${counter}卷`;
  } else if (depth === 5) {
    return `第${counter}章`;
  } else if (depth >= 6) {
    return `第${counter}节`;
  }
  return '';
}

/**
 * 为树节点添加章节号
 * @param nodes 树节点数组
 * @param parentDepth 父节点深度（用于递归）
 * @param parentCounter 父层级的计数器状态（用于递归）
 * @returns 带有章节号的节点数组（在原对象上添加 chapterLabel 和 articleNumber 字段）
 */
export function addChapterNumbers<T extends NumberableNode>(
  nodes: T[],
  parentDepth: number = 0,
  parentCounter: ChapterCounter = {}
): T[] {
  const counter = { ...parentCounter };

  nodes.forEach((node) => {
    const depth = node.depth || parentDepth + 1;

    // 只给目录（category）或depth>=3的节点编号
    if (node.node_type === 'category' || !node.node_type) {
      // 初始化当前深度的计数器
      if (counter[depth] === undefined) {
        counter[depth] = 0;
      }

      // 重置所有更深层级的计数器
      for (let d = depth + 1; d <= 10; d++) {
        counter[d] = 0;
      }

      // 增加当前深度的计数
      counter[depth]++;

      // 只给 depth >= 3 的目录添加章节号（卷、章、节）
      if (depth >= 3) {
        (node as any).chapterLabel = getChapterLabel(depth, counter[depth]);
      }
    } else if (node.node_type === 'article') {
      // 文章：使用其 order_index 作为序号
      // 在当前父级分类下的序号
      (node as any).articleNumber = node.order_index;
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      addChapterNumbers(node.children, depth, counter);
    }
  });

  return nodes;
}

/**
 * 为扁平的节点列表添加章节号
 * 适用于已经排序好的扁平结构
 * @param flatNodes 扁平的节点列表（需要已按path或order排序）
 */
export function addChapterNumbersToFlatList<T extends NumberableNode>(
  flatNodes: T[]
): T[] {
  const counter: ChapterCounter = {};

  flatNodes.forEach((node) => {
    const depth = node.depth || 1;

    if (node.node_type === 'category' || !node.node_type) {
      // 目录节点
      if (counter[depth] === undefined) {
        counter[depth] = 0;
      }

      // 重置所有更深层级的计数器
      for (let d = depth + 1; d <= 10; d++) {
        counter[d] = 0;
      }

      counter[depth]++;

      // 只给 depth >= 3 的目录添加章节号
      if (depth >= 3) {
        (node as any).chapterLabel = getChapterLabel(depth, counter[depth]);
      }
    } else if (node.node_type === 'article') {
      // 文章节点：使用 order_index
      (node as any).articleNumber = node.order_index;
    }
  });

  return flatNodes;
}

/**
 * 格式化节点显示文本
 * @param node 节点
 * @param options 格式化选项
 */
export function formatNodeLabel(
  node: NumberableNode & { chapterLabel?: string; articleNumber?: number },
  options: {
    showChapterLabel?: boolean;  // 显示章节号（卷、章、节）
    showArticleNumber?: boolean; // 显示文章序号
  } = {}
): string {
  const { showChapterLabel = true, showArticleNumber = true } = options;

  let label = '';

  // 目录：显示章节号
  if ((node as any).chapterLabel && showChapterLabel) {
    label = `${(node as any).chapterLabel} `;
  }

  // 文章：显示序号
  if (
    node.node_type === 'article' &&
    (node as any).articleNumber !== undefined &&
    showArticleNumber
  ) {
    label = `${(node as any).articleNumber}. `;
  }

  label += node.name;

  return label;
}

