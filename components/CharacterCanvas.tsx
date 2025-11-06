import React, { useState, useRef, useEffect } from 'react';
import type { BackgroundOptions, CharacterInstance, ComicPanelData } from '../types';
import Character from './Character';
import ComicPanel from './ComicPanel';

interface CharacterCanvasProps {
  characters: CharacterInstance[];
  comicPanels: ComicPanelData[] | null;
  backgroundOptions: BackgroundOptions;
  showBoundingBoxes: boolean;
  comicAspectRatio: '1:1' | '16:9' | '9:16';
  minComicFontSize: number;
  maxComicFontSize: number;
}


const CharacterCanvas: React.FC<CharacterCanvasProps> = ({ characters, comicPanels, backgroundOptions, showBoundingBoxes, comicAspectRatio, minComicFontSize, maxComicFontSize }) => {
  const VIEWBOX_WIDTH_BASE = 400;
  const VIEWBOX_HEIGHT = 600;
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: VIEWBOX_WIDTH_BASE / 2, y: 120 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStartPoint = useRef({ x: 0, y: 0 });
  
  const isComicMode = comicPanels !== null;
  const canvasHeight = VIEWBOX_HEIGHT;
  const canvasWidth = isComicMode
    ? (comicAspectRatio === '1:1' ? canvasHeight : comicAspectRatio === '16:9' ? canvasHeight * (16 / 9) : canvasHeight * (9 / 16))
    : VIEWBOX_WIDTH_BASE;

  useEffect(() => {
    if (isComicMode) {
      setViewBox({ x: 0, y: 0, width: canvasWidth, height: canvasHeight });
    } else {
      setViewBox({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
    }
  }, [isComicMode, canvasWidth, canvasHeight]);


  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const transformedPoint = svgPoint.matrixTransform(ctm.inverse());
    setCursorPos({ x: transformedPoint.x, y: transformedPoint.y });
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const transformedPoint = svgPoint.matrixTransform(ctm.inverse());

    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newWidth = viewBox.width / zoomFactor;
    const newHeight = viewBox.height / zoomFactor;
    
    const newX = transformedPoint.x - (transformedPoint.x - viewBox.x) / zoomFactor;
    const newY = transformedPoint.y - (transformedPoint.y - viewBox.y) / zoomFactor;

    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };
  
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 1) return; // Middle mouse button for panning
    e.preventDefault();
    setIsPanning(true);
    panStartPoint.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handlePanMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const dx = e.clientX - panStartPoint.current.x;
      const dy = e.clientY - panStartPoint.current.y;
      
      const svgWidth = svgRef.current.clientWidth;
      if (svgWidth === 0) return;
      
      const scale = viewBox.width / svgWidth;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * scale,
        y: prev.y - dy * scale,
      }));
      
      panStartPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handlePanEnd = () => setIsPanning(false);

    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
    };
  }, [isPanning, viewBox.width]);

  const sortedCharacters = [...characters].sort((a, b) => a.zIndex - b.zIndex);

  const comicPanelLayouts = isComicMode && comicPanels ? comicPanels.map(panel => ({
      ...panel,
      panelLayout: {
          x: (panel.layout.x / 100) * canvasWidth,
          y: (panel.layout.y / 100) * canvasHeight,
          width: (panel.layout.width / 100) * canvasWidth,
          height: (panel.layout.height / 100) * canvasHeight,
      }
  })) : [];


  return (
    <svg
      ref={svgRef}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      className="w-full h-full"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      aria-label="Generated 2D character or comic"
    >
      <defs>
        <pattern id="checkerboard" patternUnits="userSpaceOnUse" width="40" height="40">
           {backgroundOptions.animation && !isComicMode && (
             <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="-40 40" dur="4s" repeatCount="indefinite" />
           )}
          <rect width="20" height="20" x="0" y="0" fill={backgroundOptions.color1} />
          <rect width="20" height="20" x="20" y="0" fill={backgroundOptions.color2} />
          <rect width="20" height="20" x="0" y="20" fill={backgroundOptions.color2} />
          <rect width="20" height="20" x="20" y="20" fill={backgroundOptions.color1} />
        </pattern>
        <filter id="body-outline-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius={4 / 2} />
            <feFlood floodColor={characters.length > 0 ? characters[0].params.outlineColor : '#5e6670'} result="colored" />
            <feComposite in="colored" in2="dilated" operator="in" result="outline" />
            <feMerge>
                <feMergeNode in="outline" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
      </defs>
      
      {isComicMode && comicPanels ? (
        <>
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#checkerboard)" />
            
            {/* Layer 1: Panel contents (backgrounds, characters, borders) */}
            <g id="comic-content-layer">
              {comicPanelLayouts.length > 0 && comicPanelLayouts.map(({panelLayout, ...panel}) => (
                  <ComicPanel
                    key={`content-${panel.id}`}
                    instanceKey={`content-${panel.id}`}
                    panel={panel}
                    panelLayout={panelLayout}
                    minComicFontSize={minComicFontSize}
                    maxComicFontSize={maxComicFontSize}
                    layer="content"
                  />
              ))}
            </g>

            {/* Layer 2: Dialogue bubbles */}
            <g id="comic-dialogue-layer">
              {comicPanelLayouts.length > 0 && comicPanelLayouts.map(({panelLayout, ...panel}) => (
                  <ComicPanel
                    key={`dialogue-${panel.id}`}
                    instanceKey={`dialogue-${panel.id}`}
                    panel={panel}
                    panelLayout={panelLayout}
                    minComicFontSize={minComicFontSize}
                    maxComicFontSize={maxComicFontSize}
                    layer="dialogue"
                  />
              ))}
            </g>
        </>
      ) : (
        <>
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#checkerboard)" />
            {sortedCharacters.map((charInstance, index) => (
                <g key={`char-${index}`} transform={`translate(${VIEWBOX_WIDTH_BASE/2}, ${VIEWBOX_HEIGHT/2})`}>
                    <Character
                      key={`char-inst-${index}`}
                      charInstance={charInstance}
                      instanceKey={`char-${index}`}
                      localCursorPos={cursorPos}
                    />
                </g>
            ))}
        </>
      )}
    </svg>
  );
};

export default React.memo(CharacterCanvas);