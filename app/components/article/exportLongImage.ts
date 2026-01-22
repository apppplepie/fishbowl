// client-side helper (dynamic import) that uses html2canvas in the browser to export article node.
// 导出页面为长图
export async function exportArticleAsImage(articleId: string, articleTitle?: string): Promise<string> {
  console.log('开始导出文章图片:', articleId, articleTitle);

  // 1. 进入导出模式
  const exportState = enterExportMode();

  try {
    // 等待初始渲染
    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. 等待页面稳定
    await waitForLayoutStable();

    // 3. 离屏渲染
    const contentClone = cloneReadableContent();
    const hiddenRoot = createHiddenRoot();
    mount(contentClone, hiddenRoot);

    // 4. 测量内容尺寸
    const size = measureContentSize(hiddenRoot);

    // 5. 渲染为图片
    const imageData = await renderToImage(hiddenRoot, size);

    // 6. 清理现场
    cleanup(hiddenRoot, exportState);

    // 获取文章标题作为文件名并下载
    let filename = `article-${articleId}.png`;
    if (articleTitle) {
      const cleanTitle = articleTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 50);
      filename = `${cleanTitle}.png`;
    }

    const a = document.createElement('a');
    a.href = imageData;
    a.download = filename;
    a.click();

    return imageData;
  } catch (error) {
    // 确保清理现场
    exitExportMode(exportState);
    throw error;
  }
}

