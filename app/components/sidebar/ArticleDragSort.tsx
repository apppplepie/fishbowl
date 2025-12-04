/**
 * 文章分类调整弹窗
 * 使用树形拖拽组件调整文章和分类的层级结构
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tree, message, Spin } from 'antd';
import type { TreeDataNode, TreeProps } from 'antd';

interface ArticleCategoryModalProps {
  open: boolean;
  articleId?: string; // 改为可选，如果不传则是纯分类管理模式
  articleTitle?: string;
  currentCategoryId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
}

interface Article {
  id: string;
  title: string;
  category_id: string | null;
  order_in_category: number;
}

export default function ArticleCategoryModal({
  open,
  articleId,
  articleTitle,
  currentCategoryId,
  onClose,
  onSuccess,
}: ArticleCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // 加载分类树和文章数据
  useEffect(() => {
    if (open) {
      loadCategoryTree();
    }
  }, [open]);

  /**
   * 加载分类树和文章
   */
  const loadCategoryTree = async () => {
    try {
      setLoading(true);

      // 1. 获取所有分类
      const categoriesRes = await fetch('/api/categories?format=tree');
      const categoriesData = await categoriesRes.json();
      
      if (!categoriesData.success) {
        throw new Error('获取分类失败');
      }

      // 2. 获取所有文章（包含分类信息）
      const articlesRes = await fetch('/api/articles?status=published&limit=1000');
      const articlesData = await articlesRes.json();
      
      if (!articlesData.success) {
        throw new Error('获取文章失败');
      }

      // 3. 构建树形数据（分类 + 文章）
      const tree = buildTreeWithArticles(
        categoriesData.categories,
        articlesData.articles,
        articleId || ''
      );

      setTreeData(tree);

      // 4. 展开当前文章所在的分类
      if (currentCategoryId) {
        setExpandedKeys([currentCategoryId]);
      }

    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 构建包含文章的树形数据
   */
  const buildTreeWithArticles = (
    categories: Category[],
    articles: Article[],
    currentArticleId: string
  ): TreeDataNode[] => {
    const buildNode = (category: Category): TreeDataNode => {
      // 获取该分类下的文章
      const categoryArticles = articles
        .filter(a => a.category_id === category.id && a.id !== currentArticleId)
        .sort((a, b) => a.order_in_category - b.order_in_category);

      // 构建文章节点
      const articleNodes: TreeDataNode[] = categoryArticles.map(article => ({
        key: `article_${article.id}`,
        title: `📄 ${article.title}`,
        isLeaf: true,
        // @ts-ignore - data is a custom property for storing metadata
        data: { type: 'article', ...article },
      }));

      // 当前文章节点（如果有）
      if (currentArticleId && category.id === currentCategoryId) {
        articleNodes.push({
          key: `article_${currentArticleId}`,
          title: `📄 ${articleTitle} (当前)`,
          isLeaf: true,
          className: 'current-article',
          style: { background: '#e6f7ff', fontWeight: 'bold' },
          // @ts-ignore - data is a custom property for storing metadata
          data: { type: 'article', id: currentArticleId },
        });
      }

      // 子分类节点
      const childrenNodes: TreeDataNode[] = category.children
        ? category.children.map(child => buildNode(child))
        : [];

      return {
        key: category.id,
        title: `📁 ${category.name}`,
        children: [...childrenNodes, ...articleNodes].length > 0 
          ? [...childrenNodes, ...articleNodes] 
          : undefined,
        // @ts-ignore - data is a custom property for storing metadata
        data: { type: 'category', ...category },
      };
    };

    return categories.map(cat => buildNode(cat));
  };

  /**
   * 处理拖拽放置
   */
  const onDrop: TreeProps['onDrop'] = async (info) => {
    const dropKey = info.node.key as string;
    const dragKey = info.dragNode.key as string;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    console.log('拖拽信息:', {
      dragKey,
      dropKey,
      dropPosition,
      dropToGap: info.dropToGap,
    });

    try {
      const isDraggingArticle = dragKey.startsWith('article_');
      const isDraggingCategory = !isDraggingArticle;
      const isDropOnCategory = !dropKey.startsWith('article_');

      // 处理文章拖拽
      if (isDraggingArticle) {
        const articleId = dragKey.replace('article_', '');
        let newCategoryId: string;
        let newOrder: number = 0;

        if (!info.dropToGap) {
          // 放到节点内部
          if (!isDropOnCategory) {
            message.warning('不能放置到文章内部');
            return;
          }
          newCategoryId = dropKey;
          newOrder = 0;
        } else {
          // 放到节点之间
          if (dropKey.startsWith('article_')) {
            // 放到文章旁边
            const dropArticle = (info.node as any).data;
            newCategoryId = dropArticle.category_id;
            newOrder = dropArticle.order_in_category + (dropPosition === 1 ? 1 : 0);
          } else {
            // 放到分类旁边 - 视为放入该分类
            newCategoryId = dropKey;
            newOrder = 0;
          }
        }

        // 更新文章
        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: newCategoryId,
            order_in_category: newOrder,
          }),
        });

        const result = await response.json();
        if (result.success) {
          message.success('文章位置调整成功');
          await loadCategoryTree();
        } else {
          message.error(result.error || '调整失败');
        }
      }
      
      // 处理分类拖拽
      else if (isDraggingCategory) {
        const categoryId = dragKey;
        let newParentId: string | null = null;
        let newOrderIndex: number = 0;

        if (!info.dropToGap) {
          // 放到分类内部，成为子分类
          if (!isDropOnCategory) {
            message.warning('分类只能放到其他分类下');
            return;
          }
          // 检查是否拖到自己或自己的子分类下（避免循环）
          if (dropKey === categoryId) {
            message.warning('不能将分类移动到自己下面');
            return;
          }
          newParentId = dropKey;
          newOrderIndex = 0;
        } else {
          // 放到节点之间
          if (dropKey.startsWith('article_')) {
            message.warning('分类只能放到其他分类之间');
            return;
          }
          
          // 获取目标分类的父级
          const dropCategory = (info.node as any).data;
          newParentId = dropCategory.parent_id;
          newOrderIndex = dropCategory.order_index + (dropPosition === 1 ? 1 : 0);
        }

        // 更新分类
        const response = await fetch(`/api/categories/${categoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: newParentId,
            order_index: newOrderIndex,
          }),
        });

        const result = await response.json();
        if (result.success) {
          message.success('分类层级调整成功');
          await loadCategoryTree();
        } else {
          message.error(result.error || '调整失败');
        }
      }

    } catch (error) {
      console.error('调整失败:', error);
      message.error('调整失败');
    }
  };

  return (
    <Modal
      title={articleTitle ? `调整章节 - ${articleTitle}` : '管理分类结构'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{ body: { minHeight: '400px', maxHeight: '70vh', overflow: 'auto' } }}
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          💡 提示：拖动分类或文章调整结构
          {articleTitle && (
            <>
              <br />
              <strong style={{ color: '#1890ff' }}>当前文章：{articleTitle}</strong>
            </>
          )}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
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
        )}
      </div>

      <style jsx global>{`
        .current-article .ant-tree-node-content-wrapper {
          background: #e6f7ff !important;
          font-weight: bold !important;
        }
      `}</style>
    </Modal>
  );
}

