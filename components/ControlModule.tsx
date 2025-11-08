import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CloseIcon } from './icons';

interface ControlModuleProps {
  title: string;
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
  zIndex: number;
  onClose: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onFocus: () => void;
  wide?: boolean;
  isFullScreen?: boolean;
  fullHeight?: boolean;
}

const ControlModule: React.FC<ControlModuleProps> = ({ title, children, initialPosition, zIndex, onClose, onPositionChange, onFocus, wide = false, isFullScreen = false, fullHeight = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(initialPosition);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const panelRectRef = useRef({ width: 0, height: 0 });

  // Approximate heights for menu and status bars based on Tailwind classes
  const bounds = { top: 40, bottom: 24 };

  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!nodeRef.current || !nodeRef.current.parentElement) return;

    const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
    let newPos = {
      x: e.clientX - parentRect.left - dragOffsetRef.current.x,
      y: e.clientY - parentRect.top - dragOffsetRef.current.y,
    };
    
    // Constrain dragging within the visible area (between menu and status bar)
    const panelWidth = panelRectRef.current.width;
    const panelHeight = panelRectRef.current.height;
    
    newPos.x = Math.max(0, Math.min(newPos.x, parentRect.width - panelWidth));
    newPos.y = Math.max(bounds.top, Math.min(newPos.y, parentRect.height - panelHeight - bounds.bottom));

    positionRef.current = newPos;
    nodeRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;
  }, [bounds]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Snapping logic
    if (nodeRef.current && nodeRef.current.parentElement) {
        const snapThreshold = 20;
        const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
        const panelWidth = panelRectRef.current.width;
        const panelHeight = panelRectRef.current.height;

        let finalPos = { ...positionRef.current };

        // Snap X (left/right edges)
        if (finalPos.x < snapThreshold) {
            finalPos.x = 0;
        } else if (finalPos.x + panelWidth > parentRect.width - snapThreshold) {
            finalPos.x = parentRect.width - panelWidth;
        }

        // Snap Y (top/bottom edges)
        if (finalPos.y < bounds.top + snapThreshold) {
            finalPos.y = bounds.top;
        } else if (finalPos.y + panelHeight > parentRect.height - bounds.bottom - snapThreshold) {
            finalPos.y = parentRect.height - panelHeight - bounds.bottom;
        }

        positionRef.current = finalPos;
        nodeRef.current.style.transform = `translate(${finalPos.x}px, ${finalPos.y}px)`;
        onPositionChangeRef.current(finalPos);
    } else {
        onPositionChangeRef.current(positionRef.current);
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, bounds]);

  const handleTitleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFullScreen || (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button, input, label, textarea, select'))) {
        return;
    }
    
    setIsDragging(true);
    onFocus();

    const rect = nodeRef.current!.getBoundingClientRect();
    const parentRect = nodeRef.current!.parentElement!.getBoundingClientRect();
    
    // Store panel dimensions on drag start
    panelRectRef.current = { width: rect.width, height: rect.height };

    dragOffsetRef.current = {
      x: e.clientX - rect.left + parentRect.left,
      y: e.clientY - rect.top + parentRect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (nodeRef.current && !isDragging && !isFullScreen) {
        positionRef.current = initialPosition;
        nodeRef.current.style.transform = `translate(${initialPosition.x}px, ${initialPosition.y}px)`;
    }
  }, [initialPosition, isDragging, isFullScreen]);

  const heightClass = fullHeight ? 'h-[calc(100vh-4rem)]' : 'h-[85vh]';

  const moduleClasses = isFullScreen
    ? 'fixed top-[2.5rem] bottom-[1.5rem] inset-x-0 w-auto h-auto bg-panel-back border-y border-panel-header flex flex-col pointer-events-auto rounded-none shadow-none'
    : `absolute top-0 left-0 bg-panel-back/90 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl flex flex-col pointer-events-auto ${wide ? 'w-[36rem]' : 'w-56'} ${heightClass} max-h-[calc(100vh-4rem)]`;

  const moduleStyle: React.CSSProperties = isFullScreen
    ? { zIndex }
    : {
        zIndex,
        transform: `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
      };

  return (
    <div
      ref={nodeRef}
      className={moduleClasses}
      style={moduleStyle}
      onMouseDown={isFullScreen ? undefined : onFocus}
    >
      <div
        className="flex items-center justify-between bg-panel-header/80 px-3 py-1 rounded-t-lg border-b border-panel-header flex-shrink-0"
        style={{ cursor: isFullScreen ? 'default' : 'grab' }}
        onMouseDown={handleTitleMouseDown}
      >
        <h2 className="font-bold text-xs text-condorito-brown select-none">{title}</h2>
        <button
          onClick={onClose}
          className="text-condorito-brown hover:text-condorito-red hover:bg-condorito-red/20 rounded-full p-0.5 transition-colors"
          aria-label={`Close ${title} panel`}
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 overflow-y-auto flex-grow">
        {children}
      </div>
    </div>
  );
};

export default ControlModule;