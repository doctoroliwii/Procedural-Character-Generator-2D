import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
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
  comicLanguage: string;
  comicFontFamily: string;
  comicTheme: string;
  canvasResetToken: number;
  viewBox: { x: number; y: number; width: number; height: number; };
  onViewBoxChange: (updater: { x: number; y: number; width: number; height: number; } | ((prev: { x: number; y: number; width: number; height: number; }) => { x: number; y: number; width: number; height: number; })) => void;
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  panMode?: 'space' | 'direct';
}


const CharacterCanvas = forwardRef<({ export: (pageNumber?: number) => void }), CharacterCanvasProps>(({ characters, comicPanels, backgroundOptions, showBoundingBoxes, comicAspectRatio, minComicFontSize, maxComicFontSize, comicLanguage, comicFontFamily, comicTheme, canvasResetToken, viewBox, onViewBoxChange, currentPage, totalPages, onNextPage, onPrevPage, panMode = 'direct' }, ref) => {
  const VIEWBOX_WIDTH_BASE = 400;
  const VIEWBOX_HEIGHT = 700;
  
  const svgRef = useRef<SVGSVGElement>(null);
  const characterGroupRef = useRef<SVGGElement>(null); // Ref for the character group
  const [cursorPos, setCursorPos] = useState({ x: VIEWBOX_WIDTH_BASE / 2, y: 120 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartPoint = useRef({ x: 0, y: 0 });
  
  const isComicMode = comicPanels !== null;
  const canvasHeight = VIEWBOX_HEIGHT;
  const canvasWidth = isComicMode
    ? (comicAspectRatio === '1:1' ? canvasHeight : comicAspectRatio === '16:9' ? canvasHeight * (16 / 9) : canvasHeight * (9 / 16))
    : VIEWBOX_WIDTH_BASE;
  
  useImperativeHandle(ref, () => ({
    export: (pageNumber?: number) => {
      if (!svgRef.current || !isComicMode) {
        alert("No comic available to export.");
        return;
      }
      const svgNode = svgRef.current;
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgNode);

      // Create an image
      const img = new Image();
      const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Create a canvas
        const canvas = document.createElement("canvas");
        const exportResolution = 2048; // a high resolution for good quality
        
        const ratio = canvasWidth / canvasHeight;
        canvas.width = exportResolution;
        canvas.height = exportResolution / ratio;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
           ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
           
           // --- Add Plop! Logo to last panel ---
           if (comicPanels && comicPanels.length > 0) {
               const lastPanel = comicPanels[comicPanels.length - 1];
               const lastPanelLayout = lastPanel.layout;
               
               const panelX = (lastPanelLayout.x / 100) * canvas.width;
               const panelY = (lastPanelLayout.y / 100) * canvas.height;
               const panelWidth = (lastPanelLayout.width / 100) * canvas.width;
               const panelHeight = (lastPanelLayout.height / 100) * canvas.height;

               const logoText = "Plop!";
               const logoFontSize = Math.round(panelHeight * 0.12);
               const logoMargin = panelWidth * 0.05;

               ctx.font = `bold ${logoFontSize}px 'Luckiest Guy', sans-serif`;
               ctx.textAlign = 'right';
               ctx.textBaseline = 'bottom';
               
               const logoX = panelX + panelWidth - logoMargin;
               const logoY = panelY + panelHeight - logoMargin;
               
               // White outline for better visibility
               ctx.strokeStyle = '#FFFFFF';
               ctx.lineWidth = logoFontSize * 0.25;
               ctx.strokeText(logoText, logoX, logoY);
               
               // Red Fill
               ctx.fillStyle = '#D84949'; // condorito-red
               ctx.fillText(logoText, logoX, logoY);
           }
           
           const pngUrl = canvas.toDataURL("image/png");

           // --- Generate Filename ---
           const today = new Date();
           const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
           
           const sanitizedTheme = comicTheme
             .trim()
             .replace(/\s+/g, '-') 
             .replace(/[^a-zA-Z0-9-]/g, '')
             .toLowerCase() || 'comic';
            
           const pageString = pageNumber ? `-pagina-${pageNumber}` : '';
           const filename = `${sanitizedTheme}-plop${pageString}-${dateStr}.png`;
           
           // Trigger download
           const a = document.createElement("a");
           a.href = pngUrl;
           a.download = filename;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  }));
  
  useEffect(() => {
    if (isComicMode) {
      // When in comic mode, the viewBox is fixed to the comic dimensions.
      onViewBoxChange({ x: 0, y: 0, width: canvasWidth, height: canvasHeight });
      return;
    }

    // This part runs only when not in comic mode.
    // It's triggered by canvasResetToken (new character).
    if (characters.length === 0) {
      // If no characters, reset to default view
      onViewBoxChange({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
      return;
    }

    // If there are characters (and we just got a reset token), calculate the optimal view.
    const timer = setTimeout(() => {
      if (characterGroupRef.current) {
        const bbox = characterGroupRef.current.getBBox();
        
        if (bbox.width === 0 || bbox.height === 0 || !isFinite(bbox.width) || !isFinite(bbox.height)) {
          console.warn("Invalid BBox calculated, falling back to default view.", bbox);
          onViewBoxChange({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
          return;
        }

        const margin = 0.15; // 15% margin
        
        const contentWidth = bbox.width * (1 + margin * 2);
        const contentHeight = bbox.height * (1 + margin * 2);

        const contentCenterX = bbox.x + bbox.width / 2;
        const contentCenterY = bbox.y + bbox.height / 2;
        
        const canvasAspectRatio = VIEWBOX_WIDTH_BASE / VIEWBOX_HEIGHT;
        const contentAspectRatio = contentWidth / contentHeight;

        let newViewBoxWidth, newViewBoxHeight;

        // FIX: Replaced `canvas` with `canvasAspectRatio` to fix reference error and completed the truncated logic.
        if (contentAspectRatio > canvasAspectRatio) {
            // Content is wider than canvas, fit to width
            newViewBoxWidth = contentWidth;
            newViewBoxHeight = contentWidth / canvasAspectRatio;
        } else {
            // Content is taller than canvas, fit to height
            newViewBoxHeight = contentHeight;
            newViewBoxWidth = contentHeight * canvasAspectRatio;
        }
        onViewBoxChange({
            x: contentCenterX - newViewBoxWidth / 2,
            y: contentCenterY - newViewBoxHeight / 2,
            width: newViewBoxWidth,
            height: newViewBoxHeight,
        });
      }
    }, 50); // Small delay to allow SVG to render

    return () => clearTimeout(timer);
  }, [canvasResetToken, characters, isComicMode, canvasWidth, canvasHeight, onViewBoxChange]);

  // Mouse move for eye tracking
  const handleMouseMove = (event: React.MouseEvent) => {
    if (svgRef.current) {
        const svgPoint = svgRef.current.createSVGPoint();
        svgPoint.x = event.clientX;
        svgPoint.y = event.clientY;
        const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        setCursorPos(transformedPoint);
    }
  };
  
  const handleWheel = (event: React.WheelEvent) => {
      event.preventDefault();
      const scaleFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      
      const svgPoint = svgRef.current!.createSVGPoint();
      svgPoint.x = event.clientX;
      svgPoint.y = event.clientY;
      const cursorInSvg = svgPoint.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());

      onViewBoxChange(prev => {
          const newWidth = prev.width / scaleFactor;
          const newHeight = prev.height / scaleFactor;
          const newX = cursorInSvg.x - (cursorInSvg.x - prev.x) / scaleFactor;
          const newY = cursorInSvg.y - (cursorInSvg.y - prev.y) / scaleFactor;
          return { x: newX, y: newY, width: newWidth, height: newHeight };
      });
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        // If the user is typing in a text field, let them type a space.
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        // Otherwise, enable canvas panning.
        setIsSpacePressed(true);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (panMode === 'space' && !isSpacePressed) return;
    setIsPanning(true);
    panStartPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartPoint.current.x;
    const dy = e.clientY - panStartPoint.current.y;
    panStartPoint.current = { x: e.clientX, y: e.clientY };
    onViewBoxChange(prev => ({
        ...prev,
        x: prev.x - dx * (prev.width / svgRef.current!.clientWidth),
        y: prev.y - dy * (prev.height / svgRef.current!.clientHeight)
    }));
  };

  const handleGlobalMouseUp = () => {
    setIsPanning(false);
  };
  
  useEffect(() => {
    if (isPanning) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanning]);

  const canPan = panMode === 'direct' || isSpacePressed;
  const cursorStyle = canPan ? (isPanning ? 'grabbing' : 'grab') : 'default';

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
        <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            width={canvasWidth}
            height={canvasHeight}
            className="shadow-lg rounded-lg max-w-full max-h-full"
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            style={{ cursor: cursorStyle }}
        >
            <defs>
                <radialGradient id="background-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: backgroundOptions.color1 }} />
                    <stop offset="100%" style={{ stopColor: backgroundOptions.color2 }} />
                </radialGradient>
            </defs>
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#background-gradient)" />

            {isComicMode ? (
                <>
                    <g key={`comic-content-${canvasResetToken}`}>
                        {comicPanels.map((panel, index) =>
                            <ComicPanel
                                key={panel.id}
                                panel={panel}
                                panelLayout={{
                                    x: (panel.layout.x / 100) * canvasWidth,
                                    y: (panel.layout.y / 100) * canvasHeight,
                                    width: (panel.layout.width / 100) * canvasWidth,
                                    height: (panel.layout.height / 100) * canvasHeight
                                }}
                                minComicFontSize={minComicFontSize}
                                maxComicFontSize={maxComicFontSize}
                                instanceKey={`${panel.id}-${index}`}
                                comicLanguage={comicLanguage}
                                comicFontFamily={comicFontFamily}
                                layer="content"
                            />
                        )}
                    </g>
                    {/* Render dialogue on a separate top-level group to avoid being clipped or transformed */}
                    <g key={`comic-dialogue-${canvasResetToken}`}>
                        {comicPanels.map((panel, index) =>
                            <ComicPanel
                                key={panel.id}
                                panel={panel}
                                panelLayout={{
                                    x: (panel.layout.x / 100) * canvasWidth,
                                    y: (panel.layout.y / 100) * canvasHeight,
                                    width: (panel.layout.width / 100) * canvasWidth,
                                    height: (panel.layout.height / 100) * canvasHeight
                                }}
                                minComicFontSize={minComicFontSize}
                                maxComicFontSize={maxComicFontSize}
                                instanceKey={`${panel.id}-${index}`}
                                comicLanguage={comicLanguage}
                                comicFontFamily={comicFontFamily}
                                layer="dialogue"
                            />
                        )}
                    </g>
                </>
            ) : (
                <g ref={characterGroupRef}>
                    {characters
                      .sort((a, b) => a.zIndex - b.zIndex)
                      .map((charInstance, index) =>
                        <Character
                          key={`${charInstance.params.headWidth}-${index}-${canvasResetToken}`}
                          charInstance={charInstance}
                          instanceKey={`${charInstance.params.headWidth}-${index}`}
                          localCursorPos={cursorPos}
                        />
                      )}
                </g>
            )}
            
            {/* Project navigation for multi-page comics */}
            {totalPages > 0 && (
              <>
                 <foreignObject x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} className="pointer-events-none">
                    <div className="w-full h-full relative flex items-center justify-between px-4">
                        <button onClick={onPrevPage} disabled={currentPage === 0} className="pointer-events-auto p-3 bg-panel-back/50 rounded-full text-condorito-brown hover:bg-panel-back disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={onNextPage} disabled={currentPage >= totalPages - 1} className="pointer-events-auto p-3 bg-panel-back/50 rounded-full text-condorito-brown hover:bg-panel-back disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </foreignObject>
                 <text
                    x={viewBox.x + viewBox.width / 2}
                    y={viewBox.y + viewBox.height - 20}
                    textAnchor="middle"
                    fill="#4A2E2C"
                    fontSize="16"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    style={{textShadow: '0 0 5px white'}}
                >
                    {currentPage + 1} / {totalPages}
                </text>
              </>
            )}
        </svg>
    </div>
  );
});

export default CharacterCanvas;