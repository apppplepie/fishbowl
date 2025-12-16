/**
 * ChapterManageFloat (fixed)
 * - Reworked dnd-kit usage to support smooth cross-parent dragging via DragOverlay
 * - Removed redundant touch-polyfill and debug listeners that killed animation
 * - Local UI updates applied immediately; backend calls are asynchronous and do not block UI
 */

'use client';

import React, { useState, useEffect } from 'react';

// UI imports
import { FloatButton, Modal, message, Spin, Empty, Input } from 'antd';
import {
  UnorderedListOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CaretDownOutlined,
  CaretRightOutlined
} from '@ant-design/icons';

// Drag & drop imports
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Utilities
import { addChapterNumbers, formatNodeLabel } from '@/app/utils/chapterNumbering';

interface ChapterManageFloatProps {
  categoryId: string; // 当前书籍分类ID
  onSuccess?: () => void; // 拖动调整成功后的回调
}

interface TreeNode {
  id: string;
  name: string;
  title?: string;
  parent_id?: string | null;
  path?: string;
  depth?: number;
  order_index: number;
  node_type?: 'category' | 'article';
  type?: string; // article type
  publish_date?: string;
  children?: TreeNode[];
}

  // ---------- Tree manipulation utilities ----------

  // Find node by id (recursive)
  const findNodeRecursive = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeRecursive(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Find parent id of a node
  const findParentIdRecursive = (nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null => {
    for (const node of nodes) {
      if (node.id === targetId) return parentId;
      if (node.children) {
        const found = findParentIdRecursive(node.children, targetId, node.id);
        if (found !== null) return found;
      }
    }
    return null;
  };

// Replace children of a parent (parentId === null means root level)
function setChildrenForParent(nodes: TreeNode[], parentId: string | null, newChildren: TreeNode[]): TreeNode[] {
  if (parentId === null || parentId === '') {
    // replace top-level nodes
    return newChildren.map(n => ({ ...n }));
  }

  // deep clone while preserving other branches
  const walk = (list: TreeNode[]): TreeNode[] => {
    return list.map(node => {
      if (node.id === parentId) {
        return { ...node, children: newChildren.map(n => ({ ...n })) };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: walk(node.children) };
      }
      return { ...node };
    });
  };

  return walk(nodes);
}

// Get siblings (children of a parent), ordered by order_index
function getSiblingsFromTree(treeData: TreeNode[], parentId: string | null): TreeNode[] {
  if (parentId === null || parentId === '') {
    // top-level nodes
    const tops = treeData.map(n => ({ ...n }));
    return tops.sort((a, b) => a.order_index - b.order_index);
  }
  const parentNode = findNodeRecursive(treeData, parentId);
  if (!parentNode) return [];
  const children = (parentNode.children || []).map(n => ({ ...n }));
  return children.sort((a, b) => a.order_index - b.order_index);
}

// Utility to normalize parent id
const normalizeParentId = (id: string | null | undefined): string | null => (id == null || id === '' ? null : String(id));

// ---------- SortableItem ----------

const SortableItem: React.FC<{
  node: TreeNode;
  expandedKeys: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onAddCategory: (parentId: string) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
}> = React.memo(({ node, expandedKeys, onToggleExpand, onAddCategory, onDeleteCategory }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: 6,
    background: isDragging ? '#fafafa' : 'transparent',
    borderRadius: 6,
  };

  const isCategory = node.node_type === 'category';
  const icon = isCategory ? '📁' : '📄';
  const isExpanded = expandedKeys.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isEmpty = !node.children || node.children.length === 0;

  const formattedLabel = formatNodeLabel(node as any, {
    showChapterLabel: true,
    showArticleNumber: false,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="sortable-tree-node"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          cursor: 'grab',
          minHeight: '44px', // 移动端最小触摸区域
        }}
        onClick={() => hasChildren && onToggleExpand(node.id)}
        onTouchStart={(e) => {
          // 防止触摸时页面滚动和默认行为
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // 防止拖拽过程中触发滚动
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          // 确保触摸结束事件也被拦截
          e.stopPropagation();
        }}
      >
        {isCategory && hasChildren && (
          <span style={{ marginRight: '6px', cursor: 'pointer' }}>
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
          </span>
        )}
        <span style={{ flex: 1 }}>
          {isCategory ? (
            <span>
              {icon} {formattedLabel}
              <span style={{ marginLeft: '8px' }}>
                <PlusOutlined
                  style={{ color: '#52c41a', cursor: 'pointer', marginRight: 8, fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); onAddCategory(node.id); }}
                  title="新建子目录"
                />
                {isEmpty && (
                  <DeleteOutlined
                    style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); onDeleteCategory(node.id, node.name || ''); }}
                    title="删除目录"
                  />
                )}
              </span>
            </span>
          ) : `${icon} ${formattedLabel}`}
        </span>
      </div>

      {isCategory && isExpanded && hasChildren && (
        <div style={{ marginLeft: 20 }}>
          <SortableTree
            nodes={node.children || []}
            expandedKeys={expandedKeys}
            onToggleExpand={onToggleExpand}
            onAddCategory={onAddCategory}
            onDeleteCategory={onDeleteCategory}
          />
        </div>
      )}
    </div>
  );
});

