import React, { useEffect, useMemo, useState } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
  contentClassName?: string;
  closeOnOverlay?: boolean;
}

const getViewport = () => {
  const vv = window.visualViewport;
  return {
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
  };
};

export default function ResponsiveModal({
  open,
  onClose,
  children,
  size = 'lg',
  className = '',
  contentClassName = '',
  closeOnOverlay = true,
}: ResponsiveModalProps) {
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined'
      ? getViewport()
      : { width: 1280, height: 720 }
  );

  useEffect(() => {
    if (!open) return;

    const updateViewport = () => setViewport(getViewport());

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const modalWidth = useMemo(() => {
    const map = {
      sm: 420,
      md: 640,
      lg: 960,
      xl: 1280,
      full: 1600,
    };
    return map[size];
  }, [size]);

  const isMobile = viewport.width < 768;
  const padding = isMobile ? 12 : 20;
  const borderRadius = isMobile ? 20 : 32;

  const maxWidth = Math.min(modalWidth, viewport.width - padding * 2);
  const maxHeight = viewport.height - padding * 2;

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center ${className}`}
      style={{ padding }}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`bg-white w-full shadow-2xl overflow-hidden flex flex-col ${contentClassName}`}
        style={{
          maxWidth,
          maxHeight,
          borderRadius,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
