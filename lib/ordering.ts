/**
 * 分类 / 文章共享排序逻辑（单一来源）
 *
 * categories 与 articles 在同一个父节点下共享同一段 order_index 整数序列，
 * 任何重排都要同时位移这两张表。以下三个函数被
 *   - app/api/tree/reorder/route.ts（事务）
 *   - app/api/categories/[id]/move/route.ts
 *   - app/api/articles/[id]/route.ts (PUT)
 * 复用，避免同一套算法多份实现各自漂移。
 *
 * 每个函数都接受一个可选的 exec 执行器：默认走 lib/db 的 autocommit `query`；
 * 在事务中调用时传入基于 connection.execute 的执行器即可（见 tree/reorder）。
 */
import { query } from '@/lib/db';

/** SQL 执行器：返回行数组。默认实现为 autocommit 的 query。 */
export type SqlExecutor = (sql: string, params?: any[]) => Promise<any>;

interface CategoryRow {
  id: string;
  depth: number;
  path: string;
  order_index: number;
}

/**
 * 递归更新节点及其所有子节点的 depth 和 path。
 * path 由各级 order_index 补零拼接而成，所以父节点位置变化要递归刷新子树。
 */
export async function updateNodeAndChildren(
  nodeId: string,
  newParentId: string | null,
  newOrderIndex: number,
  exec: SqlExecutor = query
): Promise<void> {
  let parentDepth = 0;
  let parentPath = '';

  if (newParentId) {
    const parent: CategoryRow[] = await exec(
      'SELECT depth, path FROM categories WHERE id = ?',
      [newParentId]
    );
    if (parent.length === 0) {
      throw new Error('父分类不存在');
    }
    parentDepth = parent[0].depth;
    parentPath = parent[0].path;
  }

  const newDepth = parentDepth + 1;
  const newPath = parentPath
    ? `${parentPath}-${String(newOrderIndex).padStart(6, '0')}`
    : String(newOrderIndex).padStart(6, '0');

  await exec(
    `UPDATE categories
     SET parent_id = ?, order_index = ?, depth = ?, path = ?
     WHERE id = ?`,
    [newParentId, newOrderIndex, newDepth, newPath, nodeId]
  );

  const children: CategoryRow[] = await exec(
    'SELECT id, order_index FROM categories WHERE parent_id = ? ORDER BY order_index',
    [nodeId]
  );

  for (const child of children) {
    await updateNodeAndChildren(child.id, nodeId, child.order_index, exec);
  }
}

/**
 * 同级重排：把兄弟节点（分类 + 文章共享同一序列）在受影响区间内整体平移 ±1，
 * 为被移动项让出 / 补上原来的位置。movedIsCategory 决定从哪张表排除被移动项自身
 * （它的最终位置由调用方单独写入）。
 *
 * - 向后移动 (old < new)：区间 (old, new] 内的项 -1
 * - 向前移动 (old > new)：区间 [new, old) 内的项 +1
 *
 * 仅排序不应改动文章的 updated_at，因此 articles 更新统一带 `updated_at = updated_at`。
 */
export async function shiftSiblings(
  parentId: string | null,
  oldPosition: number,
  newPosition: number,
  movedIsCategory: boolean,
  movedItemId: string,
  exec: SqlExecutor = query
): Promise<void> {
  if (oldPosition === newPosition) return;

  const movingDown = oldPosition < newPosition;
  const delta = movingDown ? -1 : 1;
  const [lo, hi] = movingDown
    ? [oldPosition, newPosition] // (lo, hi]
    : [newPosition, oldPosition]; // [lo, hi)
  const lowOp = movingDown ? '>' : '>=';
  const highOp = movingDown ? '<=' : '<';

  const parentParam = parentId ? [parentId] : [];

  // categories
  await exec(
    `UPDATE categories
     SET order_index = order_index + ${delta}
     WHERE ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
     AND order_index ${lowOp} ? AND order_index ${highOp} ?
     ${movedIsCategory ? 'AND id != ?' : ''}`,
    [...parentParam, lo, hi, ...(movedIsCategory ? [movedItemId] : [])]
  );

  // articles
  await exec(
    `UPDATE articles
     SET order_index = order_index + ${delta}, updated_at = updated_at
     WHERE ${parentId ? 'category_id = ?' : 'category_id IS NULL'}
     AND order_index ${lowOp} ? AND order_index ${highOp} ?
     ${!movedIsCategory ? 'AND id != ?' : ''}`,
    [...parentParam, lo, hi, ...(!movedIsCategory ? [movedItemId] : [])]
  );
}

/**
 * 跨级移动时为插入位置腾出空间：把目标父节点下指定位置及之后的所有项
 * （分类 + 文章）整体 +1。
 */
export async function makeSpaceForInsertion(
  parentId: string | null,
  insertPosition: number,
  exec: SqlExecutor = query
): Promise<void> {
  const parentParam = parentId ? [parentId] : [];

  await exec(
    `UPDATE categories
     SET order_index = order_index + 1
     WHERE ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
     AND order_index >= ?`,
    [...parentParam, insertPosition]
  );

  await exec(
    `UPDATE articles
     SET order_index = order_index + 1, updated_at = updated_at
     WHERE ${parentId ? 'category_id = ?' : 'category_id IS NULL'}
     AND order_index >= ?`,
    [...parentParam, insertPosition]
  );
}
