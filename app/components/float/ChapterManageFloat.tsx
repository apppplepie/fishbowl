/**
 * ChapterManageFloat (fixed)
 * - Reworked dnd-kit usage to support smooth cross-parent dragging via DragOverlay
 * - Removed redundant touch-polyfill and debug listeners that killed animation
 * - Local UI updates applied immediately; backend calls are asynchronous and do not block UI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, message, Spin, Empty, Input } from 'antd';
import { UnorderedListOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { addChapterNumbers, formatNodeLabel } from '@/app/utils/chapterNumbering';

// @dnd-kit imports
import {
  DndContext,
  PointerSensor,
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

// ---------- Helpers for tree manipulation ----------

// Find node by id (recursive)
function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Find parent id of a node
function findParentId(nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null {
  for (const node of nodes) {
    if (node.id === targetId) return parentId;
    if (node.children) {
      const found = findParentId(node.children, targetId, node.id);
      if (found !== null) return found;
    }
  }
  return null;
}

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
  const parentNode = findNode(treeData, parentId);
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
}> = ({ node, expandedKeys, onToggleExpand, onAddCategory, onDeleteCategory }) => {
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
        }}
        onClick={() => hasChildren && onToggleExpand(node.id)}
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
};

// SortableTree component
const SortableTree: React.FC<{
  nodes: TreeNode[];
  expandedKeys: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onAddCategory: (parentId: string) => void;
  onDeleteCategory: (categoryId: string, categoryName: string) => void;
}> = ({ nodes, expandedKeys, onToggleExpand, onAddCategory, onDeleteCategory }) => {
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
};

// Drag preview used inside DragOverlay
const DragPreview: React.FC<{ node: TreeNode | null }> = ({ node }) => {
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
};

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

  // sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
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

        setTreeData(childNodes);

        // 默认展开所有节点
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


  // ---------- Core DnD logic ----------

  // Utility to get parent id for a node id
  const getParentId = (nodeId: string): string | null => {
    return findParentId(treeData, nodeId, null);
  };

  // Utility to update treeData locally for a single parent
  const updateTreeLocalForParent = (parentId: string | null, newChildren: TreeNode[]) => {
    const updated = setChildrenForParent(treeData, parentId, newChildren);
    setTreeData(updated);
  };

  // Post reorder to backend (single parent)
  const postReorder = async (parentId: string | null, children: TreeNode[]) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        message.error('未登录，请先登录');
        return;
      }
      const payload = {
        moves: [
          {
            parent_id: parentId || '',
            children: children.map((n, i) => ({ id: n.id, type: n.node_type, order_index: i + 1 }))
          }
        ],
        moved: null,
      };
      const res = await fetch('/api/tree/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) {
        message.error(result.error || '保存排序失败');
      }
    } catch (err) {
      console.error('postReorder error', err);
      message.error('保存排序失败');
    }
  };

  // Post reorder for multiple parents
  const postReorderMulti = async (moves: { parent_id: string | null; children: TreeNode[] }[]) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        message.error('未登录，请先登录');
        return;
      }
      const payload = {
        moves: moves.map(m => ({
          parent_id: m.parent_id || '',
          children: m.children.map((n, i) => ({ id: n.id, type: n.node_type, order_index: i + 1 }))
        })),
        moved: moves.length === 2 ? { id: moves[0].children.find(c => c.parent_id && c.parent_id !== moves[0].parent_id)?.id || '' , new_parent_id: moves[1].parent_id || '' } : null
      };
      await fetch('/api/tree/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('postReorderMulti error', err);
      message.error('保存排序失败');
    }
  };

  // handleDragStart to set activeId for overlay
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
      const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const dragNode = findNode(treeData, active.id as string);
      const dropNode = findNode(treeData, over.id as string);

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
      const getParentId = (nodeId: string): string | null => {
        const findParent = (nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null => {
          for (const node of nodes) {
            if (node.id === targetId) return parentId;
            if (node.children) {
              const found = findParent(node.children, targetId, node.id);
              if (found !== null) return found;
            }
          }
          return null;
        };
        return findParent(treeData, nodeId);
      };

      const activeParentId = getParentId(active.id as string);
      const overParentId = getParentId(over.id as string);

      console.log('父级信息:', {
        activeParentId,
        overParentId,
        dragNodeParent: dragNode.parent_id,
        dropNodeParent: dropNode.parent_id,
      });

      let requestData: any;

      if (activeParentId === overParentId) {
        // 同级拖拽：同一个 parent 内的排序
        console.log('同级拖拽');

        const parentId = activeParentId || bookRootId || '';
        const siblings = getSiblingsFromTree(treeData, parentId);

        const oldIndex = siblings.findIndex((n: TreeNode) => n.id === active.id);
        const newIndex = siblings.findIndex((n: TreeNode) => n.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          console.error('找不到节点索引');
          return;
        }

        // 使用 @dnd-kit 的 arrayMove 生成新顺序
        const newOrder = arrayMove(siblings, oldIndex, newIndex);

        // 生成 payload（从 1 开始编号）
        const payload = newOrder.map((n: TreeNode, i: number) => ({
          id: n.id,
          type: n.node_type,
          order_index: i + 1,
        }));

        requestData = {
          moves: [
            {
              parent_id: parentId,
              children: payload,
            },
          ],
          moved: null, // 同级拖拽，不涉及 parent_id 变更
        };
      } else {
        // 不同级拖拽：跨 parent 移动
        console.log('不同级拖拽');

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
        const targetIndex = newSiblings.findIndex((n: TreeNode) => n.id === over.id);
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

        requestData = {
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
        };
      }

      console.log('发送请求数据:', requestData);

      // 调用新的拖拽排序 API
      const response = await fetch('/api/tree/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      // 异步处理响应，不要阻塞动画
      response.json().then(result => {
        console.log('拖拽排序响应:', { status: response.status, result });

        if (result.success) {
          message.success('操作成功');
          setHasChanges(true); // 标记有改动
          // 延迟一点时间再刷新，避免打断动画
          setTimeout(() => {
            loadChapterTree();
          }, 300);
        } else {
          if (response.status === 401) {
            message.error('您还未登录或登录已过期，请刷新页面后重新登录');
          } else {
            message.error(result.error || '操作失败');
          }
        }
      }).catch(error => {
        console.error('解析响应失败:', error);
        message.error('操作失败');
      });

    } catch (error) {
      console.error('拖拽失败:', error);
      message.error('操作失败');
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
        .chapter-tree-mobile .sortable-tree-node { user-select: none; -webkit-user-select:none; }
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
          <p style={{ marginBottom: 16, color: '#666' }}>💡 提示：拖动章节或目录可调整结构和顺序</p>

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
              onDragCancel={() => setActiveId(null)}
            >
              <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }} className="chapter-tree-mobile">
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
                {activeId ? <DragPreview node={findNode(treeData, activeId)} /> : null}
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