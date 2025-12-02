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
      const response = await fetch('/api/categories?format=tree');
      const data = await response.json();

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
   * 转换为 TreeSelect 需要的数据格式
   */
  const convertToTreeData = (categories: Category[]): any[] => {
    return categories.map(cat => ({
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
      children: cat.children && cat.children.length > 0 
        ? convertToTreeData(cat.children)
        : undefined,
    }));
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
      // 生成新的分类ID
      const newId = `cat_${Date.now()}`;

      // 获取父分类下的子分类数量，用于设置 order_index
      const parentCategory = findCategoryById(categories, parentCategoryId);
      const orderIndex = parentCategory?.children?.length || 0;

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          name: newCategoryName,
          parent_id: parentCategoryId,
          order_index: orderIndex + 1,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('分类创建成功');
        setNewCategoryModal(false);
        setNewCategoryName('');
        // 重新加载分类树
        loadCategories();
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

  return (
    <>
      <TreeSelect
        value={value}
        onChange={onChange}
        treeData={convertToTreeData(categories)}
        placeholder={placeholder}
        loading={loading}
        allowClear={allowClear}
        treeDefaultExpandAll
        showSearch
        treeNodeFilterProp="title"
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

