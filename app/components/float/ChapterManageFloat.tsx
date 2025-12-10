/**
 * 章节管理浮动按钮组件
 * 在书籍分类页面显示，支持查看和拖拽调整章节顺序
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FloatButton, Modal, Tree, message, Spin, Empty, Input } from 'antd';
import { UnorderedListOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { TreeDataNode, TreeProps } from 'antd';

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

export default function ChapterManageFloat({ categoryId, onSuccess }: ChapterManageFloatProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [bookRootId, setBookRootId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false); // 追踪是否有改动
  
  // 新建目录相关状态
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);

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
        const treeNodes = result.data.tree as TreeNode[];
        
        // 不显示书架本身，直接使用其子节点
        const childNodes = treeNodes.length > 0 && treeNodes[0].children 
          ? treeNodes[0].children 
          : treeNodes;
        
        // 构建Tree组件需要的数据格式
        const treeDataNodes = buildTreeData(childNodes);
        setTreeData(treeDataNodes);

        // 默认展开所有节点
        const allKeys = getAllKeys(childNodes);
        setExpandedKeys(allKeys);
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
          order_index: 0, // 默认放在最前面
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
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除目录"${categoryName}"吗？只有空目录才能删除。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
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
   * 递归构建Tree组件数据
   */
  const buildTreeData = (nodes: TreeNode[]): TreeDataNode[] => {
    return nodes.map(node => {
      const isCategory = node.node_type === 'category';
      const icon = isCategory ? '📁' : '📄';
      
      // 判断是否是空目录（没有子节点）
      const isEmpty = !node.children || node.children.length === 0;
      
      // 为分类节点添加操作按钮
      const titleElement = isCategory ? (
        <span>
          {icon} {node.name}
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
                handleAddCategory(node.id);
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
                  handleDeleteCategory(node.id, node.name);
                }}
                title="删除目录"
              />
            )}
          </span>
        </span>
      ) : (
        `${icon} ${node.name}`
      );
      
      const treeNode: TreeDataNode = {
        key: `${node.node_type}-${node.id}`,
        title: titleElement,
        children: node.children && node.children.length > 0 
          ? buildTreeData(node.children) 
          : undefined,
        // 存储原始数据用于拖拽时的处理
        // @ts-ignore
        data: node,
      };

      return treeNode;
    });
  };

  /**
   * 获取所有节点的keys
   */
  const getAllKeys = (nodes: TreeNode[]): string[] => {
    const keys: string[] = [];
    const collect = (nodeList: TreeNode[]) => {
      nodeList.forEach(node => {
        keys.push(`${node.node_type}-${node.id}`);
        if (node.children && node.children.length > 0) {
          collect(node.children);
        }
      });
    };
    collect(nodes);
    return keys;
  };

  /**
   * 获取节点的所有同级兄弟节点（从树数据中查找）
   */
  const getSiblings = (nodes: TreeNode[], targetParentId: string | null): TreeNode[] => {
    const siblings: TreeNode[] = [];
    
    const findSiblings = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        // 找到同父节点的节点
        if (node.parent_id === targetParentId) {
          siblings.push(node);
        }
        // 递归查找子节点
        if (node.children && node.children.length > 0) {
          findSiblings(node.children);
        }
      }
    };

    // 从API返回的原始树数据中查找
    const response = treeData;
    if (response.length > 0 && (response[0] as any).data) {
      // 从TreeDataNode提取原始数据
      const extractNodes = (dataNodes: TreeDataNode[]): TreeNode[] => {
        const result: TreeNode[] = [];
        for (const dn of dataNodes) {
          // @ts-ignore
          if (dn.data) {
            // @ts-ignore
            result.push(dn.data);
            if (dn.children) {
              result.push(...extractNodes(dn.children));
            }
          }
        }
        return result;
      };
      const allNodes = extractNodes(treeData);
      return allNodes.filter(n => n.parent_id === targetParentId);
    }
    
    return siblings;
  };

  /**
   * 处理拖拽放置
   */
  const onDrop: TreeProps['onDrop'] = async (info) => {
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    console.log('拖拽信息:', {
      dragKey: info.dragNode.key,
      dropKey: info.node.key,
      dropPosition,
      dropToGap: info.dropToGap,
    });

    try {
      // @ts-ignore
      const dragNode = info.dragNode.data as TreeNode;
      // @ts-ignore
      const dropNode = info.node.data as TreeNode;

      const isDraggingArticle = dragNode.node_type === 'article';
      const isDropOnCategory = dropNode.node_type === 'category';

      // 处理文章拖拽
      if (isDraggingArticle) {
        const articleId = dragNode.id;
        let newCategoryId: string;
        let newOrder: number | undefined;

        if (!info.dropToGap) {
          // 放到节点内部（不同级）
          if (!isDropOnCategory) {
            message.warning('章节只能放置到目录内部');
            return;
          }
          newCategoryId = dropNode.id;
          newOrder = undefined; // 不同级，不指定顺序
        } else {
          // 放到节点之间
          if (dropNode.node_type === 'article') {
            // 放到文章旁边
            newCategoryId = dropNode.parent_id || bookRootId || '';
            
            // 判断是否同级
            const isSameLevel = dragNode.parent_id === dropNode.parent_id;
            if (isSameLevel) {
              // 同级：计算精确位置
              const siblings = getSiblings([], newCategoryId);
              const targetIndex = siblings.findIndex(s => s.id === dropNode.id);
              
              if (targetIndex !== -1) {
                // 根据 dropPosition 决定放在目标前面还是后面
                if (dropPosition === -1) {
                  // 放在目标上面
                  newOrder = dropNode.order_index;
                } else {
                  // 放在目标下面
                  newOrder = dropNode.order_index + 1;
                }
              }
            } else {
              // 不同级：不指定顺序
              newOrder = undefined;
            }
          } else {
            // 放到分类旁边 - 视为放入该分类（不同级）
            newCategoryId = dropNode.id;
            newOrder = undefined;
          }
        }

        // 更新文章的分类
        const updateData: any = { category_id: newCategoryId };
        if (newOrder !== undefined) {
          updateData.order_in_category = newOrder;
        }

        // 从 localStorage 获取 token
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          message.error('未登录，请先登录');
          return;
        }

        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        console.log('文章移动响应:', { status: response.status, result });
        
        if (result.success) {
          message.success(newOrder !== undefined ? '章节排序成功' : '章节移动成功');
          setHasChanges(true); // 标记有改动
          await loadChapterTree();
        } else {
          if (response.status === 401) {
            message.error('您还未登录或登录已过期，请刷新页面后重新登录');
          } else {
            message.error(result.error || '移动失败');
          }
        }
      }

      // 处理分类拖拽
      else if (dragNode.node_type === 'category') {
        const categoryId = dragNode.id;
        let newParentId: string | null;
        let newOrderIndex: number | undefined;

        if (!info.dropToGap) {
          // 放到分类内部，成为子分类（不同级）
          if (!isDropOnCategory) {
            message.warning('目录只能放到其他目录下');
            return;
          }
          if (dropNode.id === categoryId) {
            message.warning('不能将目录移动到自己下面');
            return;
          }
          newParentId = dropNode.id;
          newOrderIndex = undefined; // 不同级，不指定顺序
        } else {
          // 放到节点之间
          if (dropNode.node_type === 'article') {
            // 在混排情况下，目录可以拖到文章之间
            // 使用文章的父分类作为目标父节点
            newParentId = dropNode.parent_id || bookRootId || '';
            
            // 判断是否同级
            const isSameLevel = dragNode.parent_id === newParentId;
            if (isSameLevel) {
              // 同级：使用文章的顺序
              if (dropPosition === -1) {
                newOrderIndex = dropNode.order_index;
              } else {
                newOrderIndex = dropNode.order_index + 1;
              }
            } else {
              // 不同级：不指定顺序
              newOrderIndex = undefined;
            }
          } else {
            // 放到分类之间
            newParentId = dropNode.parent_id;

            // 判断是否同级
            const isSameLevel = dragNode.parent_id === dropNode.parent_id;
            if (isSameLevel) {
              // 同级：计算精确位置
              if (dropPosition === -1) {
                // 放在目标上面
                newOrderIndex = dropNode.order_index;
              } else {
                // 放在目标下面
                newOrderIndex = dropNode.order_index + 1;
              }
            } else {
              // 不同级：不指定顺序
              newOrderIndex = undefined;
            }
          }
        }

        // 从 localStorage 获取 token（分类移动也可能需要权限）
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // 使用专门的移动 API
        const response = await fetch(`/api/categories/${categoryId}/move`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            new_parent_id: newParentId,
            new_order_index: newOrderIndex !== undefined ? newOrderIndex : 0,
          }),
        });

        const result = await response.json();
        if (result.success) {
          message.success(newOrderIndex !== undefined ? '目录排序成功' : '目录移动成功');
          setHasChanges(true); // 标记有改动
          await loadChapterTree();
        } else {
          message.error(result.error || '移动失败');
        }
      }

    } catch (error) {
      console.error('移动失败:', error);
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
      <FloatButton
        icon={<UnorderedListOutlined />}
        tooltip="章节管理"
        onClick={showModal}
      />

      <Modal
        title="章节管理"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={700}
        styles={{ 
          body: { 
            minHeight: '400px', 
            maxHeight: '70vh', 
            overflow: 'auto' 
          } 
        }}
      >
        <div style={{ padding: '20px 0' }}>
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
            <Tree
              draggable
              blockNode
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys)}
              onDrop={onDrop}
              treeData={treeData}
              style={{
                background: '#fafafa',
                padding: '16px',
                borderRadius: '8px',
              }}
            />
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
        onOk={handleConfirmAddCategory}
        onCancel={() => {
          setNewCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        okText="确认"
        cancelText="取消"
      >
        <div style={{ padding: '20px 0' }}>
          <Input
            placeholder="请输入目录名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleConfirmAddCategory}
            maxLength={50}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}


