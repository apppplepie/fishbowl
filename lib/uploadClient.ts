/**
 * 前端统一上传客户端
 * 编辑、发布、发布照片墙等所有图片上传都走 /api/upload，此处统一封装，避免多处重复实现。
 */

export interface UploadResult {
  success: boolean;
  url?: string;
  media_id?: string;
  error?: string;
}

/**
 * 带进度的图片上传（XHR，携带 HttpOnly cookie）
 */
export function uploadFileWithProgress(
  file: File | Blob,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);

    xhr.open('POST', '/api/upload', true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (ev: ProgressEvent) => {
      if (ev.lengthComputable) {
        const percent = Math.round((ev.loaded / ev.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const resp = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resp);
        } else {
          const err = (resp as any)?.error;
          resolve({ success: false, error: typeof err === 'string' ? err : (xhr.statusText || 'upload error') });
        }
      } catch {
        resolve({ success: false, error: 'parse error' });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: 'network error' });
    xhr.send(form);
  });
}
