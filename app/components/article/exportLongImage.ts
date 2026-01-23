export async function exportArticleAsImage(articleId: string, articleTitle?: string) {
  try {
    const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }));
    if (!html2canvas) return;

    const element = document.querySelector('[data-content-area]') as HTMLElement;
    if (!element) return;

    // 获取当前滚动高度，防止截图不全
    const scrollHeight = element.scrollHeight;
    const scrollWidth = element.scrollWidth;

    const canvas = await (html2canvas as any)(element, {
      scale: 2, 
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff', // 确保底层是纯白，不透明
      
      // 【核心修复：onclone】
      // documentClone 是 html2canvas 在内存中克隆出来的虚拟文档
      onclone: (documentClone: Document) => {
        const clonedElement = documentClone.querySelector('[data-content-area]') as HTMLElement;
        if (clonedElement) {
          // 1. 强制去除透明度，解决“淡淡的”问题
          clonedElement.style.opacity = '1';
          clonedElement.style.filter = 'none';
          
          // 2. 彻底替换 html2canvas 不支持的 backdrop-filter
          // 将半透明模糊背景替换为纯色背景，否则会变成灰白色块
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.backdropFilter = 'none';
          
          // 3. 遍历所有子元素，确保没有正在进行的淡入动画
          const allChildren = clonedElement.querySelectorAll('*');
          allChildren.forEach((child) => {
            const c = child as HTMLElement;
            c.style.opacity = '1'; // 强制全显
            c.style.transition = 'none'; // 停止所有过渡
            c.style.animation = 'none';   // 停止所有动画
          });
        }
      },

      ignoreElements: (el: Element) => {
        return el.hasAttribute('data-export-hide') || 
               el.classList.contains('ant-float-btn') || 
               el.classList.contains('ant-float-btn-group');
      },
      
      width: scrollWidth,
      height: scrollHeight,
      windowWidth: scrollWidth,
      windowHeight: scrollHeight,
    });

    // 下载逻辑...
    const url = canvas.toDataURL('image/png', 1.0); // 1.0 表示最高质量
    const filename = articleTitle ? `${articleTitle.substring(0, 30)}.png` : `article-${articleId}.png`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

  } catch (e) {
    console.error('截图失败:', e);
  }
}