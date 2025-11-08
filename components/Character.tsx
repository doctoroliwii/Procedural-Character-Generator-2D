import React, { useMemo } from 'react';
import type { CharacterInstance, CharacterParams } from '../types';

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


const VIEWBOX_WIDTH_BASE = 400;
const VIEWBOX_HEIGHT = 700;

const getEyeClipPathData = (params: CharacterParams) => {
      const { headHeight, eyeSizeRatio, eyeSpacingRatio, upperEyelidCoverage, lowerEyelidCoverage, eyeStyle, headWidth } = params;
      const centerX = VIEWBOX_WIDTH_BASE / 2;
      const headY = 120;
      const eyeYPos = headY;
      const calculatedEyeSize = headHeight * (eyeSizeRatio / 100);
      const calculatedEyeSpacing = headWidth * (eyeSpacingRatio / 100);
      const leftEyeX = centerX - calculatedEyeSpacing;
      const rightEyeX = centerX + calculatedEyeSpacing;
      const eyeRy = calculatedEyeSize;
      const baseEyeRx = eyeRy * 0.85;
      const eyeRx = Math.min(baseEyeRx, calculatedEyeSpacing);
      
      const createEyeClipPath = (eyeX: number, eyeRx: number, eyeRy: number, style: 'realistic' | 'blocky') => {
        if (style === 'realistic') {
          const leftPointX = eyeX - eyeRx; const rightPointX = eyeX + eyeRx; const verticalCenterY = eyeYPos;
          const upperControlY = (eyeYPos - eyeRy) + (2 * eyeRy * upperEyelidCoverage) / 100;
          const lowerControlY = (eyeYPos + eyeRy) - (2 * eyeRy * lowerEyelidCoverage) / 100;
          if (upperControlY >= lowerControlY) { const midY = (upperControlY + lowerControlY) / 2; return `M ${leftPointX},${midY} L ${rightPointX},${midY} Z`; }
          return `M ${leftPointX},${verticalCenterY} Q ${eyeX},${upperControlY} ${rightPointX},${verticalCenterY} Q ${eyeX},${lowerControlY} ${leftPointX},${verticalCenterY} Z`;
        } else {
          const eyeTopY = eyeYPos - eyeRy; const eyeBottomY = eyeYPos + eyeRy;
          const getXforY = (y: number) => {
              const y_clamped = Math.max(eyeTopY, Math.min(eyeBottomY, y)); const y_term = (y_clamped - eyeYPos) / eyeRy;
              const x_offset_sq = Math.max(0, 1 - y_term * y_term); const x_offset = eyeRx * Math.sqrt(x_offset_sq);
              return { x1: eyeX - x_offset, x2: eyeX + x_offset };
          };
          let upperLidY = eyeTopY + 2 * eyeRy * (Math.min(upperEyelidCoverage, 100) / 100) * 0.5;
          let lowerLidY = eyeBottomY - 2 * eyeRy * (Math.min(lowerEyelidCoverage, 100) / 100) * 0.5;
          if (upperLidY >= lowerLidY) { const midY = (upperLidY + lowerLidY) / 2; const midPoints = getXforY(midY); return `M ${midPoints.x1},${midY} L ${midPoints.x2},${midY} Z`; }
          const hasUpperLid = upperEyelidCoverage > 0.1; const hasLowerLid = lowerEyelidCoverage > 0.1;
          const upperPoints = getXforY(upperLidY); const lowerPoints = getXforY(lowerLidY);
          let path = `M ${upperPoints.x1} ${upperLidY}`;
          if (hasUpperLid) { path += ` L ${upperPoints.x2} ${upperLidY}`; } else { path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${upperPoints.x2} ${upperLidY}`; }
          path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${lowerPoints.x2} ${lowerLidY}`;
          if (hasLowerLid) { path += ` L ${lowerPoints.x1} ${lowerLidY}`; } else { path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${lowerPoints.x1} ${lowerLidY}`; }
          path += ` A ${eyeRx} ${eyeRy} 0 0 1 ${upperPoints.x1} ${upperLidY} Z`;
          return path;
        }
      };
      const leftEyeClipPathD = createEyeClipPath(leftEyeX, eyeRx, eyeRy, eyeStyle);
      const rightEyeClipPathD = createEyeClipPath(rightEyeX, eyeRx, eyeRy, eyeStyle);
      
      return { leftEyeClipPathD, rightEyeClipPathD };
};

const Character: React.FC<{
    charInstance: CharacterInstance;
    instanceKey: string;
    localCursorPos: { x: number; y: number };
}> = ({ charInstance, instanceKey, localCursorPos }) => {
    const renderedCharacter = useMemo(() => {
        const { params, isFlipped } = charInstance;
        const { leftEyeClipPathD, rightEyeClipPathD } = getEyeClipPathData(params);

        const {
            headWidth, headHeight, headShape, headCornerRadius, triangleCornerRadius, eyeSizeRatio, eyeSpacingRatio, pupilSizeRatio, upperEyelidCoverage, lowerEyelidCoverage, eyeStyle, eyeTracking, eyelashes, eyelashCount, eyelashLength, eyelashAngle, mouthWidthRatio, mouthYOffsetRatio, mouthBend, eyebrowWidthRatio, eyebrowHeightRatio, eyebrowYOffsetRatio, eyebrowAngle, neckHeight, neckWidthRatio, torsoHeight, torsoWidth, torsoShape, torsoCornerRadius, pelvisHeight, pelvisWidthRatio, pelvisShape, armLength, lArmWidth, rArmWidth, lHandSize, rHandSize, legLength, lLegWidth, rLegWidth, lFootSize, rFootSize, lArmAngle, rArmAngle, lArmBend, rArmBend, lLegAngle, rLegAngle, lLegBend, rLegBend, hair, backHairWidthRatio, backHairHeightRatio, fringeHeightRatio, bodyColor, irisColor, outlineColor, pupilColor, hairColor, bodyOutlines, eyeOutlines
        } = params;

        const filterId = `body-outline-filter-${instanceKey}`;
        const outlineWidth = 4;
        const centerX = VIEWBOX_WIDTH_BASE / 2;
        const headY = 120;
        const actualHeadTopY = (() => { switch (headShape) { case 'circle': case 'square': return headY - headWidth / 2; default: return headY - headHeight / 2; } })();
        const calculatedEyeSize = headHeight * (eyeSizeRatio / 100); const calculatedEyeSpacing = headWidth * (eyeSpacingRatio / 100); const calculatedPupilSize = calculatedEyeSize * (pupilSizeRatio / 100); const calculatedMouthWidth = headWidth * (mouthWidthRatio / 100); const calculatedMouthYOffset = (headHeight / 2) * (mouthYOffsetRatio / 100); const calculatedEyebrowWidth = headWidth * (eyebrowWidthRatio / 100); const calculatedEyebrowHeight = calculatedEyeSize * (eyebrowHeightRatio / 100); const calculatedEyebrowYOffset = headHeight * (eyebrowYOffsetRatio / 100); const calculatedNeckWidth = headWidth * (neckWidthRatio / 100); let adjustedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);
        const headBottomY = headY + (headShape === 'circle' || headShape === 'square' ? headWidth / 2 : headHeight / 2); const neckY = headBottomY - 15; const torsoTopY = neckY + neckHeight;
        
        const getTorsoWidthAtY = (y: number) => { const yRel = y - torsoTopY; if (yRel < 0 || yRel > torsoHeight) return 0; switch (torsoShape) { case 'circle': { const rx = torsoWidth / 2; const ry = torsoHeight / 2; if (ry === 0) return torsoWidth; const centerY = torsoTopY + ry; const yDistFromCenter = Math.abs(y - centerY); if (yDistFromCenter > ry) return 0; return 2 * rx * Math.sqrt(1 - (yDistFromCenter / ry) ** 2); } case 'triangle': return torsoHeight > 0 ? torsoWidth * (yRel / torsoHeight) : 0; case 'inverted-triangle': return torsoHeight > 0 ? torsoWidth * (1 - yRel / torsoHeight) : torsoWidth; case 'rectangle': case 'square': { const r = torsoShape === 'square' ? Math.min(torsoCornerRadius, torsoWidth / 2) : Math.min(torsoCornerRadius, torsoWidth / 2, torsoHeight / 2); const w_half = torsoWidth / 2; const h = torsoHeight; let boundaryX_half; if (yRel < r) { const y_arc_relative_to_center = yRel - r; const x_offset_from_corner_center = Math.sqrt(Math.max(0, r*r - y_arc_relative_to_center*y_arc_relative_to_center)); boundaryX_half = (w_half - r) + x_offset_from_corner_center; } else if (yRel > h - r) { const y_arc_relative_to_center = yRel - (h - r); const x_offset_from_corner_center = Math.sqrt(Math.max(0, r*r - y_arc_relative_to_center*y_arc_relative_to_center)); boundaryX_half = (w_half - r) + x_offset_from_corner_center; } else { boundaryX_half = w_half; } return boundaryX_half * 2; } default: return torsoWidth; } };
        
        let finalNeckWidth = calculatedNeckWidth; let neckConnectionY = torsoTopY;
        if (torsoShape === 'triangle' || torsoShape === 'circle') { const maxConnectionDepth = torsoHeight * 0.3; let foundConnection = false; for (let depth = 0; depth <= maxConnectionDepth; depth++) { const currentY = torsoTopY + depth; const widthAtY = getTorsoWidthAtY(currentY); if (widthAtY >= calculatedNeckWidth) { neckConnectionY = currentY; finalNeckWidth = calculatedNeckWidth; foundConnection = true; break; } } if (!foundConnection) { neckConnectionY = torsoTopY + maxConnectionDepth; finalNeckWidth = getTorsoWidthAtY(neckConnectionY); } } else { neckConnectionY = torsoTopY; finalNeckWidth = Math.min(calculatedNeckWidth, getTorsoWidthAtY(neckConnectionY)); }
        
        const torsoBottomY = torsoTopY + torsoHeight;
        let junctionY;
        if (torsoShape === 'inverted-triangle') {
            junctionY = torsoBottomY;
        } else {
            const searchStartY = torsoBottomY;
            const searchEndY = torsoTopY + torsoHeight * 0.4;
            junctionY = searchStartY;
            for (let y = searchStartY; y >= searchEndY; y -= 2) {
                if (getTorsoWidthAtY(y) >= adjustedPelvisWidth) {
                    junctionY = y;
                    break;
                }
            }
        }
        const torsoWidthAtJunction = getTorsoWidthAtY(junctionY);
        if (torsoShape !== 'inverted-triangle') {
        adjustedPelvisWidth = Math.min(adjustedPelvisWidth, torsoWidthAtJunction * 1.2);
        }
        const pelvisOverlap = torsoShape === 'inverted-triangle' ? pelvisHeight * 0.4 : 5;
        const pelvisY = junctionY - pelvisOverlap;
        const legY = pelvisY + pelvisHeight * 0.8;
        const finalLegY = legY;

        const getShoulderAttachment = () => { const avgArmWidth = (lArmWidth + rArmWidth) / 2; const insetAmount = avgArmWidth / 2; let shoulderY: number; let xOffset: number; switch (torsoShape) { case 'circle': { const rx = torsoWidth / 2; const ry = torsoHeight / 2; const torsoCenterY = torsoTopY + ry; const yRatio = 0.2; const initialShoulderY = torsoCenterY - ry * yRatio; const yDistFromCenter = initialShoulderY - torsoCenterY; if (ry < 1e-6 || rx < 1e-6) { shoulderY = torsoCenterY; xOffset = 0; break; } const edgeXOffset = rx * Math.sqrt(Math.max(0, 1 - (yDistFromCenter / ry) ** 2)); const normalX = edgeXOffset / (rx ** 2); const normalY = yDistFromCenter / (ry ** 2); const mag = Math.sqrt(normalX**2 + normalY**2); if (mag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset - insetAmount; break; } const normalizedNormalX = normalX / mag; const normalizedNormalY = normalY / mag; const insetX = insetAmount * normalizedNormalX; const insetY = insetAmount * normalizedNormalY; xOffset = edgeXOffset - insetX; shoulderY = initialShoulderY - insetY; break; } case 'triangle': { const initialShoulderY = torsoTopY + torsoHeight * 0.3; const edgeXOffset = getTorsoWidthAtY(initialShoulderY) / 2; const edgeVec = { x: torsoWidth / 2, y: torsoHeight }; const edgeMag = Math.sqrt(edgeVec.x**2 + edgeVec.y**2); if (edgeMag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset; break; } const normalVec = { x: -edgeVec.y / edgeMag, y: edgeVec.x / edgeMag }; const insetX = insetAmount * normalVec.x; const insetY = insetAmount * normalVec.y; xOffset = edgeXOffset + insetX; shoulderY = initialShoulderY + insetY; break; } case 'inverted-triangle': { const initialShoulderY = torsoTopY + torsoHeight * 0.15; const edgeXOffset = getTorsoWidthAtY(initialShoulderY) / 2; const edgeVec = { x: -torsoWidth / 2, y: torsoHeight }; const edgeMag = Math.sqrt(edgeVec.x**2 + edgeVec.y**2); if (edgeMag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset; break; } const normalVec = { x: -edgeVec.y / edgeMag, y: edgeVec.x / edgeMag }; const insetX = insetAmount * normalVec.x; const insetY = insetAmount * normalVec.y; xOffset = edgeXOffset + insetX; shoulderY = initialShoulderY + insetY; break; } default: { const r = torsoShape === 'square' ? Math.min(torsoCornerRadius, torsoWidth / 2) : Math.min(torsoCornerRadius, torsoWidth / 2, torsoHeight / 2); if (r < insetAmount) { shoulderY = torsoTopY + insetAmount; xOffset = torsoWidth / 2 - insetAmount; break; } const cornerCenter_xOffset = torsoWidth / 2 - r; const cornerCenter_yAbsolute = torsoTopY + r; const angle = -Math.PI / 4; const boundary_xAbsolute = centerX + cornerCenter_xOffset + r * Math.cos(angle); const boundary_yAbsolute = cornerCenter_yAbsolute + r * Math.sin(angle); const normalX = Math.cos(angle); const normalY = Math.sin(angle); const attachment_xAbsolute = boundary_xAbsolute - insetAmount * normalX; const attachment_yAbsolute = boundary_yAbsolute - insetAmount * normalY; xOffset = attachment_xAbsolute - centerX; shoulderY = attachment_yAbsolute; break; } } const torsoWidthAtShoulderY = getTorsoWidthAtY(shoulderY); if (xOffset * 2 > torsoWidthAtShoulderY) { xOffset = (torsoWidthAtShoulderY / 2) - 2; } xOffset = Math.max(0, xOffset); return { y: shoulderY, xOffset }; };
        const getHipAttachment = () => {
            const lHipX = centerX - adjustedPelvisWidth * 0.35;
            const rHipX = centerX + adjustedPelvisWidth * 0.35;
            return { l: { x: lHipX, y: finalLegY }, r: { x: rHipX, y: finalLegY } };
        };
        const { y: shoulderY, xOffset: shoulderXOffset } = getShoulderAttachment();
        const { l: lHip, r: rHip } = getHipAttachment();
        const lShoulder = { x: centerX - shoulderXOffset, y: shoulderY }; const rShoulder = { x: centerX + shoulderXOffset, y: shoulderY };
        const createLimbPath = (start: {x: number, y: number}, length: number, angle: number, bend: number, dir: -1 | 1) => { const rad = angle * Math.PI / 180; const end = { x: start.x + dir * length * Math.sin(rad), y: start.y + length * Math.cos(rad) }; const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }; const dx = end.x - start.x; const dy = end.y - start.y; const dist = Math.sqrt(dx * dx + dy * dy); const control = { x: mid.x, y: mid.y }; if (dist > 1e-6) { const perpDx = -dy / dist; const perpDy = dx / dist; control.x = mid.x + perpDx * bend; control.y = mid.y + perpDy * bend; } const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`; return { path, end, control }; };
        
        // --- Dynamic Collision Correction for Feet ---
        let finalLLegAngle = lLegAngle;
        let finalRLegAngle = rLegAngle;
        const maxIterations = 90;
        const footMargin = 5;

        for (let i = 0; i < maxIterations; i++) {
            const { end: tempLAnkle } = createLimbPath(lHip, legLength, finalLLegAngle, lLegBend, -1);
            const { end: tempRAnkle } = createLimbPath(rHip, legLength, finalRLegAngle, rLegBend, 1);
            
            // The rightmost edge of the left leg/foot area, considering leg width
            const leftInnerEdge = tempLAnkle.x + lLegWidth / 2;
            // The leftmost edge of the right leg/foot area, considering leg width
            const rightInnerEdge = tempRAnkle.x - rLegWidth / 2;
            
            // Check if the gap between them is smaller than the required margin
            const collision = leftInnerEdge + footMargin > rightInnerEdge;

            if (collision) {
                // If a collision is detected, push both legs outwards by one degree
                finalLLegAngle = Math.min(45, finalLLegAngle + 1);
                finalRLegAngle = Math.min(45, finalRLegAngle + 1);
            } else {
                // If there's enough space, we're done
                break;
            }
        }
        
        const { path: lArmPath, end: lWrist } = createLimbPath(lShoulder, armLength, lArmAngle, lArmBend, -1); const { path: rArmPath, end: rWrist } = createLimbPath(rShoulder, armLength, rArmAngle, rArmBend, 1); const { path: lLegPath, end: lAnkle } = createLimbPath(lHip, legLength, finalLLegAngle, lLegBend, -1); const { path: rLegPath, end: rAnkle } = createLimbPath(rHip, legLength, finalRLegAngle, rLegBend, 1);
        const lFootGroundY = lAnkle.y + lLegWidth / 2; const rFootGroundY = rAnkle.y + rLegWidth / 2; const lFootHeight = Math.max(lFootSize, lLegWidth); const rFootHeight = Math.max(rFootSize, rLegWidth); const lFootWidth = Math.min(lFootSize * 2, lLegWidth * 3); const rFootWidth = Math.min(rFootSize * 2, rLegWidth * 3); const lHeelX = lAnkle.x; const lFootPath = `M ${lHeelX} ${lFootGroundY} L ${lHeelX - lFootWidth} ${lFootGroundY} A ${lFootWidth / 2} ${lFootHeight} 0 0 1 ${lHeelX} ${lFootGroundY} Z`; const rHeelX = rAnkle.x; const rFootPath = `M ${rHeelX} ${rFootGroundY} L ${rHeelX + rFootWidth} ${lFootGroundY} A ${rFootWidth / 2} ${rFootHeight} 0 0 0 ${rHeelX} ${lFootGroundY} Z`;
        const eyeYPos = headY; const leftEyeX = centerX - calculatedEyeSpacing; const rightEyeX = centerX + calculatedEyeSpacing; const eyeRy = calculatedEyeSize; const baseEyeRx = eyeRy * 0.85; const eyeRx = Math.min(baseEyeRx, calculatedEyeSpacing); const irisRy = eyeRy * 0.7; const irisRx = eyeRx * 0.7; const pupilRy = calculatedPupilSize; const pupilRx = pupilRy * (eyeRx / eyeRy);
        
        const localCursorX = (localCursorPos.x - (VIEWBOX_WIDTH_BASE / 2 + charInstance.x)) / charInstance.scale + (VIEWBOX_WIDTH_BASE / 2);
        const localCursorY = (localCursorPos.y - (VIEWBOX_HEIGHT / 2 + charInstance.y)) / charInstance.scale + (VIEWBOX_HEIGHT / 2);
        
        const getPupilOffset = (eyeCenterX: number, eyeCenterY: number) => {
            let targetX: number | undefined;
            let targetY: number | undefined;

            if (charInstance.lookAt) {
                targetX = charInstance.lookAt.x;
                targetY = charInstance.lookAt.y;
            } else if (eyeTracking) {
                targetX = localCursorX;
                targetY = localCursorY;
            }

            if (targetX === undefined || targetY === undefined) {
                return { x: 0, y: 0 };
            }

            const dx = targetX - eyeCenterX;
            const dy = targetY - eyeCenterY;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxTravelX = irisRx - pupilRx;
            const maxTravelY = irisRy - pupilRy;
            const effectiveDist = headWidth * 0.6;
            const ratio = Math.min(1, dist / effectiveDist);
            return { x: Math.cos(angle) * maxTravelX * ratio, y: Math.sin(angle) * maxTravelY * ratio, };
        };
        const leftPupilOffset = getPupilOffset(leftEyeX, eyeYPos);
        const rightPupilOffset = getPupilOffset(rightEyeX, eyeYPos);
        const eyelidCompensationY = (eyeRy * (upperEyelidCoverage / 100)) * 0.4; 
        const glintRadius = calculatedEyeSize * 0.2; 
        const glintOffsetX = eyeRx * 0.3; 
        const finalGlintOffsetX = glintOffsetX * (isFlipped ? -1 : 1);
        const glintOffsetY = eyeRy * 0.3; 
        const finalEyebrowYOffset = Math.max(calculatedEyebrowYOffset, eyeRy + calculatedEyebrowHeight / 2 + 5); 
        let eyebrowY = eyeYPos - finalEyebrowYOffset; 
        const eyebrowTopPoint = eyebrowY - (calculatedEyebrowHeight / 2); 
        const headTopLimit = actualHeadTopY + (outlineWidth / 2); if (eyebrowTopPoint < headTopLimit) { eyebrowY = headTopLimit + (calculatedEyebrowHeight / 2); }

        // --- Dynamic Collision Correction for Mouth ---
        let finalMouthWidth = calculatedMouthWidth;
        const mouthYPos = headY + calculatedMouthYOffset;
        const mouthMargin = 10;
        let headWidthAtMouthY = headWidth;
        if (headShape === 'triangle') {
            const headTop = headY - headHeight / 2;
            const yRel = mouthYPos - headTop;
            headWidthAtMouthY = headHeight > 0 ? headWidth * (yRel / headHeight) : 0;
        }
        if (finalMouthWidth > headWidthAtMouthY - mouthMargin) {
            finalMouthWidth = Math.max(0, headWidthAtMouthY - mouthMargin);
        }
        const mouthCurvature = finalMouthWidth * 0.4 * (mouthBend / 100);
        const mouthPath = `M ${centerX - finalMouthWidth / 2} ${mouthYPos} Q ${centerX} ${mouthYPos + mouthCurvature} ${centerX + finalMouthWidth / 2} ${mouthYPos}`;

        const isWideTopHead = headShape === 'square' || headShape === 'inverted-triangle'; const hairAnchorY = isWideTopHead ? actualHeadTopY - 10 : actualHeadTopY; const hairWidthMultiplier = isWideTopHead ? 1.1 : 1.0;
        const calculatedBackHairWidth = headWidth * (backHairWidthRatio / 100) * hairWidthMultiplier; const backHairRx = calculatedBackHairWidth / 2; const backHairRy = headHeight * (backHairHeightRatio / 100); const backHairCenterY = hairAnchorY + backHairRy; const backHairPath = `M ${centerX - backHairRx}, ${backHairCenterY} A ${backHairRx} ${backHairRy} 0 0 1 ${centerX + backHairRx}, ${backHairCenterY} Z`;
        const fringeHeight = headHeight * (fringeHeightRatio / 100); let fringePath: string = '';
        if (fringeHeight > 0.1) { const fringeRy = fringeHeight; const fringeCenterY = hairAnchorY + fringeHeight; if (headShape === 'triangle' && headHeight > 0) { const headWidthAtFringeBottom = (fringeHeight / headHeight) * headWidth; const fringeRx = (headWidthAtFringeBottom / 2) + (outlineWidth / 2); const tipX = centerX; const tipY = hairAnchorY; const bottomLeftX = centerX - fringeRx; const bottomRightX = centerX + fringeRx; const bottomY = fringeCenterY; fringePath = `M ${tipX} ${tipY} L ${bottomLeftX} ${bottomY} L ${bottomRightX} ${bottomY} Z`; } else { let fringeRx = (headWidth / 2) * hairWidthMultiplier + outlineWidth / 2; if (fringeRx > 0.1 && fringeRy > 0.1) { fringePath = `M ${centerX - fringeRx}, ${fringeCenterY} A ${fringeRx} ${fringeRy} 0 0 1 ${centerX + fringeRx}, ${fringeCenterY} Z`; } } }
        const headTop = { x: centerX, y: headY - headHeight / 2 }; const headBottomLeft = { x: centerX - headWidth / 2, y: headY + headHeight / 2 }; const headBottomRight = { x: centerX + headWidth / 2, y: headY + headHeight / 2 }; const headTopLeft = { x: centerX - headWidth / 2, y: headY - headHeight / 2 }; const headTopRight = { x: centerX + headWidth / 2, y: headY - headHeight / 2 }; const headBottom = { x: centerX, y: headY + headHeight / 2 };
        const torsoCY = torsoTopY + torsoHeight / 2; const torsoTop = { x: centerX, y: torsoTopY }; const torsoBottomLeft = { x: centerX - torsoWidth / 2, y: torsoTopY + torsoHeight }; const torsoBottomRight = { x: centerX + torsoWidth / 2, y: torsoTopY + torsoHeight }; const torsoTopLeft = { x: centerX - torsoWidth / 2, y: torsoTopY }; const torsoTopRight = { x: centerX + torsoWidth / 2, y: torsoTopY }; const torsoBottom = { x: centerX, y: torsoTopY + torsoHeight };
        
        const renderHead = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; switch (headShape) { case 'circle': return <circle cx={centerX} cy={headY} r={headWidth / 2} {...props} />; case 'square': return <rect x={centerX - headWidth/2} y={headY - headWidth/2} width={headWidth} height={headWidth} rx={headCornerRadius} {...props} />; case 'triangle': return <path d={createRoundedPolygonPath([headTop, headBottomLeft, headBottomRight], triangleCornerRadius)} {...props} />; case 'inverted-triangle': return <path d={createRoundedPolygonPath([headTopLeft, headTopRight, headBottom], triangleCornerRadius)} {...props} />; default: return <ellipse cx={centerX} cy={headY} rx={headWidth / 2} ry={headHeight / 2} {...props} />; } };
        const renderTorso = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; switch (torsoShape) { case 'circle': return <ellipse cx={centerX} cy={torsoCY} rx={torsoWidth / 2} ry={torsoHeight / 2} {...props} />; case 'square': return <rect x={centerX - torsoWidth/2} y={torsoTopY} width={torsoWidth} height={torsoWidth} rx={torsoCornerRadius} {...props} />; case 'triangle': return <path d={createRoundedPolygonPath([torsoTop, torsoBottomLeft, torsoBottomRight], triangleCornerRadius)} {...props} />; case 'inverted-triangle': return <path d={createRoundedPolygonPath([torsoTopLeft, torsoTopRight, torsoBottom], triangleCornerRadius)} {...props} />; default: return <rect x={centerX - torsoWidth/2} y={torsoTopY} width={torsoWidth} height={torsoHeight} rx={torsoCornerRadius} {...props} />; } };
        const renderNeck = () => { return <rect x={centerX - finalNeckWidth / 2} y={neckY} width={finalNeckWidth} height={neckConnectionY - neckY + 5} fill={bodyColor} rx={finalNeckWidth * 0.1} />; };
        const renderPelvis = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; if (torsoShape === 'inverted-triangle') { const topY = pelvisY; const bottomY = topY + params.pelvisHeight; const width = adjustedPelvisWidth; const cr = 15; const socketDepth = params.pelvisHeight * 0.5; let path = `M ${centerX - width / 2} ${topY + socketDepth}`; path += ` Q ${centerX} ${topY}, ${centerX + width / 2} ${topY + socketDepth}`; switch (pelvisShape) { case 'horizontal-oval': path += ` A ${width / 2} ${(bottomY - (topY + socketDepth)) / 2} 0 1 1 ${centerX - width / 2} ${topY + socketDepth}`; break; default: path += ` L ${centerX + width / 2} ${bottomY - cr}`; path += ` Q ${centerX + width / 2} ${bottomY}, ${centerX + width / 2 - cr} ${bottomY}`; path += ` L ${centerX - width / 2 + cr} ${bottomY}`; path += ` Q ${centerX - width / 2} ${bottomY}, ${centerX - width / 2} ${bottomY - cr}`; break; } path += ` Z`; return <path d={path.replace(/\s+/g, ' ').trim()} {...props} />; } const topWidth = getTorsoWidthAtY(junctionY); const bottomWidth = adjustedPelvisWidth; const pelvisBottomY = junctionY + params.pelvisHeight; const drawingJunctionY = junctionY - 1; let path = `M ${centerX - topWidth / 2} ${drawingJunctionY}`; path += ` L ${centerX - bottomWidth / 2} ${drawingJunctionY}`; const cr = 15; switch (pelvisShape) { case 'horizontal-oval': path += ` L ${centerX - bottomWidth / 2} ${pelvisBottomY - cr} A ${bottomWidth/2} ${cr} 0 0 0 ${centerX + bottomWidth / 2} ${pelvisBottomY - cr} L ${centerX + bottomWidth / 2} ${drawingJunctionY}`; break; default: path += ` L ${centerX - bottomWidth / 2} ${pelvisBottomY - cr}`; path += ` Q ${centerX - bottomWidth/2} ${pelvisBottomY}, ${centerX - bottomWidth/2 + cr} ${pelvisBottomY}`; path += ` L ${centerX + bottomWidth/2 - cr} ${pelvisBottomY}`; path += ` Q ${centerX + bottomWidth/2} ${pelvisBottomY}, ${centerX + bottomWidth/2} ${pelvisBottomY - cr}`; path += ` L ${centerX + bottomWidth / 2} ${drawingJunctionY}`; break; } path += ` L ${centerX + topWidth / 2} ${drawingJunctionY} Z`; return <path d={path.replace(/\s+/g, ' ').trim()} {...props} />; };
        const renderEyelashes = (eyeX: number) => { if (!eyelashes || upperEyelidCoverage >= 95) return null; const lashes: React.ReactNode[] = []; const eyeTopY = eyeYPos - eyeRy; const isLeftEye = eyeX < centerX; const angleRad = (isLeftEye ? -eyelashAngle : eyelashAngle) * Math.PI / 180; const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad); if (eyeStyle === 'blocky') { const upperLidY = eyeTopY + (2 * eyeRy * (upperEyelidCoverage / 100) * 0.5); const y_term = (upperLidY - eyeYPos) / eyeRy; const x_offset_sq = Math.max(0, 1 - y_term * y_term); const x_offset = eyeRx * Math.sqrt(x_offset_sq); const startX = eyeX - x_offset; const endX = eyeX + x_offset; const totalWidth = endX - startX; const ratio_start = isLeftEye ? 0.0 : 1.0; const ratio_end = isLeftEye ? 0.4 : 0.6; for (let i = 0; i < eyelashCount; i++) { const step = eyelashCount > 1 ? i / (eyelashCount - 1) : 0.5; const ratio = ratio_start + step * (ratio_end - ratio_start); const lashStartX = startX + totalWidth * ratio; const lashStartY = upperLidY; const outwardDirection = (eyeX < centerX) ? -1 : 1; let vx, vy; if (outwardDirection === 1) { vx = ratio; vy = -1; } else { vx = -(1 - ratio); vy = -1; } let len = Math.sqrt(vx * vx + vy * vy); if (len > 0) { vx /= len; vy /= len; } const finalVx = vx * cosA - vy * sinA; const finalVy = vx * sinA + vy * cosA; const lashEndX = lashStartX + eyelashLength * finalVx; const lashEndY = lashStartY + eyelashLength * finalVy; lashes.push(<path key={i} d={`M ${lashStartX} ${lashStartY} L ${lashEndX} ${lashEndY}`} stroke={outlineColor} strokeWidth={1.5} strokeLinecap="round" />); } } else { const leftPointX = eyeX - eyeRx; const rightPointX = eyeX + eyeRx; const verticalCenterY = eyeYPos; const upperControlY = (eyeYPos - eyeRy) + (2 * eyeRy * upperEyelidCoverage) / 100; const p0 = { x: leftPointX, y: verticalCenterY }; const p1 = { x: eyeX, y: upperControlY }; const p2 = { x: rightPointX, y: verticalCenterY }; const t_start = isLeftEye ? 0.0 : 1.0; const t_end = isLeftEye ? 0.4 : 0.6; for (let i = 0; i < eyelashCount; i++) { const step = eyelashCount > 1 ? i / (eyelashCount - 1) : 0.5; const t = t_start + step * (t_end - t_start); const startX = (1 - t)**2 * p0.x + 2 * (1 - t) * t * p1.x + t**2 * p2.x; const startY = (1 - t)**2 * p0.y + 2 * (1 - t) * t * p1.y + t**2 * p2.y; const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x); const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y); let nx = -ty, ny = tx; let len = Math.sqrt(nx**2 + ny**2); if (len > 0) { nx /= len; ny /= len; } if (ny > 0) { nx = -nx; ny = -ny; } const outwardDirection = eyeX < centerX ? -1 : 1; nx = nx + outwardDirection * 1.2; ny = ny - 0.2; len = Math.sqrt(nx * nx + ny * ny); if (len > 0) { nx /= len; ny /= len; } const finalNx = nx * cosA - ny * sinA; const finalNy = nx * sinA + ny * cosA; const endX = startX + eyelashLength * finalNx; const endY = startY + eyelashLength * finalNy; lashes.push(<path key={i} d={`M ${startX} ${startY} L ${endX} ${endY}`} stroke={outlineColor} strokeWidth={1.5} strokeLinecap="round" />); } } return <g>{lashes}</g>; };

        const scaleX = charInstance.scale * (isFlipped ? -1 : 1);
        const scaleY = charInstance.scale;

        return (
            <g transform={`translate(${charInstance.x}, ${charInstance.y}) scale(${scaleX}, ${scaleY})`}>
                <g transform={`translate(${-VIEWBOX_WIDTH_BASE/2}, ${-VIEWBOX_HEIGHT/2})`}>
                    <defs>
                      <clipPath id={`leftEyeClip-${instanceKey}`}><path d={leftEyeClipPathD} /></clipPath>
                      <clipPath id={`rightEyeClip-${instanceKey}`}><path d={rightEyeClipPathD} /></clipPath>
                      <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                          <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius="2" />
                          <feFlood floodColor={outlineColor} result="colored" />
                          <feComposite in="colored" in2="dilated" operator="in" result="outline" />
                          <feMerge>
                              <feMergeNode in="outline" />
                              <feMergeNode in="SourceGraphic" />
                          </feMerge>
                      </filter>
                    </defs>
                    {hair && (<g filter={bodyOutlines ? `url(#${filterId})` : 'none'}><path d={backHairPath} fill={hairColor} /></g>)}
                    <g filter={bodyOutlines ? `url(#${filterId})` : 'none'}>
                        <path d={lFootPath} fill={bodyColor} /> 
                        <path d={rFootPath} fill={bodyColor} /> 
                        <circle cx={lHip.x} cy={lHip.y} r={params.lLegWidth / 2 * 1.6} fill={bodyColor} />
                        <circle cx={rHip.x} cy={rHip.y} r={params.rLegWidth / 2 * 1.6} fill={bodyColor} />
                        <path d={lLegPath} fill="none" stroke={bodyColor} strokeWidth={params.lLegWidth} strokeLinecap="round" strokeLinejoin="round" /> 
                        <path d={rLegPath} fill="none" stroke={bodyColor} strokeWidth={params.rLegWidth} strokeLinecap="round" strokeLinejoin="round" /> 
                      <path d={lArmPath} fill="none" stroke={bodyColor} strokeWidth={params.lArmWidth} strokeLinecap="round" strokeLinejoin="round" />
                      <path d={rArmPath} fill="none" stroke={bodyColor} strokeWidth={params.rArmWidth} strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx={lWrist.x} cy={lWrist.y} r={params.lHandSize/2} fill={bodyColor} />
                      <circle cx={rWrist.x} cy={rWrist.y} r={params.rHandSize/2} fill={bodyColor} />
                      {renderNeck()} {renderTorso()} {renderPelvis()} {renderHead()}
                    </g>
                    <g>
                      <g><g clipPath={`url(#leftEyeClip-${instanceKey})`}><ellipse cx={leftEyeX} cy={eyeYPos} rx={eyeRx} ry={eyeRy} fill="white" /><ellipse cx={leftEyeX + leftPupilOffset.x} cy={eyeYPos + leftPupilOffset.y - eyelidCompensationY} rx={irisRx} ry={irisRy} fill={irisColor} /><ellipse cx={leftEyeX + leftPupilOffset.x} cy={eyeYPos + leftPupilOffset.y - eyelidCompensationY} rx={pupilRx} ry={pupilRy} fill={pupilColor} /><circle cx={leftEyeX + finalGlintOffsetX + leftPupilOffset.x * 0.5} cy={eyeYPos - glintOffsetY + leftPupilOffset.y * 0.5 - eyelidCompensationY} r={glintRadius} fill="white" /></g>{eyeOutlines && <path d={leftEyeClipPathD} fill="none" stroke={outlineColor} strokeWidth={4 / 2} strokeLinejoin="round" />}</g>
                      <g><g clipPath={`url(#rightEyeClip-${instanceKey})`}><ellipse cx={rightEyeX} cy={eyeYPos} rx={eyeRx} ry={eyeRy} fill="white" /><ellipse cx={rightEyeX + rightPupilOffset.x} cy={eyeYPos + rightPupilOffset.y - eyelidCompensationY} rx={irisRx} ry={irisRy} fill={irisColor} /><ellipse cx={rightEyeX + rightPupilOffset.x} cy={eyeYPos + rightPupilOffset.y - eyelidCompensationY} rx={pupilRx} ry={pupilRy} fill={pupilColor} /><circle cx={rightEyeX + finalGlintOffsetX + rightPupilOffset.x * 0.5} cy={eyeYPos - glintOffsetY + rightPupilOffset.y * 0.5 - eyelidCompensationY} r={glintRadius} fill="white" /></g>{eyeOutlines && <path d={rightEyeClipPathD} fill="none" stroke={outlineColor} strokeWidth={4 / 2} strokeLinejoin="round" />}</g>
                    </g>
                    {renderEyelashes(leftEyeX)} {renderEyelashes(rightEyeX)}
                    {hair && fringePath && (<g filter={bodyOutlines ? `url(#${filterId})` : 'none'}><path d={fringePath} fill={hairColor} /></g>)}
                    <g transform={`translate(${leftEyeX}, ${eyebrowY}) rotate(${params.eyebrowAngle})`}><rect x={-params.eyebrowWidthRatio / 2 * headWidth/100} y={-params.eyebrowHeightRatio / 2 * calculatedEyeSize/100} width={params.eyebrowWidthRatio / 100 * headWidth} height={params.eyebrowHeightRatio / 100 * calculatedEyeSize} fill={outlineColor} rx={2} /></g>
                    <g transform={`translate(${rightEyeX}, ${eyebrowY}) rotate(${-params.eyebrowAngle})`}><rect x={-params.eyebrowWidthRatio / 2 * headWidth/100} y={-params.eyebrowHeightRatio / 2 * calculatedEyeSize/100} width={params.eyebrowWidthRatio / 100 * headWidth} height={params.eyebrowHeightRatio / 100 * calculatedEyeSize} fill={outlineColor} rx={2} /></g>
                    <path d={mouthPath} stroke={outlineColor} strokeWidth="4" fill="none" strokeLinecap="round" />
                </g>
            </g>
        );
    }, [charInstance, instanceKey, localCursorPos]);

    return renderedCharacter;
};

export default React.memo(Character);