'use client';
import React, { useEffect } from 'react';

export default function ClientHeaderSetter({ articleId }: { articleId: string }) {
  useEffect(() => {
    // If your layout exposes global functions to set left content / header, call them here.
    // e.g. window.__SET_LEFT_CONTENT && window.__SET_LEFT_CONTENT('<div>...</div>');
    if ('scrollRestoration' in history) {
      (history as any).scrollRestoration = 'auto';
    }
    return () => {
      // cleanup if needed
    };
  }, [articleId]);

  return null;
}
