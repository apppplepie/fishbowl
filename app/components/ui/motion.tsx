'use client';

import React from 'react';

// The login panel only needs mount/unmount and CSS transitions. This tiny shim
// preserves its markup without shipping a general-purpose animation runtime.
const ignored = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
  'whileTap', 'layout', 'layoutId', 'drag', 'dragConstraints',
]);

function motionElement(tag: keyof React.JSX.IntrinsicElements) {
  return React.forwardRef<HTMLElement, Record<string, any>>(function LiteMotion(props, ref) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!ignored.has(key)) clean[key] = value;
    }
    return React.createElement(tag, { ...clean, ref });
  });
}

export const motion = new Proxy({}, {
  get: (_target, tag: string) => motionElement(tag as keyof React.JSX.IntrinsicElements),
}) as Record<keyof React.JSX.IntrinsicElements, React.ComponentType<any>>;

export function AnimatePresence({ children }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}