// SortableTree component
const SortableTree: React.FC<{
  nodes: TreeNode[];
  expandedKeys: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onAddCategory: (parentId: string) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
}> = React.memo(({ nodes, expandedKeys, onToggleExpand, onAddCategory, onDeleteCategory }) => {
  return (
    <SortableContext
      items={nodes.map(n => n.id)}
      strategy={verticalListSortingStrategy}
    >
      {nodes.map(node => (
        <SortableItem
          key={node.id}
          node={node}
          expandedKeys={expandedKeys}
          onToggleExpand={onToggleExpand}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ))}
    </SortableContext>
  );
});

// Drag preview used inside DragOverlay
const DragPreview: React.FC<{ node: TreeNode | null }> = React.memo(({ node }) => {
  if (!node) return null;
  const formattedLabel = formatNodeLabel(node as any, {
    showChapterLabel: true,
    showArticleNumber: false,
  });
  return (
    <div
      style={{
        padding: 10,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        maxWidth: 380,
      }}
    >
      {node.node_type === 'category' ? '📁 ' : '📄 '}
      {formattedLabel}
    </div>
  );
});

// ---------- Main component ----------

export default function ChapterManageFloat({ categoryId, onSuccess }: ChapterManageFloatProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [bookRootId, setBookRootId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // activeId for DragOverlay preview
  const [activeId, setActiveId] = useState<string | null>(null);

  // 乐观更新相关状态
  const [rollbackTreeData, setRollbackTreeData] = useState<TreeNode[]>([]);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);

  // 控制弹窗保持状态的标志
  const [shouldKeepModalOpen, setShouldKeepModalOpen] = useState(false);

  // 检测是否为移动设备
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // sensors - 支持桌面和移动端拖拽
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // 增加触摸延迟，确保拖拽优先级高于滚动
        tolerance: 5, // 减少容忍距离，提高精确度
      },
    })
  );

  // collision detection: prefer pointerWithin, fallback to rectIntersection
  const collisionDetection = (args: any) => {
    const pointer = pointerWithin(args);
    if (pointer && pointer.length > 0) return pointer;
    return rectIntersection(args);
  };

  useEffect(() => {
    if (isModalOpen) {
      loadChapterTree();
    }
  }, [isModalOpen]);

  /**
   * 获取书架分类ID（cat_bookcase）
   * cat_bookcase 本身就是固定的 ID
   */
  const getBookcaseId = (): string => {
    return 'cat_bookcase';
  };

  /**
   * 加载章节树数据
   */
  const loadChapterTree = async () => {
    setLoading(true);
    try {
      // 获取书架分类ID（固定为 cat_bookcase）
      const bookcaseId = getBookcaseId();
      console.log('ChapterManageFloat: 书架ID:', bookcaseId);
      setBookRootId(bookcaseId);

      // 加载书架的完整树结构
      const response = await fetch(`/api/categories/${bookcaseId}/tree-with-articles`);
      const result = await response.json();

      console.log('ChapterManageFloat: API响应:', result);

      if (result.success && result.data) {
        let treeNodes = result.data.tree as TreeNode[];

        // 不显示书架本身，直接使用其子节点
        let childNodes = treeNodes.length > 0 && treeNodes[0].children
          ? treeNodes[0].children
          : treeNodes;

        // 添加章节编号
        childNodes = addChapterNumbers(childNodes);

        // 保存当前的展开状态，避免刷新时弹窗消失
        const currentExpandedKeys = new Set(expandedKeys);

        setTreeData(childNodes);

        // 保持当前的展开状态，而不是重置为全部展开
        // 只有在初次加载时才展开所有节点
        if (currentExpandedKeys.size === 0) {
          // 初次加载：默认展开所有节点
          const allExpandedKeys = new Set<string>();
          const collectKeys = (nodes: TreeNode[]) => {
            nodes.forEach(node => {
              if (node.children && node.children.length > 0) {
                allExpandedKeys.add(node.id);
                collectKeys(node.children);
              }
            });
          };
          collectKeys(childNodes);
          setExpandedKeys(allExpandedKeys);
        }
        // 刷新时保持当前的展开状态，不做任何改变
      } else {
        message.error('加载章节数据失败');
      }
    } catch (error) {
      console.error('加载章节树失败:', error);
      message.error('加载章节数据失败');
    } finally {
      setLoading(false);
    }
  };

  // add category handler (unchanged)
  const handleAddCategory = (parentId: string) => {
    // simplified UI flow - open modal handled below
    setNewCategoryParentId(parentId);
    setNewCategoryName('');
    setNewCategoryModalOpen(true);
  };

  // new category modal state
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);

  // delete category handler unchanged (keeps API call)
  const handleDeleteCategory = async (categoryId: string, categoryName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除目录"${categoryName}"吗？只有空目录才能删除。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      maskClosable: false,
      keyboard: false,
      onOk: async () => {
        try {
          const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            message.success('目录删除成功');
            setHasChanges(true);
            await loadChapterTree();
          } else {
            message.error(result.error || '删除目录失败');
          }
        } catch (error) {
          console.error('删除目录失败:', error);
          message.error('删除目录失败');
        }
      },
    });
  };

  // state for new category confirm
  const handleConfirmAddCategory = async () => {
    if (!newCategoryName.trim()) {
      message.warning('请输入目录名称');
      return;
    }

    try {
      const newCategoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const siblings = getSiblingsFromTree(treeData, newCategoryParentId || bookRootId || null);
      const newOrderIndex = siblings.length + 1;

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newCategoryId,
          name: newCategoryName.trim(),
          parent_id: newCategoryParentId,
          order_index: newOrderIndex,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success('目录创建成功');
        setNewCategoryModalOpen(false);
        setNewCategoryName('');
        setHasChanges(true);
        await loadChapterTree();
      } else {
        message.error(result.error || '创建目录失败');
      }
    } catch (error) {
      console.error('创建目录失败:', error);
      message.error('创建目录失败');
    }
  };


  // ---------- Optimistic update utilities ----------

  // 执行乐观更新（立即更新本地状态）
  const performOptimisticUpdate = (updater: (currentTree: TreeNode[]) => TreeNode[]) => {
    setRollbackTreeData([...treeData]); // 保存当前状态用于回滚
    setTreeData(currentTree => updater(currentTree));
    setIsOptimisticUpdate(true);
    setShouldKeepModalOpen(true); // 标记需要保持弹窗打开
  };

  // 回滚到之前的状态
  const rollbackOptimisticUpdate = () => {
    if (rollbackTreeData.length > 0) {
      setTreeData(rollbackTreeData);
      setRollbackTreeData([]);
      setIsOptimisticUpdate(false);
      setShouldKeepModalOpen(false); // 清除保持弹窗标志
    }
  };

  // 确认乐观更新成功
  const confirmOptimisticUpdate = () => {
    setRollbackTreeData([]);
    setIsOptimisticUpdate(false);
    setShouldKeepModalOpen(false); // 清除保持弹窗标志
    setHasChanges(true);

    // 延迟同步服务器状态，但不重新加载整个树结构（保持弹窗打开）
    // 只在必要时进行轻量级同步，比如更新一些服务器计算的字段
    setTimeout(() => {
      // 可以选择不刷新，或者只刷新特定数据
      // loadChapterTree(); // 暂时注释掉，避免刷新时弹窗消失

      // 如果需要同步，可以调用更轻量的API
      // 比如只同步 order_index 或其他服务器生成的字段
    }, 1000);
  };

  // ---------- Drag handling utilities ----------

  // 处理同级拖拽（同一父节点内的排序）
  const handleSameLevelDrag = (activeId: string, overId: string, parentId: string | null) => {
    const siblings = getSiblingsFromTree(treeData, parentId || bookRootId || '');

    const oldIndex = siblings.findIndex((n: TreeNode) => n.id === activeId);
    const newIndex = siblings.findIndex((n: TreeNode) => n.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('找不到节点索引');
      return null;
    }

    // 使用 @dnd-kit 的 arrayMove 生成新顺序
    const newOrder = arrayMove(siblings, oldIndex, newIndex);

    // 生成 payload（从 1 开始编号）
    const payload = newOrder.map((n: TreeNode, i: number) => ({
      id: n.id,
      type: n.node_type,
      order_index: i + 1,
    }));

    // 同时返回新的树结构和API请求数据
    return {
      newTreeData: setChildrenForParent(treeData, parentId, newOrder),
      apiPayload: {
        moves: [
          {
            parent_id: parentId || '',
            children: payload,
          },
        ],
        moved: null, // 同级拖拽，不涉及 parent_id 变更
      }
    };
  };

  // 处理跨级拖拽（移动到不同父节点）
  const handleCrossLevelDrag = (dragNode: TreeNode, dropNode: TreeNode, activeParentId: string | null, overParentId: string | null) => {
    const oldParentId = activeParentId || bookRootId || '';
    const newParentId = dropNode.node_type === 'category' ? dropNode.id : (overParentId || bookRootId || '');

    // 1. 处理 oldParent：删除节点并重排
    const oldSiblings = getSiblingsFromTree(treeData, oldParentId);
    const newOldList = oldSiblings
      .filter((n: TreeNode) => n.id !== dragNode.id)
      .map((n: TreeNode, i: number) => ({
        id: n.id,
        type: n.node_type,
        order_index: i + 1,
      }));

    // 2. 处理 newParent：插入到目标位置并重排
    const newSiblings = getSiblingsFromTree(treeData, newParentId)
      .filter((n: TreeNode) => n.id !== dragNode.id); // 防御性过滤

    // 找到目标节点在新列表中的位置，然后插入
    const targetIndex = newSiblings.findIndex((n: TreeNode) => n.id === dropNode.id);
    const insertIndex = targetIndex !== -1 ? targetIndex : newSiblings.length;

    newSiblings.splice(insertIndex, 0, {
      ...dragNode,
      parent_id: newParentId,
    });

    const newNewList = newSiblings.map((n: TreeNode, i: number) => ({
      id: n.id,
      type: n.node_type,
      order_index: i + 1,
    }));

    // 生成新的树结构
    let newTreeData = setChildrenForParent(treeData, oldParentId, newOldList.map(n => findNodeRecursive(treeData, n.id)!).filter(Boolean));
    newTreeData = setChildrenForParent(newTreeData, newParentId, newNewList.map(n => n.id === dragNode.id ? { ...dragNode, parent_id: newParentId } : findNodeRecursive(newTreeData, n.id)!).filter(Boolean));

    return {
      newTreeData,
      apiPayload: {
        moves: [
          {
            parent_id: oldParentId,
            children: newOldList,
          },
          {
            parent_id: newParentId,
            children: newNewList,
          },
        ],
        moved: {
          id: dragNode.id,
          new_parent_id: newParentId,
        },
      }
    };
  };

  // ---------- Core DnD logic ----------



  // handleDragStart to set activeId for overlay
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // 移动端：拖拽开始时禁用页面滚动
    if (isMobile && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  };

  // handleDragEnd: update local tree immediately, post update in background
  /**
   * 处理拖拽结束 - @dnd-kit 版本
   * @dnd-kit 只告诉你：active.id（拖谁） 和 over.id（放到谁上面）
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // 如果没有有效的拖拽目标，直接返回
    if (!over || active.id === over.id) return;

    console.log('拖拽结束:', {
      activeId: active.id,
      overId: over.id,
    });

    try {
      // 从 localStorage 获取 token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        message.error('未登录，请先登录');
        return;
      }

      // 找到被拖拽的节点和目标节点
      const dragNode = findNodeRecursive(treeData, active.id as string);
      const dropNode = findNodeRecursive(treeData, over.id as string);

      if (!dragNode) {
        console.error('找不到拖拽节点:', active.id);
        return;
      }

      if (!dropNode) {
        console.error('找不到目标节点:', over.id);
        return;
      }

      // 只有文章允许拖拽
      if (dragNode.node_type !== 'article') {
        message.warning('目录顺序不允许修改');
        return;
      }

      // 获取节点的父级ID
      const activeParentId = findParentIdRecursive(treeData, active.id as string);
      const overParentId = findParentIdRecursive(treeData, over.id as string);

      console.log('父级信息:', {
        activeParentId,
        overParentId,
        dragNodeParent: dragNode.parent_id,
        dropNodeParent: dropNode.parent_id,
      });

      // 根据拖拽类型生成请求数据和新的树结构
      // 如果目标节点是目录，优先处理为跨级拖拽（拖入目录）
      const dragResult = dropNode.node_type === 'category'
        ? handleCrossLevelDrag(dragNode, dropNode, activeParentId, overParentId)
        : activeParentId === overParentId
        ? handleSameLevelDrag(active.id as string, over.id as string, activeParentId)
        : handleCrossLevelDrag(dragNode, dropNode, activeParentId, overParentId);

      if (!dragResult) {
        console.error('无法生成拖拽请求数据');
        return;
      }

      const { newTreeData, apiPayload } = dragResult;

      // 执行乐观更新：立即更新本地状态
      performOptimisticUpdate(() => newTreeData);

      console.log('发送请求数据:', apiPayload);

      // 调用新的拖拽排序 API
      const response = await fetch('/api/tree/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiPayload),
      });

      // 异步处理响应，不要阻塞动画
      response.json().then(result => {
        console.log('拖拽排序响应:', { status: response.status, result });

        if (result.success) {
          // 乐观更新成功，确认状态并延迟同步
          confirmOptimisticUpdate();
          message.success('操作成功');
        } else {
          // 乐观更新失败，回滚到之前的状态
          rollbackOptimisticUpdate();

          if (response.status === 401) {
            message.error('您还未登录或登录已过期，请刷新页面后重新登录');
          } else {
            message.error(result.error || '操作失败');
          }
        }
      }).catch(error => {
        console.error('解析响应失败:', error);
        // 网络错误也回滚
        rollbackOptimisticUpdate();
        message.error('操作失败');
      });

    } catch (error) {
      console.error('拖拽失败:', error);
      message.error('操作失败');
    } finally {
      // 无论成功失败都要恢复页面滚动
      if (isMobile && typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    }
  };

  // show modal
  const showModal = () => {
    setIsModalOpen(true);
    setHasChanges(false);
  };

  // close modal
  const handleCancel = () => {
    setIsModalOpen(false);
    if (hasChanges && onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <style>{`
        .chapter-tree-mobile .sortable-tree-node {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          touch-action: none; /* 完全禁用默认触摸行为，优先处理拖拽 */
        }

        .chapter-tree-mobile .sortable-tree-node:active {
          background: rgba(24, 144, 255, 0.1);
        }

        /* 移动端拖拽提示 */
        @media (max-width: 768px) {
          .chapter-tree-mobile .sortable-tree-node {
            min-height: 44px; /* iOS 推荐的最小触摸区域 */
          }
        }

        /* 拖拽激活时的全局禁用滚动 */
        .chapter-tree-mobile[data-dragging="true"] {
          overflow: hidden !important;
          touch-action: none !important;
        }
      `}</style>

      <FloatButton
        icon={<UnorderedListOutlined />}
        tooltip={{ title: "章节管理", placement: "left" }}
        onClick={(e) => { e?.stopPropagation(); showModal(); }}
      />

      <Modal
        title="章节管理"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width="90%"
        style={{ maxWidth: '720px' }}
        maskClosable={false}
        destroyOnHidden={true}
        keyboard={false}
        getContainer={false}
      >
        <div style={{ padding: '20px 0' }} onClick={(e) => e.stopPropagation()}>
          <p style={{ marginBottom: 16, color: '#666' }}>
            💡 提示：
            {isMobile
              ? '长按0.3秒拖动章节或目录可调整结构和顺序（不会触发页面滚动）'
              : '拖动章节或目录可调整结构和顺序'
            }
            {isOptimisticUpdate && (
              <span style={{ color: '#1890ff', marginLeft: 8 }}>
                🔄 正在保存更改...
              </span>
            )}
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large"><div style={{ minHeight: 100 }} /></Spin>
            </div>
          ) : treeData.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                setActiveId(null);
                // 恢复页面滚动
                if (isMobile && typeof document !== 'undefined') {
                  document.body.style.overflow = '';
                  document.body.style.touchAction = '';
                }
              }}
            >
              <div
                style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}
                className="chapter-tree-mobile"
                onTouchStart={(e) => {
                  // 在拖拽容器级别阻止默认触摸行为
                  if (isMobile) {
                    e.stopPropagation();
                  }
                }}
                onTouchMove={(e) => {
                  // 防止拖拽过程中的页面滚动
                  if (isMobile) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <SortableTree
                  nodes={treeData}
                  expandedKeys={expandedKeys}
                  onToggleExpand={(nodeId) => {
                    const newKeys = new Set(expandedKeys);
                    if (newKeys.has(nodeId)) newKeys.delete(nodeId);
                    else newKeys.add(nodeId);
                    setExpandedKeys(newKeys);
                  }}
                  onAddCategory={(parentId) => { setNewCategoryParentId(parentId); setNewCategoryName(''); setNewCategoryModalOpen(true); }}
                  onDeleteCategory={(categoryId, categoryName) => handleDeleteCategory(categoryId, categoryName)}
                />
              </div>

              <DragOverlay dropAnimation={{ duration: 220 }}>
                {activeId ? <DragPreview node={findNodeRecursive(treeData, activeId)} /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <Empty description="暂无章节数据" style={{ padding: '60px 0' }} />
          )}
        </div>
      </Modal>

      {/* 新建目录对话框 */}
      <Modal
        title="新建目录"
        open={newCategoryModalOpen}
        onOk={(e) => { e?.stopPropagation(); handleConfirmAddCategory(); }}
        onCancel={(e) => { e?.stopPropagation(); setNewCategoryModalOpen(false); setNewCategoryName(''); }}
        okText="确认"
        cancelText="取消"
        maskClosable={false}
        keyboard={false}
        getContainer={false}
      >
        <div style={{ padding: '20px 0' }} onClick={(e) => e.stopPropagation()}>
          <Input
            placeholder="请输入目录名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={(e) => { e.stopPropagation(); handleConfirmAddCategory(); }}
            maxLength={50}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}