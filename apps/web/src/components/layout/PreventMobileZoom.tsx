'use client';

import { useEffect } from 'react';

/**
 * iOS Safari often ignores viewport user-scalable=no; block pinch/double-tap zoom in the app shell.
 */
export function PreventMobileZoom() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      );
    }

    const blockGesture = (event: Event) => {
      event.preventDefault();
    };

    const blockPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const blockDoubleTap = (() => {
      let lastTouchEnd = 0;
      return (event: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      };
    })();

    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    document.addEventListener('touchmove', blockPinch, { passive: false });
    document.addEventListener('touchend', blockDoubleTap, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('gestureend', blockGesture);
      document.removeEventListener('touchmove', blockPinch);
      document.removeEventListener('touchend', blockDoubleTap);
    };
  }, []);

  return null;
}
