// client-side helper (dynamic import) that uses html2canvas in the browser to export article node.
export async function exportArticleAsImage(articleId: string) {
  try {
    const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }));
    if (!html2canvas) {
      alert('请先安装并允许加载 html2canvas（npm install html2canvas）');
      return;
    }
    const node = document.querySelector('article');
    if (!node) {
      alert('未找到 article 节点，无法导出');
      return;
    }
    const canvas = await (html2canvas as any)(node as HTMLElement, { scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-${articleId}.png`;
    a.click();
  } catch (e) {
    console.error(e);
    alert('导出失败');
  }
}