// 进入导出模式（更安全的实现）
const enterExportMode = () => {
  const originalState: any = {
    bodyCursor: document.body.style.cursor,
    bodyUserSelect: document.body.style.userSelect,
    animationsDisabled: false,
    hiddenElements: [] as Array<{ el: HTMLElement; originalDisplay: string | null }>,
    styleElementId: 'export-mode-disable-animations',
  };

  // 1) 隐藏浮动按钮（并记录原始 display）
  const floatButtons = document.querySelectorAll<HTMLElement>('.ant-float-btn, .ant-float-btn-group');
  floatButtons.forEach(el => {
    const originalDisplay = el.style.display ?? getComputedStyle(el).display;
    originalState.hiddenElements.push({ el, originalDisplay });
    el.style.display = 'none';
  });

  // 2) 禁用光标选择等
  document.body.style.cursor = 'default';
  document.body.style.userSelect = 'none';

  // 3) 通过给 body 添加类并插入带 id 的 style 来禁用动画（可精确移除）
  const existing = document.getElementById(originalState.styleElementId);
  if (!existing) {
    const style = document.createElement('style');
    style.id = originalState.styleElementId;
    // 作用域化：只在 .export-mode 下禁用动画/transition
    style.textContent = `
      .export-mode *, .export-mode *::before, .export-mode *::after {
        animation: none !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
    originalState.animationsDisabled = true;
  } else {
    originalState.animationsDisabled = true;
  }

  // 4) 添加类
  document.body.classList.add('export-mode');

  return originalState;
};

// 退出导出模式（对应恢复）
const exitExportMode = (originalState: any) => {
  if (!originalState) return;

  // 恢复被隐藏元素的 display（使用保存的原始值）
  if (originalState.hiddenElements && Array.isArray(originalState.hiddenElements)) {
    originalState.hiddenElements.forEach((item: { el: HTMLElement; originalDisplay: string | null }) => {
      try {
        if (item.originalDisplay == null || item.originalDisplay === 'none') {
          // 如果原来没有内联 display，我们清空 inline style，交由 stylesheet 控制
          item.el.style.display = '';
        } else {
          item.el.style.display = item.originalDisplay;
        }
      } catch (err) {
        // 忽略恢复错误，继续恢复其他元素
        console.warn('恢复元素 display 失败', item.el, err);
      }
    });
  }

  // 恢复光标和文字选择
  document.body.style.cursor = originalState.bodyCursor ?? '';
  document.body.style.userSelect = originalState.bodyUserSelect ?? '';

  // 移除 class 和 style（仅移除我们自己插入的 style，通过 id 精确删除）
  document.body.classList.remove('export-mode');
  if (originalState.animationsDisabled) {
    const styleEl = document.getElementById(originalState.styleElementId);
    if (styleEl) styleEl.remove();
  }
};


// 等待页面布局稳定
const waitForLayoutStable = (): Promise<void> => {
  return new Promise((resolve) => {
    let stableFrames = 0;
    const requiredStableFrames = 10; // 等待10帧
    let lastHeight = 0;
    let rafId: number | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;

    const cleanup = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const checkStability = () => {
      // 如果已经 resolve，不再继续执行
      if (isResolved) {
        return;
      }

      const currentHeight = document.documentElement.scrollHeight;

      if (currentHeight === lastHeight) {
        stableFrames++;
        if (stableFrames >= requiredStableFrames) {
          isResolved = true;
          cleanup();
          resolve();
          return;
        }
      } else {
        stableFrames = 0;
        lastHeight = currentHeight;
      }

      // 保存 rafId 以便清理
      rafId = requestAnimationFrame(checkStability);
    };

    // 延迟开始检查，给初始渲染一些时间
    timeoutId = setTimeout(() => {
      if (isResolved) {
        return;
      }
      lastHeight = document.documentElement.scrollHeight;
      rafId = requestAnimationFrame(checkStability);
    }, 100);
  });
};

// 克隆可读内容
const cloneReadableContent = (): HTMLElement => {
  console.log('开始克隆内容区域');

  // 找到主要内容区域
  const contentElement = document.querySelector('[data-content-area]') as HTMLElement;
  if (!contentElement) {
    throw new Error('找不到内容区域');
  }

  // 深度克隆内容
  const clone = contentElement.cloneNode(true) as HTMLElement;
  console.log('克隆了内容区域，包含', clone.children.length, '个子元素');

  // 移除不需要的元素
  const elementsToRemove = clone.querySelectorAll('[data-export-hide], .ant-float-btn, .ant-float-btn-group');
  console.log('移除', elementsToRemove.length, '个不需要的元素');
  elementsToRemove.forEach(el => el.remove());

  // 确保克隆的元素有正确的样式
  clone.style.width = '100%';
  clone.style.maxWidth = '800px';
  clone.style.margin = '0 auto';
  clone.style.padding = '40px 20px';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  clone.style.backdropFilter = 'blur(8px)';
  clone.style.borderRadius = '12px';
  clone.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
  clone.style.lineHeight = '1.8';
  clone.style.fontSize = '16px';
  clone.style.color = '#333';

  return clone;
};

// 创建隐藏根容器
const createHiddenRoot = (): HTMLElement => {
  const root = document.createElement('div');
  root.style.position = 'absolute';
  root.style.left = '-9999px';
  root.style.top = '-9999px';
  root.style.width = '800px'; // 固定宽度
  root.style.minHeight = '100px'; // 最小高度
  root.style.backgroundColor = '#ffffff';
  root.style.fontFamily = 'Arial, sans-serif';
  root.style.lineHeight = '1.6';
  root.style.color = '#333';
  root.style.padding = '0'; // 移除内边距，让内容控制
  root.style.boxSizing = 'border-box';
  root.style.pointerEvents = 'none';
  root.style.fontSize = '16px';
  root.style.overflow = 'visible'; // 确保内容可见

  document.body.appendChild(root);
  return root;
};

// 挂载克隆内容到隐藏容器
const mount = async (contentClone: HTMLElement, hiddenRoot: HTMLElement) => {
  console.log('挂载克隆内容到隐藏容器');
  hiddenRoot.appendChild(contentClone);

  // 等待图片加载
  const images = contentClone.querySelectorAll('img');
  if (images.length > 0) {
    console.log(`等待 ${images.length} 张图片加载`);
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        // 超时保护
        setTimeout(resolve, 5000);
      });
    }));
  }

  // 等待内容渲染
  await new Promise(resolve => setTimeout(resolve, 200));

  // 强制重新计算布局
  hiddenRoot.offsetHeight;
  contentClone.offsetHeight;

  console.log('内容挂载完成，尺寸:', hiddenRoot.offsetWidth, 'x', hiddenRoot.offsetHeight);
};

// 测量内容尺寸
const measureContentSize = (hiddenRoot: HTMLElement) => {
  const rect = hiddenRoot.getBoundingClientRect();
  return {
    width: 800, // 固定宽度
    height: rect.height,
  };
};

// 渲染为图片
const renderToImage = async (hiddenRoot: HTMLElement, size: { width: number; height: number }): Promise<string> => {
  try {
    // 使用html2canvas库进行渲染
    const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }));
    if (!html2canvas) {
      throw new Error('请先安装并允许加载 html2canvas（npm install html2canvas）');
    }

    const canvas = await (html2canvas as any)(hiddenRoot, {
      width: size.width,
      height: size.height,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 1,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: size.width,
      windowHeight: size.height,
    });

    return canvas.toDataURL('image/png', 0.95);
  } catch (error) {
    console.error('html2canvas渲染失败:', error);
    throw new Error('图片渲染失败');
  }
};

// 清理现场
const cleanup = (hiddenRoot: HTMLElement, exportState: any) => {
  // 移除隐藏容器
  if (hiddenRoot && hiddenRoot.parentNode) {
    hiddenRoot.parentNode.removeChild(hiddenRoot);
  }

  // 退出导出模式
  exitExportMode(exportState);
};
