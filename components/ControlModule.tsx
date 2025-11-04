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
}

const ControlModule: React.FC<ControlModuleProps> = ({ title, children, initialPosition, zIndex, onClose, onPositionChange, onFocus }) => {
  const [position, setPosition] = useState(initialPosition);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!nodeRef.current) return;
    onFocus();
    const rect = nodeRef.current.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !nodeRef.current?.parentElement) return;
    const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
    const newPos = {
      x: e.clientX - parentRect.left - dragRef.current.offsetX,
      y: e.clientY - parentRect.top - dragRef.current.offsetY,
    };
    setPosition(newPos);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
        onPositionChange(position);
    }
    dragRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [position, onPositionChange, handleMouseMove]);
  
  useEffect(() => {
    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={nodeRef}
      className="absolute bg-gray-50/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-2xl flex flex-col w-56"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: zIndex,
        cursor: dragRef.current ? 'grabbing' : 'default',
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
      <div className="p-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default ControlModule;
