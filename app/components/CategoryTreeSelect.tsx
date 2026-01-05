/**
 * 分类树选择器组件
 * 支持选择分类、新建子分类
 * 可以指定根分类来限定显示范围
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TreeSelect, Input, Modal, message, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TreeSelectProps } from 'antd';
import { apiGetJson, apiPostJson } from '@/lib/apiClient';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  children?: Category[];
}

interface CategoryTreeSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  rootCategoryId?: string; // 指定根分类ID，只显示该分类及其子分类
  placeholder?: string;
  allowClear?: boolean;
  style?: React.CSSProperties;
}

export default function CategoryTreeSelect({
  value,
  onChange,
  rootCategoryId,
  placeholder = '请选择分类',
  allowClear = true,
  style,
}: CategoryTreeSelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [parentCategoryName, setParentCategoryName] = useState<string>('');

  // 加载分类树
  useEffect(() => {
    loadCategories();
  }, [rootCategoryId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiGetJson<{ success: boolean; categories?: Category[] }>('/api/categories?format=tree', { requiresAuth: false });

      if (data.success) {
        let tree = data.categories;

        // 如果指定了根分类，只显示该分类及其子分类
        if (rootCategoryId) {
          tree = findSubTree(tree, rootCategoryId);
        }

        setCategories(tree);
      } else {
        message.error('加载分类失败');
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      message.error('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 查找指定ID的子树
   */
  const findSubTree = (tree: Category[], targetId: string): Category[] => {
    for (const node of tree) {
      if (node.id === targetId) {
        // 找到目标节点，返回其子节点作为新的根节点
        return node.children || [];
      }
      if (node.children) {
        const found = findSubTree(node.children, targetId);
        if (found.length > 0) {
          return found;
        }
      }
    }
    return tree; // 如果没找到，返回整个树
  };

  /**
   * 获取分类的完整路径（如：绘画作品/角色设计）
   */
  const getCategoryPath = (categoryId: string, tree: Category[]): string => {
    const findPath = (id: string, categories: Category[], path: string[] = []): string[] | null => {
      for (const cat of categories) {
        if (cat.id === id) {
          return [...path, cat.name];
        }
        if (cat.children) {
          const found = findPath(id, cat.children, [...path, cat.name]);
          if (found) return found;
        }
      }
      return null;
    };
    
    const path = findPath(categoryId, tree);
    return path ? path.join(' / ') : '';
  };

  /**
   * 构建包含路径的树数据
   */
  const buildTreeDataWithPath = (categories: Category[], parentPath: string[] = []): any[] => {
    return categories.map(cat => {
      const currentPath = [...parentPath, cat.name];
      const fullPath = currentPath.join(' / ');
      
      return {
        title: (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: '100%',
          }}>
            <span>📁 {cat.name}</span>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleAddCategory(cat.id, cat.name);
              }}
              style={{ 
                marginLeft: '8px',
                opacity: 0.6,
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            />
          </div>
        ),
        value: cat.id,
        key: cat.id,
        label: `📁 ${fullPath}`, // 用于选中时显示
        children: cat.children && cat.children.length > 0 
          ? buildTreeDataWithPath(cat.children, currentPath)
          : undefined,
      };
    });
  };

  /**
   * 打开新建分类弹窗
   */
  const handleAddCategory = (parentId: string, parentName: string) => {
    setParentCategoryId(parentId);
    setParentCategoryName(parentName);
    setNewCategoryName('');
    setNewCategoryModal(true);
  };

  /**
   * 创建新分类
   */
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      message.warning('请输入分类名称');
      return;
    }

    try {
      // Token 在 HttpOnly cookie 中，不需要手动获取

      // 生成新的分类ID
      const newId = `cat_${Date.now()}`;

      // 计算新的 order_index：找到父分类下最大的 order 值 + 1
      // 需要同时考虑子分类的 order_index 和文章的 order_index
      let orderIndex = 0;

      try {

        // 1. 查询父分类下的所有直接子分类，获取最大的 order_index
        let maxCategoryOrder = 0;
        try {
          const categoryData = await apiGetJson<{ success: boolean; tree?: { children?: any[] } }>(`/api/categories/${parentCategoryId}/tree-with-articles`);
          if (categoryData.success && categoryData.tree && categoryData.tree.children) {
            // 只查找直接子分类的 order_index
            for (const child of categoryData.tree.children) {
              if (child.node_type === 'category' && child.order_index > maxCategoryOrder) {
                maxCategoryOrder = child.order_index;
              }
            }
          }
        } catch (error) {
          console.warn('获取子分类排序信息失败:', error);
        }

        // 2. 查询父分类下的所有文章，获取最大的 order_index
        let maxArticleOrder = 0;
        try {
          const articleData = await apiGetJson<{ success: boolean; articles?: any[] }>(`/api/articles?category=${parentCategoryId}&limit=1000&sort=order_desc`);
          if (articleData.articles && articleData.articles.length > 0) {
            maxArticleOrder = Math.max(
              ...articleData.articles.map((article: any) => article.order_index || 0)
            );
          }
        } catch (error) {
          console.warn('获取文章排序信息失败:', error);
        }

        // 3. 取两者中的最大值 + 1
        orderIndex = Math.max(maxCategoryOrder, maxArticleOrder) + 1;
      } catch (error) {
        console.warn('获取排序信息失败，使用默认排序:', error);
        // 降级方案：使用子分类数量 + 1
        const parentCategory = findCategoryById(categories, parentCategoryId);
        orderIndex = (parentCategory?.children?.length || 0) + 1;
      }

      const result = await apiPostJson<{ success: boolean; error?: string }>('/api/categories', {
        id: newId,
        name: newCategoryName,
        parent_id: parentCategoryId,
        order_index: orderIndex,
      });

      if (result.success) {
        message.success('分类创建成功');
        setNewCategoryModal(false);
        setNewCategoryName('');
        // 重新加载分类树
        loadCategories();
        // 触发 onChange 回调，选中新创建的分类
        if (onChange) {
          onChange(newId);
        }
      } else {
        message.error(result.error || '创建失败');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      message.error('创建失败');
    }
  };

  /**
   * 查找指定ID的分类节点
   */
  const findCategoryById = (tree: Category[], id: string): Category | null => {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findCategoryById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  /**
   * 处理选择变化，选择后自动关闭下拉框
   */
  const handleChange = (selectedValue: string) => {
    if (onChange) {
      onChange(selectedValue);
    }
    setOpen(false); // 选择后关闭下拉框
  };

  return (
    <>
      <TreeSelect
        value={value}
        onChange={handleChange}
        open={open}
        onOpenChange={setOpen}
        treeData={buildTreeDataWithPath(categories)}
        placeholder={placeholder}
        loading={loading}
        allowClear={allowClear}
        treeDefaultExpandAll
        showSearch
        treeNodeLabelProp="label" // 使用 label 作为选中后显示的文本（完整路径）
        style={{ width: '100%', ...style }}
        styles={{ 
          popup: { 
            root: { maxHeight: 400, overflow: 'auto' } 
          } 
        }}
        popupMatchSelectWidth={false}
      />

      {/* 新建分类弹窗 */}
      <Modal
        title={`在"${parentCategoryName}"下新建分类`}
        open={newCategoryModal}
        onOk={handleCreateCategory}
        onCancel={() => setNewCategoryModal(false)}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ padding: '20px 0' }}>
          <Input
            placeholder="请输入分类名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleCreateCategory}
            autoFocus
          />
          <p style={{ marginTop: '12px', color: '#999', fontSize: '12px' }}>
            提示：新分类将创建在"{parentCategoryName}"分类下
          </p>
        </div>
      </Modal>
    </>
  );
}

