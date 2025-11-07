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
}

const ControlModule: React.FC<ControlModuleProps> = ({ title, children, initialPosition, zIndex, onClose, onPositionChange, onFocus, wide = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(initialPosition);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Use a ref to store the latest onPositionChange callback
  // This prevents the mouseup handler from having a stale closure over it
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!nodeRef.current || !nodeRef.current.parentElement) return;

    const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
    const newPos = {
      x: e.clientX - parentRect.left - dragOffsetRef.current.x,
      y: e.clientY - parentRect.top - dragOffsetRef.current.y,
    };
    
    positionRef.current = newPos;
    nodeRef.current.style.transform = `translate(${newPos.x}px, ${newPos.y}px)`;
  }, []);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onPositionChangeRef.current(positionRef.current);
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent dragging when clicking on form elements inside the panel
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button, input, label, textarea, select')) {
        return;
    }
    
    setIsDragging(true);
    onFocus();

    const rect = nodeRef.current!.getBoundingClientRect();
    const parentRect = nodeRef.current!.parentElement!.getBoundingClientRect();

    dragOffsetRef.current = {
      x: e.clientX - rect.left + parentRect.left,
      y: e.clientY - rect.top + parentRect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  useEffect(() => {
    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Set initial position using transform
  useEffect(() => {
    if (nodeRef.current && !isDragging) {
        positionRef.current = initialPosition;
        nodeRef.current.style.transform = `translate(${initialPosition.x}px, ${initialPosition.y}px)`;
    }
  }, [initialPosition]);

  return (
    <div
      ref={nodeRef}
      className={`absolute top-0 left-0 bg-gray-50/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-2xl flex flex-col pointer-events-auto ${wide ? 'w-96' : 'w-56'}`}
      style={{
        zIndex: zIndex,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={onFocus}
    >
      <div
        className="flex items-center justify-between bg-gray-200/80 px-3 py-1 rounded-t-lg border-b border-gray-300"
        style={{ cursor: 'grab' }}
        onMouseDown={handleMouseDown}
      >
        <h2 className="font-bold text-sm text-gray-700 select-none">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-red-600 hover:bg-red-200 rounded-full p-0.5 transition-colors"
          aria-label={`Close ${title} panel`}
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {children}
      </div>
    </div>
  );
};

export default ControlModule;
