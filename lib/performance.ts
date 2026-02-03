export function preloadCriticalResources() {
    if (typeof window !== 'undefined') {
      // 预加载关键 CSS
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = '/critical.css';
      document.head.appendChild(link);
    }
  }
  
  export function deferNonCriticalJS() {
    if (typeof window !== 'undefined') {
      // 延迟非关键脚本
      const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-defer]');
      scripts.forEach((script) => {
        if (script.getAttribute('data-loaded') !== 'true') {
          const dataSrc = script.getAttribute('data-src');
          if (dataSrc) {
            script.src = dataSrc;
            script.setAttribute('data-loaded', 'true');
          }
        }
      });
    }
  }