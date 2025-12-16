/**
 * 章节管理浮动按钮组件
 * 在书籍分类页面显示，支持查看和拖拽调整章节顺序
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FloatButton, Modal, message, Spin, Empty, Input } from 'antd';
import { UnorderedListOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { addChapterNumbers, formatNodeLabel } from '@/app/utils/chapterNumbering';

// @dnd-kit 导入
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
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
  parent_id: string | null;
  path: string;
  depth: number;
  order_index: number;
  node_type: 'category' | 'article';
  type?: string; // article type
  publish_date?: string;
  children?: TreeNode[];
}

// SortableItem 组件 - 使用 @dnd-kit
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCategory = node.node_type === 'category';
  const icon = isCategory ? '📁' : '📄';
  const isExpanded = expandedKeys.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isEmpty = !node.children || node.children.length === 0;

  // 格式化节点标签（添加章节号）
  const formattedLabel = formatNodeLabel(node as any, {
    showChapterLabel: true,
    showArticleNumber: false,
  });

  // 为分类节点添加操作按钮
  const titleElement = isCategory ? (
    <span>
      {icon} {formattedLabel}
      <span style={{ marginLeft: '8px' }}>
        <PlusOutlined
          style={{
            color: '#52c41a',
            cursor: 'pointer',
            marginRight: '8px',
            fontSize: '12px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAddCategory(node.id);
          }}
          title="新建子目录"
        />
        {isEmpty && (
          <DeleteOutlined
            style={{
              color: '#ff4d4f',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCategory(node.id, node.name);
            }}
            title="删除目录"
          />
        )}
      </span>
    </span>
  ) : (
    `${icon} ${formattedLabel}`
  );

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
          padding: '4px 8px',
          cursor: 'grab',
          borderRadius: '4px',
          background: isDragging ? '#f0f0f0' : 'transparent',
        }}
        onClick={() => hasChildren && onToggleExpand(node.id)}
      >
        {isCategory && hasChildren && (
          <span style={{ marginRight: '4px', cursor: 'pointer' }}>
            {isExpanded ? '📂' : '📁'}
          </span>
        )}
        <span style={{ flex: 1 }}>{titleElement}</span>
      </div>

      {isCategory && isExpanded && hasChildren && (
        <div style={{ marginLeft: '20px' }}>
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

// SortableTree 组件 - 递归渲染树结构
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

export default function ChapterManageFloat({ categoryId, onSuccess }: ChapterManageFloatProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [bookRootId, setBookRootId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false); // 追踪是否有改动

  const dragCounterRef = useRef(0);

  /**
   * 自定义树节点组件
   */
  // 新建目录相关状态
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 防止误触
      },
    })
  );

  /**
   * 调试：监听全局点击和触摸事件
   */
  useEffect(() => {
    if (!isModalOpen) return;

    const dbgClick = (e: MouseEvent) => {
      // 如果弹窗打开，打印一下点击落点
      console.log('🔍 global click while modal open:', {
        target: e.target,
        targetClassName: (e.target as HTMLElement)?.className,
        targetTagName: (e.target as HTMLElement)?.tagName,
        eventPhase: e.eventPhase,
        type: e.type
      });
    };

    const dbgTouch = (e: TouchEvent) => {
      console.log('🔍 global touch while modal open:', {
        type: e.type,
        target: e.target,
        targetClassName: (e.target as HTMLElement)?.className,
        targetTagName: (e.target as HTMLElement)?.tagName
      });
    };

    document.addEventListener('click', dbgClick, true);   // useCapture=true 更早捕获
    document.addEventListener('touchend', dbgTouch, true);

    return () => {
      document.removeEventListener('click', dbgClick, true);
      document.removeEventListener('touchend', dbgTouch, true);
    };
  }, [isModalOpen]);

  /**
   * 添加移动端触摸拖动支持
   * 将触摸事件转换为拖拽事件
   */
  useEffect(() => {
    if (!isModalOpen) return;

    // 等待 DOM 渲染完成
    const timer = setTimeout(() => {
      const treeNodes = document.querySelectorAll('.chapter-tree-mobile .ant-tree-treenode');
      
      treeNodes.forEach((node) => {
        const element = node as HTMLElement;
        
        let touchedElement: HTMLElement | null = null;
        let touchStartY = 0;
        let touchStartX = 0;
        let isDragging = false;
        let lastTouchY = 0;
        let lastTouchX = 0;
        
        // 触摸开始 - 模拟 dragstart
        const handleTouchStart = (e: TouchEvent) => {
          const touch = e.touches[0];
          touchStartY = touch.clientY;
          touchStartX = touch.clientX;
          lastTouchY = touch.clientY;
          lastTouchX = touch.clientX;
          touchedElement = element;
          isDragging = false;
          
          // 长按判定
          setTimeout(() => {
            if (touchedElement === element && !isDragging) {
              isDragging = true;
              element.style.opacity = '0.5';
              element.style.transform = 'scale(0.95)';
              
              // 触发拖拽开始事件
              const dragStartEvent = new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true,
              });
              element.dispatchEvent(dragStartEvent);
            }
          }, 200); // 200ms 长按判定
        };
        
        // 触摸移动 - 模拟 drag
        const handleTouchMove = (e: TouchEvent) => {
          if (!isDragging) {
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            
            // 移动超过阈值，取消长按判定
            if (deltaY > 10 || deltaX > 10) {
              touchedElement = null;
            }
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          
          const touch = e.touches[0];
          lastTouchY = touch.clientY;
          lastTouchX = touch.clientX;
          
          // 找到当前触摸位置下的元素
          element.style.pointerEvents = 'none';
          const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
          element.style.pointerEvents = '';
          
          if (targetElement) {
            const targetNode = targetElement.closest('.ant-tree-treenode');
            if (targetNode && targetNode !== element) {
              // 触发拖拽悬停事件
              const dragOverEvent = new DragEvent('dragover', {
                bubbles: true,
                cancelable: true,
              });
              targetNode.dispatchEvent(dragOverEvent);
            }
          }
        };
        
        // 触摸结束 - 模拟 drop
        const handleTouchEnd = (e: TouchEvent) => {
          if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            
            // 恢复样式
            element.style.opacity = '';
            element.style.transform = '';
            
            // 找到释放位置的元素
            element.style.pointerEvents = 'none';
            const targetElement = document.elementFromPoint(lastTouchX, lastTouchY);
            element.style.pointerEvents = '';
            
            if (targetElement) {
              const targetNode = targetElement.closest('.ant-tree-treenode');
              if (targetNode && targetNode !== element) {
                // 触发放置事件
                const dropEvent = new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                });
                targetNode.dispatchEvent(dropEvent);
              }
            }
            
            // 触发拖拽结束事件
            const dragEndEvent = new DragEvent('dragend', {
              bubbles: true,
              cancelable: true,
            });
            element.dispatchEvent(dragEndEvent);
          }
          
          touchedElement = null;
          isDragging = false;
        };
        
        // 触摸取消
        const handleTouchCancel = () => {
          if (isDragging) {
            element.style.opacity = '';
            element.style.transform = '';
          }
          touchedElement = null;
          isDragging = false;
        };
        
        // 添加事件监听
        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: false });
        element.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        // 保存清理函数
        (element as any)._cleanupTouch = () => {
          element.removeEventListener('touchstart', handleTouchStart);
          element.removeEventListener('touchmove', handleTouchMove);
          element.removeEventListener('touchend', handleTouchEnd);
          element.removeEventListener('touchcancel', handleTouchCancel);
        };
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      // 清理所有事件监听器
      const treeNodes = document.querySelectorAll('.chapter-tree-mobile .ant-tree-treenode');
      treeNodes.forEach((node) => {
        const element = node as any;
        if (element._cleanupTouch) {
          element._cleanupTouch();
          delete element._cleanupTouch;
        }
      });
    };
  }, [isModalOpen, treeData]);

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

  /**
   * 打开新建目录对话框
   */
  const handleAddCategory = (parentId: string) => {
    setNewCategoryParentId(parentId);
    setNewCategoryName('');
    setNewCategoryModalOpen(true);
  };

  /**
   * 确认新建目录
   */
  const handleConfirmAddCategory = async () => {
    if (!newCategoryName.trim()) {
      message.warning('请输入目录名称');
      return;
    }

    try {
      // 生成新的分类ID
      const newCategoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 调用API创建新分类
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newCategoryId,
          name: newCategoryName.trim(),
          parent_id: newCategoryParentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('目录创建成功');
        setNewCategoryModalOpen(false);
        setNewCategoryName('');
        setHasChanges(true);
        // 重新加载树结构
        await loadChapterTree();
      } else {
        message.error(result.error || '创建目录失败');
      }
    } catch (error) {
      console.error('创建目录失败:', error);
      message.error('创建目录失败');
    }
  };

  /**
   * 删除目录
   */
  const handleDeleteCategory = (categoryId: string, categoryName: string, e?: React.MouseEvent) => {
    // 阻止事件冒泡到 FloatButton.Group
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
          const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE',
          });

          const result = await response.json();

          if (result.success) {
            message.success('目录删除成功');
            setHasChanges(true);
            // 重新加载树结构
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


  /**
   * 获取节点的所有同级兄弟节点（从树数据中查找）
   */
  const getSiblings = (nodes: TreeNode[], targetParentId: string | null): TreeNode[] => {
    // 递归获取所有节点
    const getAllNodes = (nodeList: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];
      for (const node of nodeList) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result.push(...getAllNodes(node.children));
        }
      }
      return result;
    };

    // 获取所有节点，然后按 parent_id 过滤
    const allNodes = getAllNodes(treeData);
    const siblings = allNodes.filter(n => n.parent_id === targetParentId);

    // 按 order_index 排序
    return siblings.sort((a, b) => a.order_index - b.order_index);
  };

  /**
   * 处理拖拽结束 - @dnd-kit 版本
   */
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
        const siblings = getSiblings([], parentId);

        const oldIndex = siblings.findIndex(n => n.id === active.id);
        const newIndex = siblings.findIndex(n => n.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          console.error('找不到节点索引');
          return;
        }

        // 使用 @dnd-kit 的 arrayMove 生成新顺序
        const newOrder = arrayMove(siblings, oldIndex, newIndex);

        // 生成 payload（从 1 开始编号）
        const payload = newOrder.map((n, i) => ({
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
        const oldSiblings = getSiblings([], oldParentId);
        const newOldList = oldSiblings
          .filter(n => n.id !== dragNode.id)
          .map((n, i) => ({
            id: n.id,
            type: n.node_type,
            order_index: i + 1,
          }));

        // 2. 处理 newParent：插入到目标位置并重排
        const newSiblings = getSiblings([], newParentId)
          .filter(n => n.id !== dragNode.id); // 防御性过滤

        // 找到目标节点在新列表中的位置，然后插入
        const targetIndex = newSiblings.findIndex(n => n.id === over.id);
        const insertIndex = targetIndex !== -1 ? targetIndex : newSiblings.length;

        newSiblings.splice(insertIndex, 0, {
          ...dragNode,
          parent_id: newParentId,
        });

        const newNewList = newSiblings.map((n, i) => ({
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

      const result = await response.json();
      console.log('拖拽排序响应:', { status: response.status, result });

      if (result.success) {
        message.success('操作成功');
        setHasChanges(true); // 标记有改动
        await loadChapterTree();
      } else {
        if (response.status === 401) {
          message.error('您还未登录或登录已过期，请刷新页面后重新登录');
        } else {
          message.error(result.error || '操作失败');
        }
      }

    } catch (error) {
      console.error('拖拽失败:', error);
      message.error('操作失败');
    }
  };

  /**
   * 显示弹窗
   */
  const showModal = () => {
    setIsModalOpen(true);
    setHasChanges(false); // 重置改动标记
    loadChapterTree();
  };

  /**
   * 关闭弹窗
   */
  const handleCancel = () => {
    setIsModalOpen(false);
    // 如果有改动，触发刷新回调
    if (hasChanges && onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <style>{`
        /* 移动端触摸拖动支持 */
        .chapter-tree-mobile .ant-tree-treenode {
          touch-action: none;
          -webkit-user-drag: element;
          user-select: none;
          -webkit-user-select: none;
        }
        
        .chapter-tree-mobile .ant-tree-draggable-icon {
          cursor: grab;
          touch-action: none;
        }
        
        .chapter-tree-mobile .ant-tree-treenode-draggable {
          touch-action: none;
        }
        
        .chapter-tree-mobile .ant-tree-node-content-wrapper {
          user-select: none;
          -webkit-user-select: none;
        }
        
        /* 移动端优化：增大可拖拽区域 */
        @media (max-width: 768px) {
          .chapter-tree-mobile .ant-tree-treenode {
            padding: 0px 0;
          }
          
          .chapter-tree-mobile .ant-tree-node-content-wrapper {
            padding: 8px;
            min-height: 32px;
            display: flex;
            align-items: center;
          }
          
          .chapter-tree-mobile .ant-tree-draggable-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
      
      <FloatButton
        icon={<UnorderedListOutlined />}
        tooltip={{ title: "章节管理", placement: "left" }}
        onClick={(e) => {
          // 阻止事件冒泡到 FloatButton.Group，避免触发 Group 的收起/展开
          e?.stopPropagation();
          showModal();
        }}
      />

      <Modal
        title="章节管理"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width="90%"
        style={{ maxWidth: '700px' }}
        maskClosable={false}
        destroyOnHidden={true}
        keyboard={false}
        styles={{
          body: {
            minHeight: '400px',
            maxHeight: '70vh',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
          }
        }}
        getContainer={false}
      >
        <div 
          style={{ padding: '20px 0' }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <p style={{ marginBottom: '16px', color: '#666' }}>
            💡 提示：拖动章节或目录可调整结构和顺序
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large">
                <div style={{ minHeight: '100px' }} />
              </Spin>
            </div>
          ) : treeData.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div
                style={{
                  background: '#fafafa',
                  padding: '16px',
                  borderRadius: '8px',
                }}
                className="chapter-tree-mobile"
              >
                <SortableTree
                  nodes={treeData}
                  expandedKeys={expandedKeys}
                  onToggleExpand={(nodeId) => {
                    const newKeys = new Set(expandedKeys);
                    if (newKeys.has(nodeId)) {
                      newKeys.delete(nodeId);
                    } else {
                      newKeys.add(nodeId);
                    }
                    setExpandedKeys(newKeys);
                  }}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              </div>
            </DndContext>
          ) : (
            <Empty
              description="暂无章节数据"
              style={{ padding: '60px 0' }}
            />
          )}
        </div>
      </Modal>

      {/* 新建目录对话框 */}
      <Modal
        title="新建目录"
        open={newCategoryModalOpen}
        onOk={(e) => {
          e?.stopPropagation();
          handleConfirmAddCategory();
        }}
        onCancel={(e) => {
          e?.stopPropagation();
          setNewCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        okText="确认"
        cancelText="取消"
        maskClosable={false}
        keyboard={false}
        getContainer={false}
      >
        <div 
          style={{ padding: '20px 0' }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Input
            placeholder="请输入目录名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={(e) => {
              e.stopPropagation();
              handleConfirmAddCategory();
            }}
            maxLength={50}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}