import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ProceduralBackground } from '../types';

interface ProceduralBackgroundRendererProps {
  background: ProceduralBackground;
  viewBox: { x: number; y: number; width: number; height: number; };
  onViewBoxChange: (updater: (prev: { x: number; y: number; width: number; height: number; }) => { x: number; y: number; width: number; height: number; }) => void;
}


// Helper function to interpolate between two colors
const lerpColor = (color1: string, color2: string, factor: number): string => {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);

  return rgbToHex(r, g, b);
};

const getRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min;


const ProceduralBackgroundRenderer: React.FC<ProceduralBackgroundRendererProps> = ({ background, viewBox, onViewBoxChange }) => {
  const { type, sky, ground, horizon, room, canvasWidth, canvasHeight, 
    gridDensity, gridPerspective, gridHorizontal, gridVerticals, 
    gridColor, fogEnabled, fogColor, fogDensity,
    gridVerticesVisible, gridVertexColor, gridVertexRadius, walls
  } = background;

  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartPoint = useRef({ x: 0, y: 0 });

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
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const dx = e.clientX - panStartPoint.current.x;
    const dy = e.clientY - panStartPoint.current.y;
    panStartPoint.current = { x: e.clientX, y: e.clientY };
    onViewBoxChange(prev => ({
        ...prev,
        x: prev.x - dx * (prev.width / svgRef.current!.clientWidth),
        y: prev.y - dy * (prev.height / svgRef.current!.clientHeight)
    }));
  }, [isPanning, onViewBoxChange]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  useEffect(() => {
    if (isPanning) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, handleGlobalMouseMove, handleGlobalMouseUp]);
  

  const horizonY = canvasHeight * (horizon.position / 100);
  const clampedHorizonY = Math.max(5, Math.min(canvasHeight - 5, horizonY));
  const vpX = canvasWidth * (horizon.vanishingPointX / 100);
  const vpY = clampedHorizonY;

  const generateMountainPath = (layer: number) => {
    const layerRatio = (layer + 1) / horizon.mountainLayers;
    const height = (canvasHeight - clampedHorizonY) * (horizon.mountainHeight / 100) * (0.5 + layerRatio * 0.5);
    const roughness = 1.5 - (horizon.mountainRoughness / 100);
    const segments = Math.floor(canvasWidth / Math.max(20, 150 * roughness));
    
    let path = `M 0 ${clampedHorizonY}`;
    
    for (let i = 0; i <= segments; i++) {
      const x = (canvasWidth / segments) * i;
      let y;
      if (i === 0 || i === segments) {
        y = clampedHorizonY;
      } else {
        const baseSine = Math.sin((x / canvasWidth) * Math.PI * 2 * (layer + 1) * 0.3);
        const mountainYOffset = Math.pow(baseSine + 1, 2) * height * 0.2 + height * 0.1;
        const jaggedness = (Math.random() - 0.5) * height * 0.3 * (horizon.mountainRoughness / 100);
        const finalOffset = mountainYOffset + jaggedness;
        y = clampedHorizonY - Math.max(1, finalOffset);
      }
      path += ` L ${x} ${y}`;
    }
    
    path += ` L ${canvasWidth} ${clampedHorizonY} Z`;
    return path;
  };

  // --- Grid Calculation ---
  const perspectiveLines: React.ReactNode[] = [];
  const horizontalLines: React.ReactNode[] = [];
  const verticalLines: React.ReactNode[] = [];
  const vertexPoints: {x: number, y: number}[] = [];

  const density = gridDensity > 0 ? gridDensity : 1;
  const perspectiveLineDefs: { slope: number, x_bottom: number }[] = [];

  // Correctly calculate the maximum required extent for perspective lines
  let maxPerspectiveOffset = 0;
  if (gridPerspective.visible) {
    const corners = [{ x: 0, y: 0 }, { x: canvasWidth, y: 0 }, { x: 0, y: canvasHeight }, { x: canvasWidth, y: canvasHeight }];
    const offsets = corners.map(corner => {
      // If a corner is on (or very near) the horizon line, its projection is at infinity.
      if (Math.abs(corner.y - vpY) < 1e-6) return canvasWidth * 10;
      // Project the corner through the VP to the bottom line to find its x-intercept.
      const xAtBottom = vpX + (canvasHeight - vpY) * (corner.x - vpX) / (corner.y - vpY);
      // The offset is the horizontal distance from the VP's vertical line.
      return Math.abs(xAtBottom - vpX);
    });
    maxPerspectiveOffset = Math.max(...offsets);
  }

  if (gridPerspective.visible) {
    // Add central perspective line
    perspectiveLines.push(<line key="p-center" x1={vpX} y1={0} x2={vpX} y2={canvasHeight} />);
    perspectiveLineDefs.push({ slope: Infinity, x_bottom: vpX });
  }

  for (let i = 1; ; i++) {
      const z = 1 + Math.pow(i / density, 1.8);
      let shouldContinue = false;

      // Horizontal lines
      if (gridHorizontal.visible) {
        const y_ground = vpY + (canvasHeight - vpY) / z;
        if (y_ground <= canvasHeight + 1) {
            horizontalLines.push(<line key={`h-g-${i}`} x1={0} y1={y_ground} x2={canvasWidth} y2={y_ground} />);
            shouldContinue = true;
        }
        const y_sky = vpY - vpY / z;
        if (y_sky >= -1) {
            horizontalLines.push(<line key={`h-s-${i}`} x1={0} y1={y_sky} x2={canvasWidth} y2={y_sky} />);
            shouldContinue = true;
        }
      }

      // Vertical (screen-vertical) lines
      if (gridVerticals.visible) {
          const step = canvasWidth / 2;
          const x_right = vpX + step / z;
          const x_left = vpX - step / z;

          if (x_right < canvasWidth){
              verticalLines.push(
                <g key={`v-r-${i}`}>
                  <line x1={x_right} y1={vpY} x2={x_right} y2={0} />
                  <line x1={x_right} y1={vpY} x2={x_right} y2={canvasHeight} />
                </g>
              );
              shouldContinue = true;
          }
          if(x_left > 0){
               verticalLines.push(
                <g key={`v-l-${i}`}>
                  <line x1={x_left} y1={vpY} x2={x_left} y2={0} />
                  <line x1={x_left} y1={vpY} x2={x_left} y2={canvasHeight} />
                </g>
              );
              shouldContinue = true;
          }
      }

      // Perspective Lines (Converging)
      if (gridPerspective.visible) {
          const base_step = canvasWidth / (2 * density);
          const x_world_offset = base_step * Math.pow(i, 0.95);
          
          if (x_world_offset <= maxPerspectiveOffset) {
              shouldContinue = true;
              
              // --- RIGHT SIDE ---
              const x_at_bottom_r = vpX + x_world_offset;
              const slope_r = (canvasHeight - vpY) / (x_at_bottom_r - vpX);
              const x_at_top_r = (Math.abs(slope_r) > 1e-6) ? (vpX - vpY / slope_r) : Infinity;
              
              perspectiveLines.push(
                  <line key={`p-r-${i}`} x1={x_at_bottom_r} y1={canvasHeight} x2={x_at_top_r} y2={0} />
              );
              perspectiveLineDefs.push({ slope: (vpY - canvasHeight) / (vpX - x_at_bottom_r), x_bottom: x_at_bottom_r });

              // --- LEFT SIDE ---
              const x_at_bottom_l = vpX - x_world_offset;
              const slope_l = (canvasHeight - vpY) / (x_at_bottom_l - vpX);
              const x_at_top_l = (Math.abs(slope_l) > 1e-6) ? (vpX - vpY / slope_l) : -Infinity;
          
              perspectiveLines.push(
                  <line key={`p-l-${i}`} x1={x_at_bottom_l} y1={canvasHeight} x2={x_at_top_l} y2={0} />
              );
              perspectiveLineDefs.push({ slope: (vpY - canvasHeight) / (vpX - x_at_bottom_l), x_bottom: x_at_bottom_l });
          }
      }
      
      if (!shouldContinue || i > 400) break; // Safety break increased
  }
  
  // Always calculate vertices for object placement
  const groundVertices: {x: number, y: number}[] = [];
  const skyVertices: {x: number, y: number}[] = [];

  const horizontalYCoordsForVertices = { ground: [] as number[], sky: [] as number[] };
  for (let i = 1; ; i++) {
    const z = 1 + Math.pow(i / density, 1.8);
    const y_ground = vpY + (canvasHeight - vpY) / z;
    const y_sky = vpY - vpY / z;
    let shouldContinue = false;
    if (y_ground <= canvasHeight + 5) { // give a little margin
        horizontalYCoordsForVertices.ground.push(y_ground);
        shouldContinue = true;
    }
    if (y_sky >= -5) { // give a little margin
        horizontalYCoordsForVertices.sky.push(y_sky);
        shouldContinue = true;
    }
    if(!shouldContinue || i > 150) break;
  }

  perspectiveLineDefs.forEach(({ slope }) => {
      horizontalYCoordsForVertices.ground.forEach(y => {
          if (isFinite(slope) && Math.abs(slope) > 1e-6) {
            const x = vpX + (y - vpY) / slope;
            if (x >= -5 && x <= canvasWidth + 5) groundVertices.push({ x, y });
          }
      });
      horizontalYCoordsForVertices.sky.forEach(y => {
          if (isFinite(slope) && Math.abs(slope) > 1e-6) {
            const x = vpX + (y - vpY) / slope;
            if (x >= -5 && x <= canvasWidth + 5) skyVertices.push({ x, y });
          }
      });
  });

  if (gridVerticesVisible) {
      vertexPoints.push(...groundVertices, ...skyVertices);
  }

  // Helper function to convert grid coordinates to screen coordinates
  const getScreenCoords = useCallback((gridX: number, gridZ: number) => {
    // gridZ from 0 (horizon) to 10 (foreground)
    // gridX from -10 (left) to 10 (right)
    
    // Map gridZ to a y-coordinate with perspective
    const y = vpY + (canvasHeight - vpY) * Math.pow(gridZ / 10, 1.5);
    
    // Calculate the perspective scale at this y-coordinate
    const perspectiveScale = (y - vpY) / (canvasHeight - vpY);
    
    // Map gridX from [-10, 10] to a world coordinate space that matches canvas width at the bottom
    const worldX = (gridX + 10) / 20 * canvasWidth;
    
    // Project the world coordinate into screen space based on the perspective scale
    const x = vpX + (worldX - vpX) * perspectiveScale;
    
    return { x, y };
  }, [vpX, vpY, canvasWidth, canvasHeight]);


  const wallElements = useMemo(() => {
      if (!walls || walls.length === 0) {
          return [];
      }

      const sortedWalls = [...walls].sort((a, b) => {
          const avgZa = (a.start.z + a.end.z) / 2;
          const avgZb = (b.start.z + b.end.z) / 2;
          return avgZa - avgZb; // Render farther walls first
      });

      return sortedWalls.filter(wall => wall.visible).map(wall => {
          const startBottom = getScreenCoords(wall.start.x, wall.start.z);
          const endBottom = getScreenCoords(wall.end.x, wall.end.z);

          const startHeightPx = (startBottom.y - vpY) * (wall.height / 100);
          const endHeightPx = (endBottom.y - vpY) * (wall.height / 100);

          const startTop = { x: startBottom.x, y: startBottom.y - startHeightPx };
          const endTop = { x: endBottom.x, y: endBottom.y - endHeightPx };

          const wallPath = `M ${startBottom.x} ${startBottom.y} L ${endBottom.x} ${endBottom.y} L ${endTop.x} ${endTop.y} L ${startTop.x} ${startTop.y} Z`;

          let shadowPath = '';
          if (wall.shadow) {
              const shadowDepth = 0.8;
              const shadowStart = getScreenCoords(wall.start.x, Math.min(10, wall.start.z + shadowDepth));
              const shadowEnd = getScreenCoords(wall.end.x, Math.min(10, wall.end.z + shadowDepth));
              shadowPath = `M ${startBottom.x} ${startBottom.y} L ${endBottom.x} ${endBottom.y} L ${shadowEnd.x} ${shadowEnd.y} L ${shadowStart.x} ${shadowStart.y} Z`;
          }
          
          return (
              <g key={wall.id}>
                  {wall.shadow && <path d={shadowPath} fill="black" fillOpacity={wall.shadowOpacity / 100} />}
                  <path
                      d={wallPath}
                      fill={wall.color}
                      fillOpacity={wall.opacity / 100}
                      stroke={lerpColor(wall.color, '#000000', 0.4)}
                      strokeWidth={wall.strokeWidth}
                      strokeLinejoin="round"
                  />
              </g>
          );
      });

  }, [walls, getScreenCoords, vpY]);



  if (type === 'exterior') {
    const gradientId = `sky-gradient-${background.id}`;
    const skyClipId = `sky-clip-${background.id}`;
    
    const fogGroundGradId = `fog-ground-grad-${background.id}`;
    const fogSkyGradId = `fog-sky-grad-${background.id}`;

    const clouds = [];
    if (sky.cloudsVisible && skyVertices.length > 0) {
        const numClouds = Math.min(sky.cloudDensity, skyVertices.length);
        const shuffledVertices = [...skyVertices].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numClouds; i++) {
            const vertex = shuffledVertices[i];
            if (vertex.y > vpY - 10) continue; // Don't place clouds too close to the horizon

            const yRatio = (vpY - vertex.y) / vpY; // 0 at horizon, 1 at top
            const perspectiveFactor = Math.pow(yRatio, 1.5); // Emphasize size difference
            const baseSize = canvasWidth * 0.1;
            const ry = Math.max(3, baseSize * perspectiveFactor * 0.4);
            const rx = ry * getRandomNumber(2, 4);
            
            const clusterSize = Math.floor(getRandomNumber(1, 4));
            for (let j = 0; j < clusterSize; j++) {
                 const cx_offset = (Math.random() - 0.5) * rx * 0.8;
                 const cy_offset = (Math.random() - 0.5) * ry * 0.4;
                 clouds.push(<ellipse key={`cloud-${i}-${j}`} cx={vertex.x + cx_offset} cy={vertex.y + cy_offset} rx={rx * getRandomNumber(0.8, 1.2)} ry={ry * getRandomNumber(0.8, 1.2)} fill={sky.cloudColor} opacity={getRandomNumber(0.6, 0.9)} />);
            }
        }
    }
    
    const mountains = [];
    if (horizon.mountainsVisible) {
        for (let i = horizon.mountainLayers - 1; i >= 0; i--) {
            const layerRatio = i / horizon.mountainLayers;
            const color = lerpColor(horizon.mountainColor, sky.bottomColor, (1 - layerRatio) * 0.6);
            mountains.push(<path key={`mountain-${i}`} d={generateMountainPath(i)} fill={color} />);
        }
    }

    const groundObjects: any[] = [];
    const usedVertices = new Set<string>();
    const getKey = (p: {x:number, y:number}) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    
    if (horizon.treesVisible && groundVertices.length > 0) {
        const numTrees = Math.min(horizon.treeCount, groundVertices.length);
        const shuffledVertices = [...groundVertices].sort(() => 0.5 - Math.random());
        let placedTrees = 0;

        for (let i = 0; i < shuffledVertices.length && placedTrees < numTrees; i++) {
            const vertex = shuffledVertices[i];
            if (usedVertices.has(getKey(vertex))) continue;

            const y = vertex.y;
            const x = vertex.x;
            
            if (y < vpY + 5) continue;

            const perspectiveScale = (y - vpY) / (canvasHeight - vpY);
            const sizeVariation = 1 + (Math.random() - 0.5) * (horizon.treeVariation / 100);
            const baseSize = horizon.treeSize;
            const finalSize = baseSize * perspectiveScale * sizeVariation;
            if (finalSize < 2) continue;

            const trunkHeight = finalSize * 1.2;
            const trunkWidth = Math.max(1, finalSize * 0.2);
            const foliageRadius = finalSize / 2;
            const foliageY = y - trunkHeight;
            
            groundObjects.push({ type: 'tree', id: `tree-${i}`, y: y, render: () => ( <g key={`tree-${i}`}> <rect x={x - trunkWidth/2} y={foliageY} width={trunkWidth} height={trunkHeight} fill={lerpColor(horizon.treeColor, '#000000', 0.4)} /> <circle cx={x} cy={foliageY} r={foliageRadius} fill={horizon.treeColor} /> </g> ) });
            usedVertices.add(getKey(vertex));
            placedTrees++;
        }
    }

    if (horizon.housesVisible && groundVertices.length > 0) {
        const availableVertices = groundVertices.filter(v => !usedVertices.has(getKey(v)));
        const numHouses = Math.min(horizon.houseCount, availableVertices.length);
        const shuffledVertices = availableVertices.sort(() => 0.5 - Math.random());
        let placedHouses = 0;

        for (let i = 0; i < shuffledVertices.length && placedHouses < numHouses; i++) {
            const vertex = shuffledVertices[i];
            const y = vertex.y;
            const x = vertex.x;
            
            if (y < vpY + 10) continue;

            const perspectiveScale = (y - vpY) / (canvasHeight - vpY);
            const gridCellWidth = (canvasWidth / density) * perspectiveScale;

            const widthInUnits = getRandomNumber(horizon.houseWidthMin, horizon.houseWidthMax);
            const housePixelWidth = widthInUnits * gridCellWidth;
            const heightInUnits = getRandomNumber(horizon.houseHeightMin, horizon.houseHeightMax);
            const housePixelHeight = heightInUnits * gridCellWidth;
            
            if (housePixelWidth < 2 || housePixelHeight < 2) continue;

            const houseX = x - housePixelWidth / 2;
            const houseY = y - housePixelHeight;
            const roofHeight = housePixelHeight * 0.7;
            const roofPath = `M ${houseX} ${houseY} L ${houseX + housePixelWidth / 2} ${houseY - roofHeight} L ${houseX + housePixelWidth} ${houseY} Z`;
            const colorVar = (Math.random() - 0.5) * (horizon.houseColorVariation / 100) * 2;
            const houseColor = lerpColor(horizon.houseColor, colorVar > 0 ? '#FFFFFF' : '#000000', Math.abs(colorVar * 10));
            
            groundObjects.push({ type: 'house', id: `house-${i}`, y: y, render: () => ( <g key={`house-${i}`}> <rect x={houseX} y={houseY} width={housePixelWidth} height={housePixelHeight} fill={houseColor} /> <path d={roofPath} fill={lerpColor(houseColor, '#000000', 0.2)} /> </g> ) });
            usedVertices.add(getKey(vertex));
            placedHouses++;
        }
    }

    groundObjects.sort((a, b) => a.y - b.y);

    const horizonPositionPercent = horizon.position;
    const cursorStyle = isPanning ? 'grabbing' : 'grab';

    return (
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: cursorStyle, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: sky.topColor }} />
            <stop offset="100%" style={{ stopColor: sky.bottomColor }} />
          </linearGradient>
           <clipPath id={skyClipId}><rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} /></clipPath>
          
          <linearGradient id="perspective-fade-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1"/>
              <stop offset={`${Math.max(0, horizonPositionPercent - gridPerspective.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset={`${horizonPositionPercent}%`} stopColor="white" stopOpacity="0"/>
              <stop offset={`${Math.min(100, horizonPositionPercent + gridPerspective.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="horizontal-fade-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1"/>
              <stop offset={`${Math.max(0, horizonPositionPercent - gridHorizontal.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset={`${horizonPositionPercent}%`} stopColor="white" stopOpacity="0"/>
              <stop offset={`${Math.min(100, horizonPositionPercent + gridHorizontal.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="verticals-fade-grad" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="white" stopOpacity="1" />
             <stop offset={`${Math.max(0, horizon.vanishingPointX - gridVerticals.horizonFade/2)}%`} stopColor="white" stopOpacity="1" />
             <stop offset={`${horizon.vanishingPointX}%`} stopColor="white" stopOpacity="0" />
             <stop offset={`${Math.min(100, horizon.vanishingPointX + gridVerticals.horizonFade/2)}%`} stopColor="white" stopOpacity="1" />
             <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>

          <mask id="perspective-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#perspective-fade-grad)" /></mask>
          <mask id="horizontal-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#horizontal-fade-grad)" /></mask>
          <mask id="verticals-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#verticals-fade-grad)" /></mask>

          {fogEnabled && ( <> <linearGradient id={fogGroundGradId} x1="0" y1={clampedHorizonY} x2="0" y2={canvasHeight} gradientUnits="userSpaceOnUse"> <stop offset="0%" stopColor={fogColor} stopOpacity={fogDensity / 100} /> <stop offset="70%" stopColor={fogColor} stopOpacity="0" /> </linearGradient> <linearGradient id={fogSkyGradId} x1="0" y1={clampedHorizonY} x2="0" y2="0" gradientUnits="userSpaceOnUse"> <stop offset="0%" stopColor={fogColor} stopOpacity={fogDensity / 100} /> <stop offset="70%" stopColor={fogColor} stopOpacity="0" /> </linearGradient> </> )}
        </defs>
        
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill={ground.color} />
        <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} fill={`url(#${gradientId})`} />
        <rect x="0" y={clampedHorizonY - 1} width={canvasWidth} height={canvasHeight - clampedHorizonY + 1} fill={ground.color} />
        <g clipPath={`url(#${skyClipId})`}>{clouds}</g>
        {mountains}
        {groundObjects.map(obj => obj.render())}
        {wallElements}
        {fogEnabled && ( <g> <rect x="0" y={clampedHorizonY} width={canvasWidth} height={canvasHeight - clampedHorizonY} fill={`url(#${fogGroundGradId})`} /> <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} fill={`url(#${fogSkyGradId})`} /> </g> )}
        
        {gridPerspective.visible && <g mask="url(#perspective-mask)" stroke={gridColor} strokeWidth={gridPerspective.strokeWidth}>{perspectiveLines}</g>}
        {gridHorizontal.visible && <g mask="url(#horizontal-mask)" stroke={gridColor} strokeWidth={gridHorizontal.strokeWidth}>{horizontalLines}</g>}
        {gridVerticals.visible && <g mask="url(#verticals-mask)" stroke={gridColor} strokeWidth={gridVerticals.strokeWidth}>{verticalLines}</g>}
        
        {gridVerticesVisible && <g fill={gridVertexColor}>{vertexPoints.map((p, i) => <circle key={`v-${i}`} cx={p.x} cy={p.y} r={gridVertexRadius} />)}</g>}
      </svg>
    );
  }

  if (type === 'interior') {
    const depthRatio = 0.6;
    const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
    const p1 = { x: lerp(0, vpX, depthRatio), y: lerp(0, vpY, depthRatio) };
    const p2 = { x: lerp(canvasWidth, vpX, depthRatio), y: lerp(0, vpY, depthRatio) };
    const p3 = { x: lerp(canvasWidth, vpX, depthRatio), y: lerp(canvasHeight, vpY, depthRatio) };
    const p4 = { x: lerp(0, vpX, depthRatio), y: lerp(canvasHeight, vpY, depthRatio) };
    const backWallPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    const ceilingPath = `M 0 0 L ${canvasWidth} 0 L ${p2.x} ${p2.y} L ${p1.x} ${p1.y} Z`;
    const floorPath = `M 0 ${canvasHeight} L ${canvasWidth} ${canvasHeight} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    const leftWallPath = `M 0 0 L ${p1.x} ${p1.y} L ${p4.x} ${p4.y} L 0 ${canvasHeight} Z`;
    const rightWallPath = `M ${canvasWidth} 0 L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${canvasWidth} ${canvasHeight} Z`;
    const cursorStyle = isPanning ? 'grabbing' : 'grab';

     return (
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: cursorStyle, width: '100%', height: '100%' }}
      >
         <defs>
          <linearGradient id="perspective-fade-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1"/>
              <stop offset={`${Math.max(0, horizon.position - gridPerspective.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset={`${horizon.position}%`} stopColor="white" stopOpacity="0"/>
              <stop offset={`${Math.min(100, horizon.position + gridPerspective.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="horizontal-fade-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1"/>
              <stop offset={`${Math.max(0, horizon.position - gridHorizontal.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset={`${horizon.position}%`} stopColor="white" stopOpacity="0"/>
              <stop offset={`${Math.min(100, horizon.position + gridHorizontal.horizonFade/2)}%`} stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="verticals-fade-grad" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="white" stopOpacity="1" />
             <stop offset={`${Math.max(0, horizon.vanishingPointX - gridVerticals.horizonFade/2)}%`} stopColor="white" stopOpacity="1" />
             <stop offset={`${horizon.vanishingPointX}%`} stopColor="white" stopOpacity="0" />
             <stop offset={`${Math.min(100, horizon.vanishingPointX + gridVerticals.horizonFade/2)}%`} stopColor="white" stopOpacity="1" />
             <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="perspective-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#perspective-fade-grad)" /></mask>
          <mask id="horizontal-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#horizontal-fade-grad)" /></mask>
          <mask id="verticals-mask"><rect x="0" y="0" width="100%" height="100%" fill="url(#verticals-fade-grad)" /></mask>
        </defs>
        
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill={room.floorColor} />

        {room.ceilingVisible && <path d={ceilingPath} fill={room.ceilingColor || '#FFFFFF'} />}
        <path d={floorPath} fill={room.floorColor} />
        <path d={leftWallPath} fill={room.wallColor} />
        <path d={rightWallPath} fill={lerpColor(room.wallColor, '#000000', 0.05)} />
        <path d={backWallPath} fill={lerpColor(room.wallColor, '#000000', 0.1)} />
        
        {gridPerspective.visible && <g mask="url(#perspective-mask)" stroke={gridColor} strokeWidth={gridPerspective.strokeWidth}>{perspectiveLines}</g>}
        {gridHorizontal.visible && <g mask="url(#horizontal-mask)" stroke={gridColor} strokeWidth={gridHorizontal.strokeWidth}>{horizontalLines}</g>}
        {gridVerticals.visible && <g mask="url(#verticals-mask)" stroke={gridColor} strokeWidth={gridVerticals.strokeWidth}>{verticalLines}</g>}
        
        {gridVerticesVisible && <g fill={gridVertexColor}>{vertexPoints.map((p, i) => <circle key={`v-${i}`} cx={p.x} cy={p.y} r={gridVertexRadius} />)}</g>}
      </svg>
    );
  }

  return null;
};

export default ProceduralBackgroundRenderer;