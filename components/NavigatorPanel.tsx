import React, { useRef, useCallback, useEffect } from 'react';
import type { ComicPanelData, CharacterInstance } from '../types';

interface NavigatorPanelProps {
  viewBox: { x: number; y: number; width: number; height: number; };
  canvasWidth: number;
  canvasHeight: number;
  comicPanels: ComicPanelData[] | null;
  characters: CharacterInstance[];
  onViewBoxChange: (updater: (prev: { x: number; y: number; width: number; height: number; }) => { x: number; y: number; width: number; height: number; }) => void;
  onZoom: (factor: number) => void;
}

const NavigatorPanel: React.FC<NavigatorPanelProps> = ({ viewBox, canvasWidth, canvasHeight, comicPanels, characters, onViewBoxChange, onZoom }) => {
  const NAVIGATOR_WIDTH = 180;
  const NAVIGATOR_HEIGHT = (canvasHeight / canvasWidth) * NAVIGATOR_WIDTH;

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const newCenterX = (clickX / NAVIGATOR_WIDTH) * canvasWidth;
    const newCenterY = (clickY / NAVIGATOR_HEIGHT) * canvasHeight;
    
    onViewBoxChange(prev => ({
        ...prev,
        x: newCenterX - prev.width / 2,
        y: newCenterY - prev.height / 2,
    }));
  }, [canvasWidth, canvasHeight, NAVIGATOR_WIDTH, NAVIGATOR_HEIGHT, onViewBoxChange]);


  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const isComicMode = comicPanels !== null;

  return (
    <div className="absolute bottom-8 right-4 bg-panel-back/90 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl pointer-events-auto p-2 flex flex-col items-center gap-2 z-50">
      <svg
        ref={svgRef}
        width={NAVIGATOR_WIDTH}
        height={NAVIGATOR_HEIGHT}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="bg-panel-header rounded-md cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* Simplified content */}
        {isComicMode ? (
          comicPanels.map(panel => {
            const layout = panel.layout;
            return (
              <rect
                key={panel.id}
                x={(layout.x / 100) * canvasWidth}
                y={(layout.y / 100) * canvasHeight}
                width={(layout.width / 100) * canvasWidth}
                height={(layout.height / 100) * canvasHeight}
                fill="#FEFDFB"
                stroke="#D6A27E"
                strokeWidth={10}
              />
            );
          })
        ) : (
          characters.map((char, index) => (
             <circle 
                key={index} 
                cx={400/2 + char.x} 
                cy={700/2 + char.y} 
                r={50 * char.scale} 
                fill="rgba(161, 106, 80, 0.5)" 
            />
          ))
        )}
        
        {/* Viewport indicator */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill="rgba(216, 73, 73, 0.3)"
          stroke="rgba(216, 73, 73, 0.8)"
          strokeWidth={15}
          className="pointer-events-none"
        />
      </svg>
      <div className="flex items-center gap-2">
        <button onClick={() => onZoom(1 / 1.2)} className="w-8 h-8 flex items-center justify-center font-bold text-xl bg-panel-header text-condorito-brown rounded-md hover:bg-panel-border transition">-</button>
        <div className="text-xs font-mono w-12 text-center">{((isComicMode ? canvasWidth : 400) / viewBox.width * 100).toFixed(0)}%</div>
        <button onClick={() => onZoom(1.2)} className="w-8 h-8 flex items-center justify-center font-bold text-xl bg-panel-header text-condorito-brown rounded-md hover:bg-panel-border transition">+</button>
      </div>
    </div>
  );
};

export default NavigatorPanel;