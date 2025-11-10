import React from 'react';
import type { ProceduralBackground } from '../types';

interface ProceduralBackgroundRendererProps {
  background: ProceduralBackground;
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


const ProceduralBackgroundRenderer: React.FC<ProceduralBackgroundRendererProps> = ({ background }) => {
  const { type, sky, ground, horizon, room, canvasWidth, canvasHeight, gridVisible, gridColor, gridDensity, gridStrokeWidth, fogEnabled, fogColor, fogDensity, gridHorizonFade } = background;

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
        const randomness = (Math.random() - 0.5) * height * 0.8;
        const mountainYOffset = Math.sin(x / (canvasWidth / (Math.PI * 2))) * height * 0.5 + height * 0.5 + randomness;
        // This is the fix: ensure the mountain point is always at or above the horizon
        y = clampedHorizonY - Math.max(0, mountainYOffset);
      }
      path += ` L ${x} ${y}`;
    }
    
    path += ` L ${canvasWidth} ${clampedHorizonY} Z`;
    return path;
  };

  const gridLines: React.ReactNode[] = [];
  if (gridVisible) {
    const skyScale = vpY;
    
    // Orthogonal step is now based on canvas width for consistent density feel
    const groundStep = canvasWidth / gridDensity;

    // Transversals (Horizontal lines)
    for (let i = 0; ; i++) {
      const z = 1 + Math.pow(i / gridDensity, 1.8);
      const y_ground = vpY + (canvasHeight - vpY) / z;
      if (y_ground > canvasHeight + 1) break;
      gridLines.push(<line key={`trans-g-${i}`} x1={0} y1={y_ground} x2={canvasWidth} y2={y_ground} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity="0.7" />);
      
      const y_sky = vpY - skyScale / z;
      if (y_sky < -1) break;
      gridLines.push(<line key={`trans-s-${i}`} x1={0} y1={y_sky} x2={canvasWidth} y2={y_sky} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity="0.7" />);
      
      if (i > gridDensity * 20) break; // Safety break
    }

    // Orthogonals (Radial lines)
    for (let i = 0; ; i++) {
      if (i === 0) {
        // Center vertical line
        gridLines.push(<line key={`ortho-c`} x1={vpX} y1={0} x2={vpX} y2={canvasHeight} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity="0.7" />);
      } else {
        // Lines to the right
        const x_at_bottom_r = vpX + i * groundStep;
        if (Math.abs(x_at_bottom_r - vpX) > 0.01) {
          const slope_r = (canvasHeight - vpY) / (x_at_bottom_r - vpX);
          const x_at_top_r = vpX - vpY / slope_r;
          gridLines.push(<line key={`ortho-r-${i}`} x1={x_at_bottom_r} y1={canvasHeight} x2={x_at_top_r} y2={0} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity="0.7" />);
        }

        // Lines to the left
        const x_at_bottom_l = vpX - i * groundStep;
        if (Math.abs(x_at_bottom_l - vpX) > 0.01) {
          const slope_l = (canvasHeight - vpY) / (x_at_bottom_l - vpX);
          const x_at_top_l = vpX - vpY / slope_l;
          gridLines.push(<line key={`ortho-l-${i}`} x1={x_at_bottom_l} y1={canvasHeight} x2={x_at_top_l} y2={0} stroke={gridColor} strokeWidth={gridStrokeWidth} opacity="0.7" />);
        }
      }
      
      // New robust break condition: stop when the next line to be drawn is fully offscreen
      const next_x_at_bottom_r = vpX + (i + 1) * groundStep;
      const next_slope_r = (canvasHeight - vpY) / (next_x_at_bottom_r - vpX);
      const next_x_at_top_r = vpX - vpY / next_slope_r;
      
      const next_x_at_bottom_l = vpX - (i + 1) * groundStep;
      const next_slope_l = (canvasHeight - vpY) / (next_x_at_bottom_l - vpX);
      const next_x_at_top_l = vpX - vpY / next_slope_l;

      // Break if both left and right lines are completely out of the [0, canvasWidth] bounds
      if ((next_x_at_bottom_r > canvasWidth && next_x_at_top_r > canvasWidth) &&
          (next_x_at_bottom_l < 0 && next_x_at_top_l < 0)) {
        break;
      }

      // Safety break for extreme cases
      if (i > 300) break;
    }
  }


  if (type === 'exterior') {
    const gradientId = `sky-gradient-${background.id}`;
    const skyClipId = `sky-clip-${background.id}`;
    const gridMaskId = `grid-horizon-mask-${background.id}`;
    const groundMaskGradId = `ground-mask-grad-${background.id}`;
    const skyMaskGradId = `sky-mask-grad-${background.id}`;
    const fogGroundGradId = `fog-ground-grad-${background.id}`;
    const fogSkyGradId = `fog-sky-grad-${background.id}`;
    const fadeAmount = (gridHorizonFade / 100) * 0.5; // Map 0-100 to a 0-0.5 offset
    
    const clouds = [];
    const numClouds = Math.floor(sky.cloudDensity / 100 * 50);
    for (let i = 0; i < numClouds; i++) {
        const yRatio = Math.random();
        const cy = clampedHorizonY * yRatio; 
        const perspectiveFactor = Math.pow(1 - yRatio, 2);
        const baseSize = canvasWidth * 0.08;
        const ry = Math.max(2, baseSize * perspectiveFactor * 0.5);
        const rx = ry * (1 + 4 * yRatio);
        const cx = Math.random() * canvasWidth * 1.4 - canvasWidth * 0.2;
        clouds.push(<ellipse key={`cloud-${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={sky.cloudColor} opacity={0.7 + Math.random() * 0.2} />);
    }
    
    const mountains = [];
    if (horizon.mountainsVisible) {
        for (let i = horizon.mountainLayers - 1; i >= 0; i--) {
            const layerRatio = i / horizon.mountainLayers;
            const color = lerpColor(horizon.mountainColor, sky.bottomColor, (1 - layerRatio) * 0.6);
            mountains.push(<path key={`mountain-${i}`} d={generateMountainPath(i)} fill={color} />);
        }
    }

    const trees: { id: string; trunk: { x: number; y: number; width: number; height: number; }; foliage: { cx: number; cy: number; r: number; }; y: number; }[] = [];
    if (horizon.treesVisible) {
        for (let i = 0; i < horizon.treeCount; i++) {
            const depth = Math.pow(Math.random(), 2);
            const y = clampedHorizonY + (canvasHeight - clampedHorizonY) * depth;
            const perspectiveScale = depth * 0.5 + 0.05;
            const xSpread = canvasWidth * (1 + depth * 0.5);
            const x = (Math.random() - 0.5) * xSpread + canvasWidth / 2;

            const sizeVariation = 1 + (Math.random() - 0.5) * (horizon.treeVariation / 100);
            const baseSize = horizon.treeSize;
            const finalSize = baseSize * perspectiveScale * sizeVariation;
            if (finalSize < 2) continue;

            const trunkHeight = finalSize * 1.2;
            const trunkWidth = Math.max(1, finalSize * 0.2);
            const foliageRadius = finalSize / 2;

            const trunkX = x - trunkWidth / 2;
            const foliageY = y - trunkHeight;

            trees.push({
                id: `tree-${i}`,
                trunk: { x: trunkX, y: foliageY, width: trunkWidth, height: trunkHeight },
                foliage: { cx: x, cy: foliageY, r: foliageRadius },
                y: y
            });
        }
        trees.sort((a, b) => a.y - b.y);
    }

    const houses: any[] = [];
    if (horizon.housesVisible) {
        for (let i = 0; i < horizon.houseCount; i++) {
            const depth = Math.pow(Math.random(), 1.5) * 0.8 + 0.05; // 0.05 to 0.85, biased towards farther away
            const y = clampedHorizonY + (canvasHeight - clampedHorizonY) * depth;
            const perspectiveScale = depth * 0.25 + 0.02;

            const xSpread = canvasWidth * 1.2;
            const x = (Math.random() - 0.5) * xSpread + canvasWidth / 2;
            
            const sizeVariation = 1 + (Math.random() - 0.5) * 0.5;
            const baseSize = horizon.houseSize;
            const finalSize = baseSize * perspectiveScale * sizeVariation;

            if (finalSize < 3) continue;

            const houseWidth = finalSize;
            const houseHeight = finalSize * 0.8;

            const houseX = x - houseWidth / 2;
            const houseY = y - houseHeight;
            
            const roofHeight = houseHeight * 0.7;
            const roofPath = `M ${houseX} ${houseY} L ${houseX + houseWidth / 2} ${houseY - roofHeight} L ${houseX + houseWidth} ${houseY} Z`;

            const colorVar = (Math.random() - 0.5) * (horizon.houseColorVariation / 100) * 2;
            const houseColor = lerpColor(horizon.houseColor, colorVar > 0 ? '#FFFFFF' : '#000000', Math.abs(colorVar * 10));

            houses.push({
                id: `house-${i}`,
                y, // for sorting
                body: { x: houseX, y: houseY, width: houseWidth, height: houseHeight, fill: houseColor },
                roof: { d: roofPath, fill: lerpColor(houseColor, '#000000', 0.2) }
            });
        }
        houses.sort((a, b) => a.y - b.y);
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: sky.topColor }} />
            <stop offset="100%" style={{ stopColor: sky.bottomColor }} />
          </linearGradient>
           <clipPath id={skyClipId}>
            <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} />
          </clipPath>
          
          {gridVisible && (
            <mask id={gridMaskId}>
              {/* Mask for ground grid, fades from transparent at horizon to opaque */}
              <linearGradient id={groundMaskGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="white" stopOpacity="0" />
                  <stop offset={fadeAmount} stopColor="white" stopOpacity="1" />
              </linearGradient>
              <rect x="0" y={clampedHorizonY} width={canvasWidth} height={canvasHeight - clampedHorizonY} fill={`url(#${groundMaskGradId})`} />

              {/* Mask for sky grid, fades from transparent at horizon to opaque */}
              <linearGradient id={skyMaskGradId} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="white" stopOpacity="0" />
                  <stop offset={fadeAmount} stopColor="white" stopOpacity="1" />
              </linearGradient>
              <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} fill={`url(#${skyMaskGradId})`} />
            </mask>
          )}

          {fogEnabled && (
            <>
              <linearGradient id={fogGroundGradId} x1="0" y1={clampedHorizonY} x2="0" y2={canvasHeight} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={fogColor} stopOpacity={fogDensity / 100} />
                <stop offset="70%" stopColor={fogColor} stopOpacity="0" />
              </linearGradient>
              <linearGradient id={fogSkyGradId} x1="0" y1={clampedHorizonY} x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={fogColor} stopOpacity={fogDensity / 100} />
                <stop offset="70%" stopColor={fogColor} stopOpacity="0" />
              </linearGradient>
            </>
          )}
        </defs>
        
        {/* Render Order: Sky -> Ground -> Clouds -> Mountains -> Houses -> Trees -> Fog -> Grid */}
        <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} fill={`url(#${gradientId})`} />
        <rect x="0" y={clampedHorizonY - 1} width={canvasWidth} height={canvasHeight - clampedHorizonY + 1} fill={ground.color} />
        <g clipPath={`url(#${skyClipId})`}>{clouds}</g>
        {mountains}
        
        {houses.map(house => (
            <g key={house.id}>
                <rect {...house.body} />
                <path {...house.roof} />
            </g>
        ))}

        {trees.map(tree => (
            <g key={tree.id}>
                <rect {...tree.trunk} fill={lerpColor(horizon.treeColor, '#000000', 0.4)} />
                <circle {...tree.foliage} fill={horizon.treeColor} />
            </g>
        ))}

        {fogEnabled && (
          <g>
            <rect x="0" y={clampedHorizonY} width={canvasWidth} height={canvasHeight - clampedHorizonY} fill={`url(#${fogGroundGradId})`} />
            <rect x="0" y="0" width={canvasWidth} height={clampedHorizonY} fill={`url(#${fogSkyGradId})`} />
          </g>
        )}
        
        {gridVisible && <g mask={`url(#${gridMaskId})`}>{gridLines}</g>}
      </svg>
    );
  }

  if (type === 'interior') {
    // How far "into" the screen the back wall is. 0 = on the canvas, 1 = at the vanishing point.
    // A value of 0.6 means the back wall is 60% of the way to the VP.
    const depthRatio = 0.6;
    const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

    // Calculate back wall corners by interpolating from canvas corners to the vanishing point.
    // This ensures the back wall is always correctly placed within the perspective lines.
    const p1 = { x: lerp(0, vpX, depthRatio), y: lerp(0, vpY, depthRatio) }; // top-left
    const p2 = { x: lerp(canvasWidth, vpX, depthRatio), y: lerp(0, vpY, depthRatio) }; // top-right
    const p3 = { x: lerp(canvasWidth, vpX, depthRatio), y: lerp(canvasHeight, vpY, depthRatio) }; // bottom-right
    const p4 = { x: lerp(0, vpX, depthRatio), y: lerp(canvasHeight, vpY, depthRatio) }; // bottom-left

    const backWallPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    const ceilingPath = `M 0 0 L ${canvasWidth} 0 L ${p2.x} ${p2.y} L ${p1.x} ${p1.y} Z`;
    const floorPath = `M 0 ${canvasHeight} L ${canvasWidth} ${canvasHeight} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
    const leftWallPath = `M 0 0 L ${p1.x} ${p1.y} L ${p4.x} ${p4.y} L 0 ${canvasHeight} Z`;
    const rightWallPath = `M ${canvasWidth} 0 L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${canvasWidth} ${canvasHeight} Z`;

     return (
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        {room.ceilingVisible && <path d={ceilingPath} fill={room.ceilingColor || '#FFFFFF'} />}
        <path d={floorPath} fill={room.floorColor} />
        <path d={leftWallPath} fill={room.wallColor} />
        <path d={rightWallPath} fill={lerpColor(room.wallColor, '#000000', 0.05)} />
        <path d={backWallPath} fill={lerpColor(room.wallColor, '#000000', 0.1)} />
        {gridVisible && <g>{gridLines}</g>}
      </svg>
    );
  }

  return null;
};

export default ProceduralBackgroundRenderer;