
import React, { useState, useRef, useEffect } from 'react';
import type { CharacterParams, BackgroundOptions } from '../types';

interface CharacterCanvasProps {
  params: CharacterParams;
  backgroundOptions: BackgroundOptions;
}

// Helper to create a rounded polygon path
function createRoundedPolygonPath(points: {x: number, y: number}[], radius: number): string {
    if (points.length < 3) return '';
    if (radius <= 0) {
        return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
    }

    const pathData: (string | number)[] = [];
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p0 = points[(i - 1 + points.length) % points.length];

        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };

        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        const v1n = { x: v1.x / len1, y: v1.y / len1 };
        const v2n = { x: v2.x / len2, y: v2.y / len2 };

        const angle = Math.acos(v1n.x * v2n.x + v1n.y * v2n.y);
        const halfAngle = angle / 2;

        const tanHalfAngle = Math.tan(halfAngle);
        const dist = radius / tanHalfAngle;
        
        const maxDist = Math.min(len1 / 2, len2 / 2);
        const clampedDist = Math.min(dist, maxDist);

        const arcStartX = p1.x - clampedDist * v1n.x;
        const arcStartY = p1.y - clampedDist * v1n.y;
        const arcEndX = p1.x + clampedDist * v2n.x;
        const arcEndY = p1.y + clampedDist * v2n.y;

        if (i === 0) {
            pathData.push('M', arcStartX, arcStartY);
        } else {
            pathData.push('L', arcStartX, arcStartY);
        }
        pathData.push('Q', p1.x, p1.y, arcEndX, arcEndY);
    }
    pathData.push('Z');
    return pathData.join(' ');
}


