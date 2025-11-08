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
  comicTheme: string;
  canvasResetToken: number;
  onViewBoxChange: (viewBox: { x: number; y: number; width: number; height: number; }) => void;
}


const CharacterCanvas = forwardRef<({ export: () => void }), CharacterCanvasProps>(({ characters, comicPanels, backgroundOptions, showBoundingBoxes, comicAspectRatio, minComicFontSize, maxComicFontSize, comicLanguage, comicTheme, canvasResetToken, onViewBoxChange }, ref) => {
  const VIEWBOX_WIDTH_BASE = 400;
  const VIEWBOX_HEIGHT = 700;
  
  const svgRef = useRef<SVGSVGElement>(null);
  const characterGroupRef = useRef<SVGGElement>(null); // Ref for the character group
  const [cursorPos, setCursorPos] = useState({ x: VIEWBOX_WIDTH_BASE / 2, y: 120 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const panStartPoint = useRef({ x: 0, y: 0 });
  
  const isComicMode = comicPanels !== null;
  const canvasHeight = VIEWBOX_HEIGHT;
  const canvasWidth = isComicMode
    ? (comicAspectRatio === '1:1' ? canvasHeight : comicAspectRatio === '16:9' ? canvasHeight * (16 / 9) : canvasHeight * (9 / 16))
    : VIEWBOX_WIDTH_BASE;
  
  useImperativeHandle(ref, () => ({
    export: () => {
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
           
           // --- Add Logo and Date ---
           const today = new Date();
           const dd = String(today.getDate()).padStart(2, '0');
           const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
           const yyyy = today.getFullYear();
           const dateStr = `${dd}-${mm}-${yyyy}`;
           
           const logoText = "Plop!";
           const fullText = `${logoText} ${dateStr}`;
           
           const fontSize = Math.round(canvas.width * 0.015);
           const margin = canvas.width * 0.01;
           
           ctx.textAlign = 'right';
           ctx.textBaseline = 'bottom';
           
           // Date text
           ctx.font = `normal ${fontSize}px sans-serif`;
           ctx.fillStyle = '#4A2E2C'; // condorito-brown
           ctx.fillText(dateStr, canvas.width - margin, canvas.height - margin);
           
           const dateWidth = ctx.measureText(dateStr).width;
           const spaceWidth = ctx.measureText(" ").width;
           
           // Logo text
           ctx.font = `bold ${fontSize}px sans-serif`;
           
           const logoX = canvas.width - margin - dateWidth - spaceWidth;
           const logoY = canvas.height - margin;
           
           // Outline
           ctx.strokeStyle = '#4A2E2C'; // condorito-brown
           ctx.lineWidth = fontSize * 0.2; // Outline thickness
           ctx.strokeText(logoText, logoX, logoY);

           // Fill
           ctx.fillStyle = '#D84949'; // condorito-red
           ctx.fillText(logoText, logoX, logoY);
           // --- End Logo and Date ---

           const pngUrl = canvas.toDataURL("image/png");

           // --- Generate Filename ---
           const sanitizedTheme = comicTheme
             .trim()
             .replace(/\s+/g, '-') 
             .replace(/[^a-zA-Z0-9-]/g, '')
             .toLowerCase() || 'comic';

           const filename = `${sanitizedTheme}-plop-${dateStr}.png`;
           
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
    onViewBoxChange(viewBox);
  }, [viewBox, onViewBoxChange]);

  useEffect(() => {
    if (isComicMode) {
      // When in comic mode, the viewBox is fixed to the comic dimensions.
      setViewBox({ x: 0, y: 0, width: canvasWidth, height: canvasHeight });
      return;
    }

    // This part runs only when not in comic mode.
    // It's triggered by canvasResetToken (new character) or when characters array is cleared.
    if (characters.length === 0) {
      // If no characters, reset to default view
      setViewBox({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
      return;
    }

    // If there are characters (and we just got a reset token), calculate the optimal view.
    const timer = setTimeout(() => {
      if (characterGroupRef.current) {
        const bbox = characterGroupRef.current.getBBox();
        
        if (bbox.width === 0 || bbox.height === 0 || !isFinite(bbox.width) || !isFinite(bbox.height)) {
          console.warn("Invalid BBox calculated, falling back to default view.", bbox);
          setViewBox({ x: 0, y: 0, width: VIEWBOX_WIDTH_BASE, height: VIEWBOX_HEIGHT });
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

        if (contentAspectRatio > canvasAspectRatio) {
          newViewBoxWidth = contentWidth;
          newViewBoxHeight = contentWidth / canvasAspectRatio;
        } else {
          newViewBoxHeight = contentHeight;
          newViewBoxWidth = contentHeight * canvasAspectRatio;
        }
        
        // The character <g> is translated by VIEWBOX_WIDTH_BASE/2, VIEWBOX_HEIGHT/2
        const absoluteContentCenterX = contentCenterX + VIEWBOX_WIDTH_BASE / 2;
        const absoluteContentCenterY = contentCenterY + VIEWBOX_HEIGHT / 2;

        const newViewBoxX = absoluteContentCenterX - newViewBoxWidth / 2;
        const newViewBoxY = absoluteContentCenterY - newViewBoxHeight / 2;

        setViewBox({
          x: newViewBoxX,
          y: newViewBoxY,
          width: newViewBoxWidth,
          height: newViewBoxHeight
        });
      }
    }, 50); // A small delay is important for the DOM to update.

    return () => clearTimeout(timer);
  }, [isComicMode, canvasWidth, canvasHeight, canvasResetToken, characters.length]);


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
      </defs>
      
      {isComicMode && comicPanels ? (
        <g id="comic-container">
            <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="white" />
            
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
                    comicLanguage={comicLanguage}
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
                    comicLanguage={comicLanguage}
                    layer="dialogue"
                  />
              ))}
            </g>
            <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill="none" stroke="black" strokeWidth="2" />
        </g>
      ) : (
        <>
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#checkerboard)" />
            {sortedCharacters.map((charInstance, index) => (
                <g key={`char-${index}`} ref={characterGroupRef} transform={`translate(${VIEWBOX_WIDTH_BASE/2}, ${VIEWBOX_HEIGHT/2})`}>
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
});

export default CharacterCanvas;