const CharacterCanvas: React.FC<CharacterCanvasProps> = ({ params, backgroundOptions }) => {
  const {
    headWidth, headHeight, headShape, headCornerRadius, triangleCornerRadius,
    // FIX: Corrected typo from upperEylidCoverage to upperEyelidCoverage and lowerEyelidCoverage to lowerEyelidCoverage
    eyeSizeRatio, eyeSpacingRatio, pupilSizeRatio, upperEyelidCoverage, lowerEyelidCoverage, eyeStyle, eyeTracking, mouthWidthRatio, mouthYOffsetRatio, mouthIsFlipped,
    eyebrowWidthRatio, eyebrowHeightRatio, eyebrowYOffsetRatio, eyebrowAngle,
    neckHeight, neckWidthRatio, torsoHeight, torsoWidth, torsoShape, torsoCornerRadius,
    pelvisHeight, pelvisWidthRatio, pelvisShape,
    armLength, lArmWidth, rArmWidth, lHandSize, rHandSize, legLength, lLegWidth, rLegWidth, lFootSize, rFootSize,
    lArmAngle, rArmAngle, lArmBend, rArmBend,
    lLegAngle, rLegAngle, lLegBend, rLegBend,
    bodyColor, irisColor, outlineColor,
    pupilColor, bodyOutlines, eyeOutlines
  } = params;

  const outlineWidth = 4;

  const VIEWBOX_WIDTH = 400;
  const VIEWBOX_HEIGHT = 600;
  const centerX = VIEWBOX_WIDTH / 2;
  
  // --- Derived parameters for intuitive scaling ---
  const calculatedEyeSize = headHeight * (eyeSizeRatio / 100);
  const calculatedEyeSpacing = headWidth * (eyeSpacingRatio / 100);
  const calculatedPupilSize = calculatedEyeSize * (pupilSizeRatio / 100);
  const calculatedMouthWidth = headWidth * (mouthWidthRatio / 100);
  const calculatedMouthYOffset = (headHeight / 2) * (mouthYOffsetRatio / 100);
  const calculatedEyebrowWidth = headWidth * (eyebrowWidthRatio / 100);
  const calculatedEyebrowHeight = calculatedEyeSize * (eyebrowHeightRatio / 100);
  const calculatedEyebrowYOffset = headHeight * (eyebrowYOffsetRatio / 100);
  const calculatedNeckWidth = headWidth * (neckWidthRatio / 100);
  const calculatedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: VIEWBOX_WIDTH / 2, y: 120 });
  const [viewBox, setViewBox] = useState(`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    setCursorPos({ x: transformedPoint.x, y: transformedPoint.y });
  };


  // Y positions from top to bottom
  const headY = 120;
  const neckY = headY + headHeight / 2 - 10;
  const torsoTopY = neckY + neckHeight; // This is the visual top of the torso SVG shape.

  // --- Neck/Torso & Pelvis/Torso connection logic ---
  const getTorsoWidthAtY = (y: number) => {
    const yRel = y - torsoTopY;
    if (yRel < 0 || yRel > torsoHeight) return 0;
    
    switch (torsoShape) {
        case 'circle': {
            const rx = torsoWidth / 2;
            const ry = torsoHeight / 2;
            if (ry === 0) return torsoWidth;
            const centerY = torsoTopY + ry;
            const yDistFromCenter = Math.abs(y - centerY);
            if (yDistFromCenter > ry) return 0;
            return 2 * rx * Math.sqrt(1 - (yDistFromCenter / ry) ** 2);
        }
        case 'triangle':
            return torsoHeight > 0 ? torsoWidth * (yRel / torsoHeight) : 0;
        case 'inverted-triangle':
            return torsoHeight > 0 ? torsoWidth * (1 - (yRel / torsoHeight)) : torsoWidth;
        default: // rectangle, square
            return torsoWidth;
    }
  };

  let finalNeckWidth = calculatedNeckWidth;
  let neckConnectionY = torsoTopY;

  if (torsoShape === 'triangle' || torsoShape === 'circle') {
      const maxConnectionDepth = torsoHeight * 0.3;
      let foundConnection = false;
      
      for (let depth = 0; depth <= maxConnectionDepth; depth++) {
          const currentY = torsoTopY + depth;
          const widthAtY = getTorsoWidthAtY(currentY);
          if (widthAtY >= calculatedNeckWidth) {
              neckConnectionY = currentY;
              finalNeckWidth = calculatedNeckWidth;
              foundConnection = true;
              break;
          }
      }

      if (!foundConnection) {
          neckConnectionY = torsoTopY + maxConnectionDepth;
          finalNeckWidth = getTorsoWidthAtY(neckConnectionY);
      }
  } else {
      neckConnectionY = torsoTopY;
      finalNeckWidth = Math.min(calculatedNeckWidth, getTorsoWidthAtY(neckConnectionY));
  }

  const pelvisY = torsoTopY + torsoHeight - 10;
  const pelvisConnectionY = pelvisY + 5;
  const maxPelvisWidthAtConnection = getTorsoWidthAtY(pelvisConnectionY);
  const finalPelvisWidth = Math.min(calculatedPelvisWidth, maxPelvisWidthAtConnection * 1.05);
  const legY = pelvisY + pelvisHeight / 2;
  
  // --- Dynamic Limb Attachment ---
  const getShoulderAttachment = () => {
    const avgArmWidth = (lArmWidth + rArmWidth) / 2;
    switch (torsoShape) {
        case 'circle': {
            const rx = torsoWidth / 2;
            const ry = torsoHeight / 2;
            const torsoCenterY = torsoTopY + ry;
            const t = Math.PI / 180 * 135; 
            const y = torsoCenterY - ry * Math.sin(t);
            const xOffset = -rx * Math.cos(t);
            return { y, xOffset };
        }
        case 'triangle': {
            const y = torsoTopY + torsoHeight * 0.3;
            const armYOnTorso = y - torsoTopY;
            const xOffset = (armYOnTorso / torsoHeight) * (torsoWidth / 2);
            return { y, xOffset };
        }
        case 'inverted-triangle': {
            const y = torsoTopY + avgArmWidth * 0.5;
            const xOffset = torsoWidth / 2;
            return { y, xOffset };
        }
        case 'rectangle':
        case 'square':
        default: {
            const y = torsoTopY + avgArmWidth * 0.5;
            const xOffset = torsoWidth / 2;
            return { y, xOffset };
        }
    }
  };

  const { y: shoulderY, xOffset: shoulderXOffset } = getShoulderAttachment();

  // Arm and Leg Paths
  const lShoulder = { x: centerX - shoulderXOffset, y: shoulderY };
  const rShoulder = { x: centerX + shoulderXOffset, y: shoulderY };
  const lHip = { x: centerX - finalPelvisWidth/3, y: legY };
  const rHip = { x: centerX + finalPelvisWidth/3, y: legY };

  const createLimbPath = (start: {x: number, y: number}, length: number, angle: number, bend: number, dir: -1 | 1) => {
    const rad = angle * Math.PI / 180;
    const end = { 
      x: start.x + dir * length * Math.sin(rad), 
      y: start.y + length * Math.cos(rad) 
    };
    
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const control = { x: mid.x, y: mid.y };
    if (dist > 1e-6) {
      const perpDx = -dy / dist; // Normalized perpendicular vector
      const perpDy = dx / dist;
      control.x = mid.x + perpDx * bend;
      control.y = mid.y + perpDy * bend;
    }

    const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
    return { path, end, control };
  };

  const { path: lArmPath, end: lWrist, control: lArmControl } = createLimbPath(lShoulder, armLength, lArmAngle, lArmBend, -1);
  const { path: rArmPath, end: rWrist, control: rArmControl } = createLimbPath(rShoulder, armLength, rArmAngle, rArmBend, 1);
  const { path: lLegPath, end: lAnkle, control: lLegControl } = createLimbPath(lHip, legLength, lLegAngle, lLegBend, -1);
  const { path: rLegPath, end: rAnkle, control: rLegControl } = createLimbPath(rHip, legLength, rLegAngle, rLegBend, 1);


  // --- Face calculations ---
  const eyeYPos = headY;
  const leftEyeX = centerX - calculatedEyeSpacing;
  const rightEyeX = centerX + calculatedEyeSpacing;
  
  // Base dimensions
  const eyeRy = calculatedEyeSize;
  const baseEyeRx = eyeRy * 0.85;

  // Eye Collision & Squashing: Cap the horizontal radius to prevent overlap
  const eyeRx = Math.min(baseEyeRx, calculatedEyeSpacing);
  
  const irisRy = eyeRy * 0.7;
  const irisRx = eyeRx * 0.7; // Iris squashes with the eye

  const pupilRy = calculatedPupilSize;
  // Pupil also squashes proportionally to the main eye shape
  const pupilRx = pupilRy * (eyeRx / eyeRy);
  
  // --- Eye Tracking ---
  const getPupilOffset = (eyeCenterX: number, eyeCenterY: number) => {
    if (!eyeTracking) return { x: 0, y: 0 };
    const dx = cursorPos.x - eyeCenterX;
    const dy = cursorPos.y - eyeCenterY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const maxTravelX = irisRx - pupilRx;
    const maxTravelY = irisRy - pupilRy;
    const effectiveDist = headWidth; // Distance for full eye rotation
    const ratio = Math.min(1, dist / effectiveDist);

    return {
      x: Math.cos(angle) * maxTravelX * ratio,
      y: Math.sin(angle) * maxTravelY * ratio,
    };
  };

  const leftPupilOffset = getPupilOffset(leftEyeX, eyeYPos);
  const rightPupilOffset = getPupilOffset(rightEyeX, eyeYPos);
  
  const glintRadius = calculatedEyeSize * 0.2;
  const glintOffsetX = eyeRx * 0.3;
  const glintOffsetY = eyeRy * 0.3;
  const finalEyebrowYOffset = Math.max(calculatedEyebrowYOffset, eyeRy + calculatedEyebrowHeight / 2 + 5);
  const eyebrowY = eyeYPos - finalEyebrowYOffset;
  const mouthYPos = headY + calculatedMouthYOffset;
  const mouthCurvature = calculatedMouthWidth * 0.25 * (mouthIsFlipped ? -1 : 1);
  const mouthPath = `M ${centerX - calculatedMouthWidth / 2} ${mouthYPos} Q ${centerX} ${mouthYPos + mouthCurvature} ${centerX + calculatedMouthWidth / 2} ${mouthYPos}`;

  // --- Eye clip-path calculation ---
  const createEyeClipPath = (eyeX: number, eyeRx: number, eyeRy: number, style: 'realistic' | 'blocky') => {
    if (style === 'realistic') {
      const leftPointX = eyeX - eyeRx;
      const rightPointX = eyeX + eyeRx;
      const verticalCenterY = eyeYPos;
      const upperControlY = (eyeYPos - eyeRy) + (2 * eyeRy * upperEyelidCoverage) / 100;
      const lowerControlY = (eyeYPos + eyeRy) - (2 * eyeRy * lowerEyelidCoverage) / 100;

      if (upperControlY >= lowerControlY) {
        const midY = (upperControlY + lowerControlY) / 2;
        return `M ${leftPointX},${midY} L ${rightPointX},${midY} Z`;
      }
      return `M ${leftPointX},${verticalCenterY} Q ${eyeX},${upperControlY} ${rightPointX},${verticalCenterY} Q ${eyeX},${lowerControlY} ${leftPointX},${verticalCenterY} Z`;
    } else { // 'blocky' style
      const eyeTopY = eyeYPos - eyeRy;
      const eyeBottomY = eyeYPos + eyeRy;

      const getXforY = (y: number) => {
          const y_clamped = Math.max(eyeTopY, Math.min(eyeBottomY, y));
          const y_term = (y_clamped - eyeYPos) / eyeRy;
          const x_offset_sq = Math.max(0, 1 - y_term * y_term);
          const x_offset = eyeRx * Math.sqrt(x_offset_sq);
          return { x1: eyeX - x_offset, x2: eyeX + x_offset };
      };
      
      const upperCoverage = Math.min(upperEyelidCoverage, 100) / 100;
      const lowerCoverage = Math.min(lowerEyelidCoverage, 100) / 100;
      let upperLidY = eyeTopY + 2 * eyeRy * upperCoverage * 0.5;
      let lowerLidY = eyeBottomY - 2 * eyeRy * lowerCoverage * 0.5;

      if (upperLidY >= lowerLidY) {
        const midY = (upperLidY + lowerLidY) / 2;
        const midPoints = getXforY(midY);
        return `M ${midPoints.x1},${midY} L ${midPoints.x2},${midY} Z`;
      }

      const hasUpperLid = upperEyelidCoverage > 0.1;
      const hasLowerLid = lowerEyelidCoverage > 0.1;
      const upperPoints = getXforY(upperLidY);
      const lowerPoints = getXforY(lowerLidY);
      
      let path = `M ${upperPoints.x1} ${upperLidY}`;

      if (hasUpperLid) {
          path += ` L ${upperPoints.x2} ${upperLidY}`;
      } else {
          path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${upperPoints.x2} ${upperLidY}`;
      }
      path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${lowerPoints.x2} ${lowerLidY}`;
      if (hasLowerLid) {
          path += ` L ${lowerPoints.x1} ${lowerLidY}`;
      } else {
          path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${lowerPoints.x1} ${lowerLidY}`;
      }
      path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${upperPoints.x1} ${upperLidY}`;
      path += ' Z';
      
      return path;
    }
  };

  const leftEyeClipPathD = createEyeClipPath(leftEyeX, eyeRx, eyeRy, eyeStyle);
  const rightEyeClipPathD = createEyeClipPath(rightEyeX, eyeRx, eyeRy, eyeStyle);

  const headTop = { x: centerX, y: headY - headHeight / 2 };
  const headBottomLeft = { x: centerX - headWidth / 2, y: headY + headHeight / 2 };
  const headBottomRight = { x: centerX + headWidth / 2, y: headY + headHeight / 2 };
  const headTopLeft = { x: centerX - headWidth / 2, y: headY - headHeight / 2 };
  const headTopRight = { x: centerX + headWidth / 2, y: headY - headHeight / 2 };
  const headBottom = { x: centerX, y: headY + headHeight / 2 };
  
  const torsoCY = torsoTopY + torsoHeight / 2;
  const torsoTop = { x: centerX, y: torsoTopY };
  const torsoBottomLeft = { x: centerX - torsoWidth / 2, y: torsoTopY + torsoHeight };
  const torsoBottomRight = { x: centerX + torsoWidth / 2, y: torsoTopY + torsoHeight };
  const torsoTopLeft = { x: centerX - torsoWidth / 2, y: torsoTopY };
  const torsoTopRight = { x: centerX + torsoWidth / 2, y: torsoTopY };
  const torsoBottom = { x: centerX, y: torsoTopY + torsoHeight };

  useEffect(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    const expandBBox = (points: {x: number, y: number}[], strokeWidth = 0) => {
        for (const p of points) {
            minX = Math.min(minX, p.x - strokeWidth / 2);
            maxX = Math.max(maxX, p.x + strokeWidth / 2);
            minY = Math.min(minY, p.y - strokeWidth / 2);
            maxY = Math.max(maxY, p.y + strokeWidth / 2);
        }
    };

    // Head BBox
    switch (headShape) {
      case 'circle': expandBBox([{x: centerX - headWidth/2, y: headY - headWidth/2}, {x: centerX + headWidth/2, y: headY + headWidth/2}]); break;
      case 'square': expandBBox([{x: centerX - headWidth/2, y: headY - headWidth/2}, {x: centerX + headWidth/2, y: headY + headWidth/2}]); break;
      case 'triangle': expandBBox([headTop, headBottomLeft, headBottomRight]); break;
      case 'inverted-triangle': expandBBox([headTopLeft, headTopRight, headBottom]); break;
      case 'ellipse': default: expandBBox([{x: centerX - headWidth/2, y: headY - headHeight/2}, {x: centerX + headWidth/2, y: headY + headHeight/2}]); break;
    }

    // Body BBox
    const neckRenderHeight = neckConnectionY - neckY;
    expandBBox([{x: centerX - finalNeckWidth/2, y: neckY}, {x: centerX + finalNeckWidth/2, y: neckY + neckRenderHeight + 5}]); // Neck
    switch (torsoShape) {
        case 'circle': expandBBox([{x: centerX - torsoWidth/2, y: torsoCY - torsoHeight/2}, {x: centerX + torsoWidth/2, y: torsoCY + torsoHeight/2}]); break;
        case 'square': expandBBox([{x: centerX - torsoWidth/2, y: torsoTopY}, {x: centerX + torsoWidth/2, y: torsoTopY + torsoWidth}]); break;
        case 'triangle': expandBBox([torsoTop, torsoBottomLeft, torsoBottomRight]); break;
        case 'inverted-triangle': expandBBox([torsoTopLeft, torsoTopRight, torsoBottom]); break;
        case 'rectangle': default: expandBBox([{x: centerX - torsoWidth/2, y: torsoTopY}, {x: centerX + torsoWidth/2, y: torsoTopY + torsoHeight}]); break;
    }
    const pelvisBottomY = pelvisY + pelvisHeight;
    const pelvisCY = pelvisY + pelvisHeight/2;
    switch(pelvisShape) {
        case 'horizontal-oval': expandBBox([{x: centerX - finalPelvisWidth/2, y: pelvisCY - pelvisHeight/2}, {x: centerX + finalPelvisWidth/2, y: pelvisCY + pelvisHeight/2}]); break;
        case 'inverted-triangle': expandBBox([{x:centerX - finalPelvisWidth/2, y: pelvisY}, {x:centerX + finalPelvisWidth/2, y: pelvisBottomY}]); break;
        case 'rectangle': default: expandBBox([{x: centerX - finalPelvisWidth/2, y: pelvisY}, {x:centerX + finalPelvisWidth/2, y: pelvisBottomY}]); break;
    }

    // Limbs BBox
    expandBBox([lShoulder, lArmControl, lWrist], lArmWidth);
    expandBBox([rShoulder, rArmControl, rWrist], rArmWidth);
    expandBBox([lHip, lLegControl, lAnkle], lLegWidth);
    expandBBox([rHip, rLegControl, rAnkle], rLegWidth);

    // Hands & Feet BBox
    expandBBox([{x: lWrist.x - lHandSize/2, y: lWrist.y - lHandSize/2}, {x: lWrist.x + lHandSize/2, y: lWrist.y + lHandSize/2}]);
    expandBBox([{x: rWrist.x - rHandSize/2, y: rWrist.y - rHandSize/2}, {x: rWrist.x + rHandSize/2, y: rWrist.y + rHandSize/2}]);
    expandBBox([{x: lAnkle.x - lFootSize/1.5, y: lAnkle.y + lFootSize/4 - lFootSize/2.5}, {x: lAnkle.x + lFootSize/1.5, y: lAnkle.y + lFootSize/4 + lFootSize/2.5}]);
    expandBBox([{x: rAnkle.x - rFootSize/1.5, y: rAnkle.y + rFootSize/4 - rFootSize/2.5}, {x: rAnkle.x + rFootSize/1.5, y: rAnkle.y + rFootSize/4 + rFootSize/2.5}]);

    const PADDING = 20;
    const charMinX = minX - PADDING;
    const charMaxX = maxX + PADDING;
    const charMinY = minY - PADDING;
    const charMaxY = maxY + PADDING;

    const originalViewBox = { x: 0, y: 0, width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT };
    
    if (charMinX < originalViewBox.x || charMaxX > originalViewBox.width || charMinY < originalViewBox.y || charMaxY > originalViewBox.height) {
        let charWidth = charMaxX - charMinX;
        let charHeight = charMaxY - charMinY;
        const requiredAspectRatio = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

        if (charWidth / charHeight > requiredAspectRatio) {
            const newHeight = charWidth / requiredAspectRatio;
            const dy = (newHeight - charHeight) / 2;
            minY -= dy;
            charHeight = newHeight;
        } else {
            const newWidth = charHeight * requiredAspectRatio;
            const dx = (newWidth - charWidth) / 2;
            minX -= dx;
            charWidth = newWidth;
        }
        setViewBox(`${minX} ${minY} ${charWidth} ${charHeight}`);
    } else {
        setViewBox(`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
    }

  }, [params]); // This effect depends on all character parameters

  const renderHead = () => {
    const props = { fill: bodyColor, strokeLinejoin: 'round' as const };
    switch (headShape) {
      case 'circle': return <circle cx={centerX} cy={headY} r={headWidth / 2} {...props} />;
      case 'square': return <rect x={centerX - headWidth/2} y={headY - headWidth/2} width={headWidth} height={headWidth} rx={headCornerRadius} {...props} />;
      case 'triangle':
        const triPath = createRoundedPolygonPath([headTop, headBottomLeft, headBottomRight], triangleCornerRadius);
        return <path d={triPath} {...props} />;
      case 'inverted-triangle':
        const invTriPath = createRoundedPolygonPath([headTopLeft, headTopRight, headBottom], triangleCornerRadius);
        return <path d={invTriPath} {...props} />;
      case 'ellipse':
      default: return <ellipse cx={centerX} cy={headY} rx={headWidth / 2} ry={headHeight / 2} {...props} />;
    }
  };

  const renderTorso = () => {
    const props = { fill: bodyColor, strokeLinejoin: 'round' as const };
    switch (torsoShape) {
      case 'circle': return <ellipse cx={centerX} cy={torsoCY} rx={torsoWidth / 2} ry={torsoHeight / 2} {...props} />;
      case 'square': return <rect x={centerX - torsoWidth/2} y={torsoTopY} width={torsoWidth} height={torsoWidth} rx={torsoCornerRadius} {...props} />;
      case 'triangle':
        const triPath = createRoundedPolygonPath([torsoTop, torsoBottomLeft, torsoBottomRight], triangleCornerRadius);
        return <path d={triPath} {...props} />;
      case 'inverted-triangle':
        const invTriPath = createRoundedPolygonPath([torsoTopLeft, torsoTopRight, torsoBottom], triangleCornerRadius);
        return <path d={invTriPath} {...props} />;
      case 'rectangle':
      default: return <rect x={centerX - torsoWidth/2} y={torsoTopY} width={torsoWidth} height={torsoHeight} rx={torsoCornerRadius} {...props} />;
    }
  };
  
  const renderNeck = () => {
    // Render a simple rectangle that slightly overlaps the head.
    // The outline filter will merge the shapes to create a seamless joint.
    const neckRenderHeight = neckConnectionY - neckY;
    const overlap = 5; // Ensures a clean merge for the outline filter.
    return (
      <rect
        x={centerX - finalNeckWidth / 2}
        y={neckY}
        width={finalNeckWidth}
        height={neckRenderHeight + overlap}
        fill={bodyColor}
        rx={finalNeckWidth * 0.1}
      />
    );
  };

  const renderPelvis = () => {
    const props = { fill: bodyColor, strokeLinejoin: 'round' as const };
    const pelvisBottomY = pelvisY + pelvisHeight;

    if (torsoShape === 'inverted-triangle') {
        const topWidth = Math.max(1, triangleCornerRadius * 0.5); 
        const pelvisPath = `
            M ${centerX - topWidth / 2} ${pelvisY}
            L ${centerX + topWidth / 2} ${pelvisY}
            L ${centerX + finalPelvisWidth / 2} ${pelvisBottomY}
            L ${centerX - finalPelvisWidth / 2} ${pelvisBottomY}
            Z
        `;
        return <path d={pelvisPath} {...props} />;
    }

    const pelvisCY = pelvisY + pelvisHeight / 2;
    switch (pelvisShape) {
        case 'horizontal-oval':
            return <ellipse cx={centerX} cy={pelvisCY} rx={finalPelvisWidth / 2} ry={pelvisHeight / 2} {...props} />;
        case 'inverted-triangle':
            const invTriPoints = [
                { x: centerX - finalPelvisWidth / 2, y: pelvisY },
                { x: centerX + finalPelvisWidth / 2, y: pelvisY },
                { x: centerX, y: pelvisBottomY }
            ];
            return <path d={createRoundedPolygonPath(invTriPoints, 10)} {...props} />;
        case 'rectangle':
        default:
            return <rect x={centerX - finalPelvisWidth / 2} y={pelvisY} width={finalPelvisWidth} height={pelvisHeight} rx="10" {...props} />;
    }
  };

  return (
    <svg
      ref={svgRef}
      onMouseMove={handleMouseMove}
      viewBox={viewBox}
      className="w-full h-full max-w-lg aspect-[2/3]"
      aria-label="Generated 2D character"
    >
      <defs>
        <pattern id="checkerboard" patternUnits="userSpaceOnUse" width="40" height="40">
           {backgroundOptions.animation && (
             <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="-40 40" dur="4s" repeatCount="indefinite" />
           )}
          <rect width="20" height="20" x="0" y="0" fill={backgroundOptions.color1} />
          <rect width="20" height="20" x="20" y="0" fill={backgroundOptions.color2} />
          <rect width="20" height="20" x="0" y="20" fill={backgroundOptions.color2} />
          <rect width="20" height="20" x="20" y="20" fill={backgroundOptions.color1} />
        </pattern>
        <clipPath id="leftEyeClip"><path d={leftEyeClipPathD} /></clipPath>
        <clipPath id="rightEyeClip"><path d={rightEyeClipPathD} /></clipPath>
        <filter id="body-outline-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius={outlineWidth / 2} />
            <feFlood floodColor={outlineColor} result="colored" />
            <feComposite in="colored" in2="dilated" operator="in" result="outline" />
            <feMerge>
                <feMergeNode in="outline" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
      </defs>
      <rect x={viewBox.split(' ')[0]} y={viewBox.split(' ')[1]} width="100%" height="100%" fill="url(#checkerboard)" />

      <g>
        <g filter={bodyOutlines ? `url(#body-outline-filter)` : 'none'}>
          {/* Feet */}
          <ellipse cx={lAnkle.x} cy={lAnkle.y + lFootSize/4} rx={lFootSize / 1.5} ry={lFootSize / 2.5} fill={bodyColor} />
          <ellipse cx={rAnkle.x} cy={rAnkle.y + rFootSize/4} rx={rFootSize / 1.5} ry={rFootSize / 2.5} fill={bodyColor} />
          {/* Limbs */}
          <path d={lLegPath} fill="none" stroke={bodyColor} strokeWidth={lLegWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d={rLegPath} fill="none" stroke={bodyColor} strokeWidth={rLegWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d={lArmPath} fill="none" stroke={bodyColor} strokeWidth={lArmWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d={rArmPath} fill="none" stroke={bodyColor} strokeWidth={rArmWidth} strokeLinecap="round" strokeLinejoin="round" />
          {/* Hands */}
          <circle cx={lWrist.x} cy={lWrist.y} r={lHandSize/2} fill={bodyColor} />
          <circle cx={rWrist.x} cy={rWrist.y} r={rHandSize/2} fill={bodyColor} />
          {/* Core Body */}
          {renderNeck()}
          {renderTorso()}
          {renderPelvis()}
          {renderHead()}
        </g>
        
        <g>
          {/* Left Eye */}
          <g>
            <g clipPath="url(#leftEyeClip)">
              <ellipse cx={leftEyeX} cy={eyeYPos} rx={eyeRx} ry={eyeRy} fill="white" />
              <ellipse cx={leftEyeX + leftPupilOffset.x} cy={eyeYPos + leftPupilOffset.y} rx={irisRx} ry={irisRy} fill={irisColor} />
              <ellipse cx={leftEyeX + leftPupilOffset.x} cy={eyeYPos + leftPupilOffset.y} rx={pupilRx} ry={pupilRy} fill={pupilColor} />
              <circle cx={leftEyeX + glintOffsetX + leftPupilOffset.x * 0.5} cy={eyeYPos - glintOffsetY + leftPupilOffset.y * 0.5} r={glintRadius} fill="white" />
            </g>
            {eyeOutlines && <path d={leftEyeClipPathD} fill="none" stroke={outlineColor} strokeWidth={outlineWidth / 2} strokeLinejoin="round" />}
          </g>
          {/* Right Eye */}
          <g>
            <g clipPath="url(#rightEyeClip)">
              <ellipse cx={rightEyeX} cy={eyeYPos} rx={eyeRx} ry={eyeRy} fill="white" />
              <ellipse cx={rightEyeX + rightPupilOffset.x} cy={eyeYPos + rightPupilOffset.y} rx={irisRx} ry={irisRy} fill={irisColor} />
              <ellipse cx={rightEyeX + rightPupilOffset.x} cy={eyeYPos + rightPupilOffset.y} rx={pupilRx} ry={pupilRy} fill={pupilColor} />
              <circle cx={rightEyeX + glintOffsetX + rightPupilOffset.x * 0.5} cy={eyeYPos - glintOffsetY + rightPupilOffset.y * 0.5} r={glintRadius} fill="white" />
            </g>
            {eyeOutlines && <path d={rightEyeClipPathD} fill="none" stroke={outlineColor} strokeWidth={outlineWidth / 2} strokeLinejoin="round" />}
          </g>
        </g>
        
        <g transform={`translate(${leftEyeX}, ${eyebrowY}) rotate(${eyebrowAngle})`}>
          <rect x={-calculatedEyebrowWidth / 2} y={-calculatedEyebrowHeight / 2} width={calculatedEyebrowWidth} height={calculatedEyebrowHeight} fill={pupilColor} rx={2} />
        </g>
        <g transform={`translate(${rightEyeX}, ${eyebrowY}) rotate(${-eyebrowAngle})`}>
          <rect x={-calculatedEyebrowWidth / 2} y={-calculatedEyebrowHeight / 2} width={calculatedEyebrowWidth} height={calculatedEyebrowHeight} fill={pupilColor} rx={2} />
        </g>

        <path d={mouthPath} stroke={pupilColor} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export default CharacterCanvas;
