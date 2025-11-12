import React, { useMemo } from 'react';
import type { CharacterInstance, CharacterParams } from '../types';
import { PARAM_CONFIGS } from '../constants';
import { getEyePathData } from './eyeFormulas';

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

const Character: React.FC<{
    charInstance: CharacterInstance;
    instanceKey: string;
    localCursorPos: { x: number; y: number };
}> = ({ charInstance, instanceKey, localCursorPos }) => {
    const renderedCharacter = useMemo(() => {
        const { params, isFlipped } = charInstance;
        const {
            headWidth, headHeight, headShape, headCornerRadius, triangleCornerRadius, eyeSizeRatio, eyeSpacingRatio, pupilSizeRatio, upperEyelidCoverage,
            // FIX: Corrected typo from lowerEylidCoverage to lowerEyelidCoverage to match type definition.
            lowerEyelidCoverage, eyeStyle, eyeTracking, eyelashes, eyelashCount, eyelashLength, eyelashAngle, glint, glintSizeRatio, glintXOffsetRatio, glintYOffsetRatio, glintOpacity, mouthWidthRatio, mouthYOffsetRatio, mouthBend, eyebrows, eyebrowWidthRatio, eyebrowHeightRatio, eyebrowYOffsetRatio, eyebrowAngle, neckHeight, neckWidthRatio, torsoHeight, torsoWidth, torsoShape, torsoCornerRadius, pelvisHeight, pelvisWidthRatio, pelvisShape, armLength, lArmWidth, rArmWidth, lHandSize, rHandSize, legLength, lLegWidth, rLegWidth, lFootSize, rFootSize, lArmAngle, rArmAngle, lArmBend, rArmBend, lLegAngle, rLegAngle, lLegBend, rLegBend, hair, backHairWidthRatio, backHairHeightRatio, fringeHeightRatio, viewAngle, bodyColor, irisColor, outlineColor, pupilColor, hairColor, bodyOutlines, eyeOutlines
        } = params;

        // --- 2.5D View Calculations ---
        const angleRad = (viewAngle * Math.PI) / 180;
        const viewFactor = Math.sin(angleRad); // -1 (left) to 1 (right)
        const depthFactor = Math.cos(angleRad); // 1 (front) to 0 (profile)

        const filterId = `body-outline-filter-${instanceKey}`;
        const outlineWidth = 4;
        const centerX = VIEWBOX_WIDTH_BASE / 2;
        
        const bodyXOffset = viewFactor * torsoWidth * 0.1;
        const dynamicCenterX = centerX + bodyXOffset;
        const headY = 120;

        function projectOnHead(xSurface: number, zNominal: number) {
            const projectedX = dynamicCenterX + xSurface * depthFactor + zNominal * viewFactor * 0.6;
            const scale = 1 - Math.abs(viewFactor) * (Math.abs(zNominal) / Math.max(headWidth, 1)) * 0.35;
            const zDepth = zNominal * depthFactor;
            return { x: projectedX, scale, zDepth };
        }
        
        const actualHeadTopY = (() => { switch (headShape) { case 'circle': case 'square': return headY - headWidth / 2; default: return headY - headHeight / 2; } })();
        // FIX: Defined calculatedEyebrowWidth, which was used without being declared.
        const calculatedEyeSize = headHeight * (eyeSizeRatio / 100); const calculatedPupilSize = calculatedEyeSize * (pupilSizeRatio / 100); const calculatedEyebrowHeight = calculatedEyeSize * (eyebrowHeightRatio / 100); const calculatedEyebrowWidth = headWidth * (eyebrowWidthRatio / 100);
        const calculatedMouthWidth = headWidth * (mouthWidthRatio / 100);
        
        // --- Body ---
        const calculatedNeckWidth = headWidth * (neckWidthRatio / 100); let adjustedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);
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

        const getShoulderAttachment = () => { const avgArmWidth = (lArmWidth + rArmWidth) / 2; const insetAmount = avgArmWidth / 2; let shoulderY: number; let xOffset: number; switch (torsoShape) { case 'circle': { const rx = torsoWidth / 2; const ry = torsoHeight / 2; const torsoCenterY = torsoTopY + ry; const yRatio = 0.2; const initialShoulderY = torsoCenterY - ry * yRatio; const yDistFromCenter = initialShoulderY - torsoCenterY; if (ry < 1e-6 || rx < 1e-6) { shoulderY = torsoCenterY; xOffset = 0; break; } const edgeXOffset = rx * Math.sqrt(Math.max(0, 1 - (yDistFromCenter / ry) ** 2)); const normalX = edgeXOffset / (rx ** 2); const normalY = yDistFromCenter / (ry ** 2); const mag = Math.sqrt(normalX**2 + normalY**2); if (mag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset - insetAmount; break; } const normalizedNormalX = normalX / mag; const normalizedNormalY = normalY / mag; const insetX = insetAmount * normalizedNormalX; const insetY = insetAmount * normalizedNormalY; xOffset = edgeXOffset - insetX; shoulderY = initialShoulderY - insetY; break; } case 'triangle': { const initialShoulderY = torsoTopY + torsoHeight * 0.3; const edgeXOffset = getTorsoWidthAtY(initialShoulderY) / 2; const edgeVec = { x: torsoWidth / 2, y: torsoHeight }; const edgeMag = Math.sqrt(edgeVec.x**2 + edgeVec.y**2); if (edgeMag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset; break; } const normalVec = { x: -edgeVec.y / edgeMag, y: edgeVec.x / edgeMag }; const insetX = insetAmount * normalVec.x; const insetY = insetAmount * normalVec.y; xOffset = edgeXOffset + insetX; shoulderY = initialShoulderY + insetY; break; } case 'inverted-triangle': { const initialShoulderY = torsoTopY + torsoHeight * 0.15; const edgeXOffset = getTorsoWidthAtY(initialShoulderY) / 2; const edgeVec = { x: -torsoWidth / 2, y: torsoHeight }; const edgeMag = Math.sqrt(edgeVec.x**2 + edgeVec.y**2); if (edgeMag < 1e-6) { shoulderY = initialShoulderY; xOffset = edgeXOffset; break; } const normalVec = { x: -edgeVec.y / edgeMag, y: edgeVec.x / edgeMag }; const insetX = insetAmount * normalVec.x; const insetY = insetAmount * normalVec.y; xOffset = edgeXOffset + insetX; shoulderY = initialShoulderY + insetY; break; } default: { const r = torsoShape === 'square' ? Math.min(torsoCornerRadius, torsoWidth / 2) : Math.min(torsoCornerRadius, torsoWidth / 2, torsoHeight / 2); if (r < insetAmount) { shoulderY = torsoTopY + insetAmount; xOffset = torsoWidth / 2 - insetAmount; break; } const cornerCenter_xOffset = torsoWidth / 2 - r; const cornerCenter_yAbsolute = torsoTopY + r; const angle = -Math.PI / 4; const boundary_xAbsolute = dynamicCenterX + cornerCenter_xOffset + r * Math.cos(angle); const boundary_yAbsolute = cornerCenter_yAbsolute + r * Math.sin(angle); const normalX = Math.cos(angle); const normalY = Math.sin(angle); const attachment_xAbsolute = boundary_xAbsolute - insetAmount * normalX; const attachment_yAbsolute = boundary_yAbsolute - insetAmount * normalY; xOffset = attachment_xAbsolute - dynamicCenterX; shoulderY = attachment_yAbsolute; break; } } const torsoWidthAtShoulderY = getTorsoWidthAtY(shoulderY); if (xOffset * 2 > torsoWidthAtShoulderY) { xOffset = (torsoWidthAtShoulderY / 2) - 2; } xOffset = Math.max(0, xOffset); return { y: shoulderY, xOffset }; };
        const getHipAttachment = () => {
            const hipXOffset = adjustedPelvisWidth * 0.35 * depthFactor;
            const lHipX = dynamicCenterX - hipXOffset;
            const rHipX = dynamicCenterX + hipXOffset;
            return { l: { x: lHipX, y: finalLegY }, r: { x: rHipX, y: finalLegY } };
        };
        const { y: shoulderY, xOffset: shoulderXOffset } = getShoulderAttachment();
        const shoulderXOffset_scaled = shoulderXOffset * depthFactor;
        const { l: lHip, r: rHip } = getHipAttachment();
        const lShoulder = { x: dynamicCenterX - shoulderXOffset_scaled, y: shoulderY }; const rShoulder = { x: dynamicCenterX + shoulderXOffset_scaled, y: shoulderY };
        const createLimbPath = (start: {x: number, y: number}, length: number, angle: number, bend: number, dir: -1 | 1) => { const rad = angle * Math.PI / 180; const end = { x: start.x + dir * length * Math.sin(rad), y: start.y + length * Math.cos(rad) }; const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }; const dx = end.x - start.x; const dy = end.y - start.y; const dist = Math.sqrt(dx * dx + dy * dy); const control = { x: mid.x, y: mid.y }; if (dist > 1e-6) { const perpDx = -dy / dist; const perpDy = dx / dist; control.x = mid.x + perpDx * bend; control.y = mid.y + perpDy * bend; } const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`; return { path, end, control }; };
        
        let finalLLegAngle = lLegAngle;
        let finalRLegAngle = rLegAngle;
        const maxIterations = 90;
        const footMargin = 5;

        for (let i = 0; i < maxIterations; i++) {
            const { end: tempLAnkle } = createLimbPath(lHip, legLength, finalLLegAngle, lLegBend, -1);
            const { end: tempRAnkle } = createLimbPath(rHip, legLength, finalRLegAngle, rLegBend, 1);
            
            const leftInnerEdge = tempLAnkle.x + lLegWidth / 2;
            const rightInnerEdge = tempRAnkle.x - rLegWidth / 2;
            
            const collision = leftInnerEdge + footMargin > rightInnerEdge;

            if (collision) {
                finalLLegAngle = Math.min(45, finalLLegAngle + 1);
                finalRLegAngle = Math.min(45, finalRLegAngle + 1);
            } else {
                break;
            }
        }
        
        const farLimbScale = 0.9; const closeLimbScale = 1.0;
        const lArmWidthScaled = lArmWidth * (viewFactor > 0 ? farLimbScale : closeLimbScale); const rArmWidthScaled = rArmWidth * (viewFactor < 0 ? farLimbScale : closeLimbScale);
        const lLegWidthScaled = lLegWidth * (viewFactor > 0 ? farLimbScale : closeLimbScale); const rLegWidthScaled = rLegWidth * (viewFactor < 0 ? farLimbScale : closeLimbScale);

        // --- Z-INDEXING & FORESHORTENING ---
        const lArmIsBehind = lArmAngle > 90;
        const rArmIsBehind = rArmAngle > 90;
        
        let lArmLengthFinal = armLength;
        let rArmLengthFinal = armLength;
        let lArmWidthFinal = lArmWidthScaled;
        let rArmWidthFinal = rArmWidthScaled;
        let lHandSizeFinal = lHandSize;
        let rHandSizeFinal = rHandSize;
        
        const behindScaleFactor = 0.25; // Shrink by up to 25%

        if (lArmIsBehind) {
            const maxAngle = PARAM_CONFIGS.lArmAngle.max;
            const behindRatio = (lArmAngle - 90) / (maxAngle - 90);
            const scale = 1 - behindRatio * behindScaleFactor;
            lArmLengthFinal *= scale;
            lArmWidthFinal *= scale;
            lHandSizeFinal *= scale;
        }
        if (rArmIsBehind) {
            const maxAngle = PARAM_CONFIGS.rArmAngle.max;
            const behindRatio = (rArmAngle - 90) / (maxAngle - 90);
            const scale = 1 - behindRatio * behindScaleFactor;
            rArmLengthFinal *= scale;
            rArmWidthFinal *= scale;
            rHandSizeFinal *= scale;
        }


        const { path: lArmPath, end: lWrist } = createLimbPath(lShoulder, lArmLengthFinal, lArmAngle, lArmBend, -1); const { path: rArmPath, end: rWrist } = createLimbPath(rShoulder, rArmLengthFinal, rArmAngle, rArmBend, 1); const { path: lLegPath, end: lAnkle } = createLimbPath(lHip, legLength, finalLLegAngle, lLegBend, -1); const { path: rLegPath, end: rAnkle } = createLimbPath(rHip, legLength, finalRLegAngle, rLegBend, 1); const lFootGroundY = lAnkle.y + lLegWidthScaled / 2; const rFootGroundY = rAnkle.y + rLegWidthScaled / 2; const lFootHeight = Math.max(lFootSize, lLegWidthScaled); const rFootHeight = Math.max(rFootSize, rLegWidthScaled); const lFootWidth = Math.min(lFootSize * 2, lLegWidthScaled * 3); const rFootWidth = Math.min(rFootSize * 2, rLegWidthScaled * 3); const lHeelX = lAnkle.x; const lFootPath = `M ${lHeelX} ${lFootGroundY} L ${lHeelX - lFootWidth} ${lFootGroundY} A ${lFootWidth / 2} ${lFootHeight} 0 0 1 ${lHeelX} ${lFootGroundY} Z`; const rHeelX = rAnkle.x; const rFootPath = `M ${rHeelX} ${rFootGroundY} L ${rHeelX + rFootWidth} ${lFootGroundY} A ${rFootWidth / 2} ${rFootHeight} 0 0 0 ${rHeelX} ${lFootGroundY} Z`;
        
        // --- Feature Creation for Z-Sorting ---
        const features: any[] = [];
        
        let fringePath: string = '';
        if (hair) {
            const isWideTopHead = headShape === 'square' || headShape === 'inverted-triangle';
            const hairAnchorY = isWideTopHead ? actualHeadTopY - 10 : actualHeadTopY;

            const fringeHeight = headHeight * (fringeHeightRatio / 100);
            if (fringeHeight > 0.1) {
                const fringeZNom = headWidth * 0.08;
                const fringeProj = projectOnHead(0, fringeZNom);
                const fringeRx = (headWidth / 2) * (isWideTopHead ? 1.1 : 1.0) * (depthFactor * 0.9 + 0.1) + outlineWidth / 2;
                const fringeRy = fringeHeight;
                const fringeCenterY = hairAnchorY + fringeRy;
                const fringeX = dynamicCenterX + viewFactor * headWidth * 0.06;

                if (headShape === 'triangle' && headHeight > 0) {
                    const headWidthAtFringeBottom = (fringeHeight / headHeight) * headWidth;
                    let calculatedFringeRx = (headWidthAtFringeBottom / 2) + (outlineWidth / 2);
                    calculatedFringeRx *= (depthFactor * 0.8 + 0.2);
                    const tipX = fringeX; const tipY = hairAnchorY;
                    const bottomLeftX = fringeX - calculatedFringeRx; const bottomRightX = fringeX + calculatedFringeRx;
                    const bottomY = fringeCenterY;
                    fringePath = `M ${tipX} ${tipY} L ${bottomLeftX} ${bottomY} L ${bottomRightX} ${bottomY} Z`;
                } else {
                    fringePath = `M ${fringeX - fringeRx}, ${fringeCenterY} A ${fringeRx} ${fringeRy} 0 0 1 ${fringeX + fringeRx}, ${fringeCenterY} Z`;
                }
                
                features.push({
                    kind: 'fringe', id: 'fringe', path: fringePath, z: fringeProj.zDepth + 5,
                });
            }
        }
        
        // Eye positioning with proper 2.5D projection
        const eyeBaseX = headWidth * (eyeSpacingRatio / 100) / 2;
        const eyeZ = headWidth * 0.25; // Increased Z depth for more pronounced effect
        const eyeYPos = headY;
        
        // Eyes move along the X axis based on view angle
        const leftEyeX = -eyeBaseX * Math.abs(depthFactor); // Left eye moves toward center
        const rightEyeX = eyeBaseX * Math.abs(depthFactor); // Right eye moves toward center
        
        const leftProj = projectOnHead(leftEyeX, -eyeZ);
        const rightProj = projectOnHead(rightEyeX, eyeZ);

        const baseEyeRx = calculatedEyeSize * 0.85;
        const baseEyeRy = calculatedEyeSize;

        let leftEye = { id: 'leftEye', cx: leftProj.x, cy: eyeYPos, rx: Math.max(2, baseEyeRx * leftProj.scale), ry: Math.max(2, baseEyeRy * leftProj.scale), z: leftProj.zDepth };
        let rightEye = { id: 'rightEye', cx: rightProj.x, cy: eyeYPos, rx: Math.max(2, baseEyeRx * rightProj.scale), ry: Math.max(2, baseEyeRy * rightProj.scale), z: rightProj.zDepth };

        const rightEdgeOfLeft = leftEye.cx + leftEye.rx;
        const leftEdgeOfRight = rightEye.cx - rightEye.rx;
        if (rightEdgeOfLeft > leftEdgeOfRight) {
            const overlap = rightEdgeOfLeft - leftEdgeOfRight;
            leftEye.cx -= overlap / 2;
            rightEye.cx += overlap / 2;
        }

        features.push({ kind: 'eye', ...leftEye }, { kind: 'eye', ...rightEye });

        const localCursorX = (localCursorPos.x - (VIEWBOX_WIDTH_BASE / 2 + charInstance.x)) / charInstance.scale + (VIEWBOX_WIDTH_BASE / 2);
        const localCursorY = (localCursorPos.y - (VIEWBOX_HEIGHT / 2 + charInstance.y)) / charInstance.scale + (VIEWBOX_HEIGHT / 2);
        
        const getPupilOffset = (eyeCenterX: number, eyeCenterY: number, irisRx: number, irisRy: number, pupilRx: number, pupilRy: number) => {
            let targetX: number | undefined; let targetY: number | undefined;
            if (charInstance.lookAt) { targetX = charInstance.lookAt.x; targetY = charInstance.lookAt.y; } else if (eyeTracking) { targetX = localCursorX; targetY = localCursorY; }
            if (targetX === undefined || targetY === undefined) { return { x: 0, y: 0 }; }
            const dx = targetX - eyeCenterX; const dy = targetY - eyeCenterY; const angle = Math.atan2(dy, dx); const dist = Math.sqrt(dx * dx + dy * dy);
            const maxTravelX = irisRx - pupilRx; const maxTravelY = irisRy - pupilRy; const effectiveDist = headWidth * 0.6; const ratio = Math.min(1, dist / effectiveDist);
            return { x: Math.cos(angle) * maxTravelX * ratio, y: Math.sin(angle) * maxTravelY * ratio, };
        };
        
        const calculatedEyebrowYOffset = headHeight * (eyebrowYOffsetRatio / 100);
        const finalEyebrowYOffset = Math.max(calculatedEyebrowYOffset, Math.max(leftEye.ry, rightEye.ry) + calculatedEyebrowHeight / 2 + 5);
        let eyebrowY = eyeYPos - finalEyebrowYOffset;
        const eyebrowTopPoint = eyebrowY - (calculatedEyebrowHeight / 2); 
        const headTopLimit = actualHeadTopY + (outlineWidth / 2); if (eyebrowTopPoint < headTopLimit) { eyebrowY = headTopLimit + (calculatedEyebrowHeight / 2); }
        
        if (hair && fringeHeightRatio > 0) {
            const fringeHeight = headHeight * (fringeHeightRatio / 100);
            const fringeBottomY = actualHeadTopY + fringeHeight;
            eyebrowY = Math.max(eyebrowY, fringeBottomY + calculatedEyebrowHeight / 2 + 3);
        }
        
        if (eyebrows) {
            features.push({ kind: 'eyebrow', id: 'leftBrow', x: leftEye.cx, y: eyebrowY, angle: eyebrowAngle, scale: leftProj.scale, z: leftProj.zDepth + 0.01 });
            features.push({ kind: 'eyebrow', id: 'rightBrow', x: rightEye.cx, y: eyebrowY, angle: -eyebrowAngle, scale: rightProj.scale, z: rightProj.zDepth + 0.01 });
        }
        
        if (eyelashes) {
            features.push({ kind: 'eyelashes', id: 'leftEyelashes', eye: leftEye, z: leftEye.z + 0.02 });
            features.push({ kind: 'eyelashes', id: 'rightEyelashes', eye: rightEye, z: rightEye.z + 0.02 });
        }
        
        // The mouth's horizontal travel range is calculated to place it near the edge of the head at extreme angles,
        // accounting for the foreshortening of the mouth's width. A small padding is used to prevent it from
        // overlapping with the head's outline. This creates a more pronounced 3D effect.
        const finalMouthWidthAt90 = calculatedMouthWidth * 0.2; // Mouth width at 90-degree profile
        const mouthTravelRange = (headWidth / 2) - (finalMouthWidthAt90 / 2) - 4; // Max travel from center, with 4px padding
        const mouthX = dynamicCenterX + viewFactor * mouthTravelRange;
        const mouthZNom = headWidth * 0.05;
        const mouthZDepth = mouthZNom * depthFactor;
        
        features.push({
            kind: 'mouth',
            id: 'mouth',
            x: mouthX,
            scale: 1,
            z: mouthZDepth
        });

        const noseZNom = headWidth * 0.45;
        const noseProj = projectOnHead(0, noseZNom);
        const noseOpacity = Math.abs(viewFactor);
        if (noseOpacity > 0.05) {
            features.push({ kind: 'nose', id: 'nose', z: noseProj.zDepth, opacity: noseOpacity });
        }

        features.sort((a, b) => a.z - b.z);

        const getEyeClipPathData = (eyeX: number, eyeRx: number, eyeRy: number) => {
            // La lógica compleja ahora vive en `eyeFormulas.ts`.
            // Esto simplifica el componente y documenta la solución como se solicitó.
            return getEyePathData({
                style: eyeStyle,
                cx: eyeX,
                cy: eyeYPos,
                rx: eyeRx,
                ry: eyeRy,
                upperLidCoverage: upperEyelidCoverage,
                lowerLidCoverage: lowerEyelidCoverage,
            });
        };
        const renderHead = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; const hW = headWidth / 2; const hH = headHeight / 2; switch (headShape) { case 'circle': return <ellipse cx={dynamicCenterX} cy={headY} rx={hW} ry={hW} {...props} />; case 'square': return <rect x={dynamicCenterX - hW} y={headY - hW} width={headWidth} height={headWidth} rx={headCornerRadius} {...props} />; case 'triangle': return <path d={createRoundedPolygonPath([{x: dynamicCenterX, y: headY-hH}, {x: dynamicCenterX - hW, y: headY+hH}, {x: dynamicCenterX + hW, y: headY+hH}], triangleCornerRadius)} {...props} />; case 'inverted-triangle': return <path d={createRoundedPolygonPath([{x: dynamicCenterX - hW, y: headY-hH}, {x: dynamicCenterX + hW, y: headY-hH}, {x: dynamicCenterX, y: headY+hH}], triangleCornerRadius)} {...props} />; default: return <ellipse cx={dynamicCenterX} cy={headY} rx={hW} ry={hH} {...props} />; } };
        const renderTorso = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; const tW = torsoWidth / 2; const tH = torsoHeight / 2; const torsoCY = torsoTopY + tH; switch (torsoShape) { case 'circle': return <ellipse cx={dynamicCenterX} cy={torsoCY} rx={tW} ry={tH} {...props} />; case 'square': return <rect x={dynamicCenterX - tW} y={torsoTopY} width={torsoWidth} height={torsoWidth} rx={torsoCornerRadius} {...props} />; case 'triangle': return <path d={createRoundedPolygonPath([{x: dynamicCenterX, y: torsoTopY}, {x: dynamicCenterX-tW, y: torsoTopY+torsoHeight}, {x: dynamicCenterX+tW, y: torsoTopY+torsoHeight}], triangleCornerRadius)} {...props} />; case 'inverted-triangle': return <path d={createRoundedPolygonPath([{x: dynamicCenterX-tW, y: torsoTopY}, {x: dynamicCenterX+tW, y: torsoTopY}, {x: dynamicCenterX, y: torsoTopY+torsoHeight}], triangleCornerRadius)} {...props} />; default: return <rect x={dynamicCenterX - tW} y={torsoTopY} width={torsoWidth} height={torsoHeight} rx={torsoCornerRadius} {...props} />; } };
        const renderNeck = () => { return <rect x={dynamicCenterX - finalNeckWidth / 2} y={neckY} width={finalNeckWidth} height={neckConnectionY - neckY + 5} fill={bodyColor} rx={finalNeckWidth * 0.1} />; };
        const renderPelvis = () => { const props = { fill: bodyColor, strokeLinejoin: 'round' as const }; if (torsoShape === 'inverted-triangle') { const topY = pelvisY; const bottomY = topY + params.pelvisHeight; const width = adjustedPelvisWidth; const cr = 15; const socketDepth = params.pelvisHeight * 0.5; let path = `M ${dynamicCenterX - width / 2} ${topY + socketDepth}`; path += ` Q ${dynamicCenterX} ${topY}, ${dynamicCenterX + width / 2} ${topY + socketDepth}`; switch (pelvisShape) { case 'horizontal-oval': path += ` A ${width / 2} ${(bottomY - (topY + socketDepth)) / 2} 0 1 1 ${dynamicCenterX - width / 2} ${topY + socketDepth}`; break; default: path += ` L ${dynamicCenterX + width / 2} ${bottomY - cr}`; path += ` Q ${dynamicCenterX + width / 2} ${bottomY}, ${dynamicCenterX + width / 2 - cr} ${bottomY}`; path += ` L ${dynamicCenterX - width / 2 + cr} ${bottomY}`; path += ` Q ${dynamicCenterX - width / 2} ${bottomY}, ${dynamicCenterX - width / 2} ${bottomY - cr}`; break; } path += ` Z`; return <path d={path.replace(/\s+/g, ' ').trim()} {...props} />; } const topWidth = getTorsoWidthAtY(junctionY); const bottomWidth = adjustedPelvisWidth; const pelvisBottomY = junctionY + params.pelvisHeight; const drawingJunctionY = junctionY - 1; let path = `M ${dynamicCenterX - topWidth / 2} ${drawingJunctionY}`; path += ` L ${dynamicCenterX - bottomWidth / 2} ${drawingJunctionY}`; const cr = 15; switch (pelvisShape) { case 'horizontal-oval': path += ` L ${dynamicCenterX - bottomWidth / 2} ${pelvisBottomY - cr} A ${bottomWidth/2} ${cr} 0 0 0 ${dynamicCenterX + bottomWidth / 2} ${pelvisBottomY - cr} L ${dynamicCenterX + bottomWidth / 2} ${drawingJunctionY}`; break; default: path += ` L ${dynamicCenterX - bottomWidth / 2} ${pelvisBottomY - cr}`; path += ` Q ${dynamicCenterX - bottomWidth/2} ${pelvisBottomY}, ${dynamicCenterX - bottomWidth/2 + cr} ${pelvisBottomY}`; path += ` L ${dynamicCenterX + bottomWidth/2 - cr} ${pelvisBottomY}`; path += ` Q ${dynamicCenterX + bottomWidth/2} ${pelvisBottomY}, ${dynamicCenterX + bottomWidth/2} ${pelvisBottomY - cr}`; path += ` L ${dynamicCenterX + bottomWidth / 2} ${drawingJunctionY}`; break; } path += ` L ${dynamicCenterX + topWidth / 2} ${drawingJunctionY} Z`; return <path d={path.replace(/\s+/g, ' ').trim()} {...props} />; };
        const renderEyelashes = (eyeX: number, eyeRx: number, eyeRy: number) => { if (upperEyelidCoverage >= 95) return null; const lashes: React.ReactNode[] = []; const eyeTopY = eyeYPos - eyeRy; const isLeftEye = eyeX < dynamicCenterX; const angleRad = (isLeftEye ? -eyelashAngle : eyelashAngle) * Math.PI / 180; const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad); if (eyeStyle === 'blocky') { const upperLidY = eyeTopY + (2 * eyeRy * (upperEyelidCoverage / 100) * 0.5); const y_term = (upperLidY - eyeYPos) / eyeRy; const x_offset_sq = Math.max(0, 1 - y_term * y_term); const x_offset = eyeRx * Math.sqrt(x_offset_sq); const startX = eyeX - x_offset; const endX = eyeX + x_offset; const totalWidth = endX - startX; const ratio_start = isLeftEye ? 0.0 : 1.0; const ratio_end = isLeftEye ? 0.4 : 0.6; for (let i = 0; i < eyelashCount; i++) { const step = eyelashCount > 1 ? i / (eyelashCount - 1) : 0.5; const ratio = ratio_start + step * (ratio_end - ratio_start); const lashStartX = startX + totalWidth * ratio; const lashStartY = upperLidY; const outwardDirection = (eyeX < dynamicCenterX) ? -1 : 1; let vx, vy; if (outwardDirection === 1) { vx = ratio; vy = -1; } else { vx = -(1 - ratio); vy = -1; } let len = Math.sqrt(vx * vx + vy * vy); if (len > 0) { vx /= len; vy /= len; } const finalVx = vx * cosA - vy * sinA; const finalVy = vx * sinA + vy * cosA; const lashEndX = lashStartX + eyelashLength * finalVx; const lashEndY = lashStartY + eyelashLength * finalVy; lashes.push(<path key={i} d={`M ${lashStartX} ${lashStartY} L ${lashEndX} ${lashEndY}`} stroke={outlineColor} strokeWidth={1.5} strokeLinecap="round" />); } } else { const leftPointX = eyeX - eyeRx; const rightPointX = eyeX + eyeRx; const verticalCenterY = eyeYPos; const upperControlY = (eyeYPos - eyeRy) + (2 * eyeRy * upperEyelidCoverage) / 100; const p0 = { x: leftPointX, y: verticalCenterY }; const p1 = { x: eyeX, y: upperControlY }; const p2 = { x: rightPointX, y: verticalCenterY }; const t_start = isLeftEye ? 0.0 : 1.0; const t_end = isLeftEye ? 0.4 : 0.6; for (let i = 0; i < eyelashCount; i++) { const step = eyelashCount > 1 ? i / (eyelashCount - 1) : 0.5; const t = t_start + step * (t_end - t_start); const startX = (1 - t)**2 * p0.x + 2 * (1 - t) * t * p1.x + t**2 * p2.x; const startY = (1 - t)**2 * p0.y + 2 * (1 - t) * t * p1.y + t**2 * p2.y; const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x); const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y); let nx = -ty, ny = tx; let len = Math.sqrt(nx**2 + ny**2); if (len > 0) { nx /= len; ny /= len; } if (ny > 0) { nx = -nx; ny = -ny; } const outwardDirection = eyeX < dynamicCenterX ? -1 : 1; nx = nx + outwardDirection * 1.2; ny = ny - 0.2; len = Math.sqrt(nx * nx + ny * ny); if (len > 0) { nx /= len; ny /= len; } const finalNx = nx * cosA - ny * sinA; const finalNy = nx * sinA + ny * cosA; const endX = startX + eyelashLength * finalNx; const endY = startY + eyelashLength * finalNy; lashes.push(<path key={i} d={`M ${startX} ${startY} L ${endX} ${endY}`} stroke={outlineColor} strokeWidth={1.5} strokeLinecap="round" />); } } return <g>{lashes}</g>; };

        const scaleX = charInstance.scale * (isFlipped ? -1 : 1);
        const scaleY = charInstance.scale;

        const renderLeftArm = () => ( <> <path d={lArmPath} fill="none" stroke={bodyColor} strokeWidth={lArmWidthFinal} strokeLinecap="round" strokeLinejoin="round" /> <circle cx={lWrist.x} cy={lWrist.y} r={lHandSizeFinal/2} fill={bodyColor} /> </> );
        const renderRightArm = () => ( <> <path d={rArmPath} fill="none" stroke={bodyColor} strokeWidth={rArmWidthFinal} strokeLinecap="round" strokeLinejoin="round" /> <circle cx={rWrist.x} cy={rWrist.y} r={rHandSizeFinal/2} fill={bodyColor} /> </> );
        const renderLeftLeg = () => ( <> <path d={lFootPath} fill={bodyColor} /> <path d={lLegPath} fill="none" stroke={bodyColor} strokeWidth={lLegWidthScaled} strokeLinecap="round" strokeLinejoin="round" /> <circle cx={lHip.x} cy={lHip.y} r={lLegWidthScaled / 2 * 1.6} fill={bodyColor} /> </> );
        const renderRightLeg = () => ( <> <path d={rFootPath} fill={bodyColor} /> <path d={rLegPath} fill="none" stroke={bodyColor} strokeWidth={rLegWidthScaled} strokeLinecap="round" strokeLinejoin="round" /> <circle cx={rHip.x} cy={rHip.y} r={rLegWidthScaled / 2 * 1.6} fill={bodyColor} /> </> );

        return (
            <g transform={`translate(${charInstance.x}, ${charInstance.y}) scale(${scaleX}, ${scaleY})`}>
                <g transform={`translate(${-VIEWBOX_WIDTH_BASE/2}, ${-VIEWBOX_HEIGHT/2})`}>
                    <defs>
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
                    
                    {hair && <g>
                        <path d={(() => {
                            const isWideTopHead = headShape === 'square' || headShape === 'inverted-triangle';
                            const hairAnchorY = isWideTopHead ? actualHeadTopY - 10 : actualHeadTopY;
                            const backHairWidth = headWidth * (backHairWidthRatio / 100);
                            const backHairRx = (backHairWidth / 2) * (1 + 0.25 * Math.abs(viewFactor));
                            const backHairRy = headHeight * (backHairHeightRatio / 100);
                            const backHairCenterY = hairAnchorY + backHairRy * 0.7;
                            return `M ${dynamicCenterX - backHairRx}, ${backHairCenterY} A ${backHairRx} ${backHairRy} 0 0 1 ${dynamicCenterX + backHairRx}, ${backHairCenterY} Z`;
                        })()} fill={hairColor} />
                    </g>}
                    
                    {lArmIsBehind && <g key="lArmBehind" filter={bodyOutlines ? `url(#${filterId})` : 'none'}>{renderLeftArm()}</g>}
                    {rArmIsBehind && <g key="rArmBehind" filter={bodyOutlines ? `url(#${filterId})` : 'none'}>{renderRightArm()}</g>}

                    <g filter={bodyOutlines ? `url(#${filterId})` : 'none'}>
                        {viewFactor > 0 && (
                            <>
                                <g key="lLeg">{renderLeftLeg()}</g>
                                {!lArmIsBehind && <g key="lArm">{renderLeftArm()}</g>}
                            </>
                        )}
                        {viewFactor <= 0 && (
                            <>
                                <g key="rLeg">{renderRightLeg()}</g>
                                {!rArmIsBehind && <g key="rArm">{renderRightArm()}</g>}
                            </>
                        )}
                        
                        {renderHead()} {renderNeck()} {renderTorso()} {renderPelvis()}

                        {viewFactor > 0 && (
                             <>
                                <g key="rLeg">{renderRightLeg()}</g>
                                {!rArmIsBehind && <g key="rArm">{renderRightArm()}</g>}
                            </>
                        )}
                        {viewFactor <= 0 && (
                            <>
                                 <g key="lLeg">{renderLeftLeg()}</g>
                                 {!lArmIsBehind && <g key="lArm">{renderLeftArm()}</g>}
                            </>
                        )}
                    </g>


                    {features.map(f => {
                        switch (f.kind) {
                            case 'eye': {
                                const { id, cx, cy, rx, ry } = f;

                                switch (eyeStyle) {
                                    case 'dot': {
                                        const dotRadius = ry * (pupilSizeRatio / 100) * 0.5;
                                        return <circle key={id} cx={cx} cy={cy} r={dotRadius} fill={pupilColor} />;
                                    }
                                    case 'square': {
                                        const irisRadius = ry * 0.6;
                                        const pupilRadius = ry * 0.3;
                                        const pupilOffset = getPupilOffset(cx, cy, irisRadius - pupilRadius, irisRadius - pupilRadius, 0, 0);
                                        const glintRadius = calculatedEyeSize * (glintSizeRatio / 100);
                                        const glintOffsetX = (irisRadius * (glintXOffsetRatio / 100));
                                        const glintOffsetY = (irisRadius * (glintYOffsetRatio / 100));
                                        
                                        return (
                                            <g key={id}>
                                                <rect x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} fill="white" stroke={eyeOutlines ? outlineColor : 'none'} strokeWidth={2}/>
                                                <circle cx={cx + pupilOffset.x} cy={cy + pupilOffset.y} r={irisRadius} fill={irisColor} />
                                                <circle cx={cx + pupilOffset.x} cy={cy + pupilOffset.y} r={pupilRadius} fill={pupilColor} />
                                                {glint && <circle cx={cx + pupilOffset.x * 0.5 + glintOffsetX} cy={cy + pupilOffset.y * 0.5 + glintOffsetY} r={glintRadius} fill="white" fillOpacity={glintOpacity / 100} />}
                                            </g>
                                        );
                                    }
                                    case 'triangle': {
                                        const path = `M ${cx} ${cy - ry} L ${cx - rx} ${cy + ry} L ${cx + rx} ${cy + ry} Z`;
                                        const clipId = `eyeClip-${id}-${instanceKey}`;

                                        const pupilYOffset = ry * 0.3;
                                        const irisRadius = ry * 0.5;
                                        const pupilRadius = ry * 0.25;
                                        const pupilOffset = getPupilOffset(cx, cy + pupilYOffset, irisRadius - pupilRadius, irisRadius - pupilRadius, 0, 0);
                                        
                                        const glintRadius = calculatedEyeSize * (glintSizeRatio / 100) * (f.id === 'leftEye' ? leftProj.scale : rightProj.scale);
                                        const glintOffsetX = (irisRadius * (glintXOffsetRatio / 100));
                                        const glintOffsetY = (irisRadius * (glintYOffsetRatio / 100));

                                        return (
                                            <g key={id}>
                                                <defs>
                                                    <clipPath id={clipId}>
                                                        <path d={path} />
                                                    </clipPath>
                                                </defs>
                                                <path d={path} fill="white" stroke={eyeOutlines ? outlineColor : 'none'} strokeWidth={2} strokeLinejoin="round" />
                                                <g clipPath={`url(#${clipId})`}>
                                                    <ellipse cx={cx + pupilOffset.x} cy={cy + pupilYOffset + pupilOffset.y} rx={irisRadius} ry={irisRadius} fill={irisColor} />
                                                    <ellipse cx={cx + pupilOffset.x} cy={cy + pupilYOffset + pupilOffset.y} rx={pupilRadius} ry={pupilRadius} fill={pupilColor} />
                                                    {glint && <circle 
                                                        cx={cx + pupilOffset.x * 0.5 + glintOffsetX} 
                                                        cy={cy + pupilYOffset + pupilOffset.y * 0.5 + glintOffsetY} 
                                                        r={glintRadius} 
                                                        fill="white"
                                                        fillOpacity={glintOpacity / 100}
                                                    />}
                                                </g>
                                            </g>
                                        );
                                    }
                                    case 'circle':
                                    case 'realistic':
                                    case 'blocky':
                                    default: {
                                        const clipRx = eyeStyle === 'circle' ? ry : rx;
                                        const irisRx = clipRx * 0.7; const irisRy = ry * 0.7;
                                        const pupilRy = calculatedPupilSize * (f.id === 'leftEye' ? leftProj.scale : rightProj.scale);
                                        const pupilRx = pupilRy * (clipRx / ry);
                                        const pupilOffset = getPupilOffset(cx, cy, irisRx, irisRy, pupilRx, pupilRy);
                                        const eyelidCompensationY = (ry * (upperEyelidCoverage / 100)) * 0.4;
                                        
                                        const glintRadius = calculatedEyeSize * (glintSizeRatio / 100) * (f.id === 'leftEye' ? leftProj.scale : rightProj.scale);
                                        const glintOffsetX = (irisRx * (glintXOffsetRatio / 100)) * (f.id === 'leftEye' ? leftProj.scale : rightProj.scale);
                                        const glintOffsetY = (irisRy * (glintYOffsetRatio / 100)) * (f.id === 'leftEye' ? leftProj.scale : rightProj.scale);

                                        return (
                                            <g key={id}>
                                                <defs>
                                                  <clipPath id={`eyeClip-${id}-${instanceKey}`}><path d={getEyeClipPathData(cx, clipRx, ry)} /></clipPath>
                                                </defs>
                                                <g clipPath={`url(#eyeClip-${id}-${instanceKey})`}>
                                                    <ellipse cx={cx} cy={cy} rx={clipRx} ry={ry} fill="white" />
                                                    <ellipse cx={cx + pupilOffset.x} cy={cy + pupilOffset.y - eyelidCompensationY} rx={irisRx} ry={irisRy} fill={irisColor} />
                                                    <ellipse cx={cx + pupilOffset.x} cy={cy + pupilOffset.y - eyelidCompensationY} rx={pupilRx} ry={pupilRy} fill={pupilColor} />
                                                    {glint && <circle cx={cx + glintOffsetX + pupilOffset.x * 0.5} cy={cy + glintOffsetY + pupilOffset.y * 0.5 - eyelidCompensationY} r={glintRadius} fill="white" fillOpacity={glintOpacity/100} />}
                                                </g>
                                                {eyeOutlines && <path d={getEyeClipPathData(cx, clipRx, ry)} fill="none" stroke={outlineColor} strokeWidth={4 / 2} strokeLinejoin="round" />}
                                            </g>
                                        );
                                    }
                                }
                            }
                            case 'eyelashes':
                                return ['realistic', 'blocky', 'circle'].includes(eyeStyle) ? <g key={f.id}>{renderEyelashes(f.eye.cx, f.eye.rx, f.eye.ry)}</g> : null;
                            case 'eyebrow':
                                return (
                                    <g key={f.id} transform={`translate(${f.x}, ${f.y}) rotate(${f.angle}) scale(${f.scale})`}>
                                        <rect x={-calculatedEyebrowWidth / 2} y={-calculatedEyebrowHeight / 2} width={calculatedEyebrowWidth} height={calculatedEyebrowHeight} fill={hairColor} rx={2} />
                                    </g>
                                );
                            case 'mouth': {
                                const calculatedMouthYOffset = (headHeight / 2) * (mouthYOffsetRatio / 100);
                                const mouthYPos = headY + calculatedMouthYOffset;
                                let finalMouthWidth = calculatedMouthWidth * (depthFactor * 0.8 + 0.2);
                                const mouthCurvature = finalMouthWidth * 0.4 * (mouthBend / 100);
                                const controlPointX = f.x + viewFactor * finalMouthWidth * 0.3;
                                const mouthPath = `M ${f.x - finalMouthWidth / 2} ${mouthYPos} Q ${controlPointX} ${mouthYPos + mouthCurvature} ${f.x + finalMouthWidth / 2} ${mouthYPos}`;
                                return <path key={f.id} d={mouthPath} stroke={outlineColor} strokeWidth="4" fill="none" strokeLinecap="round" />;
                            }
                             case 'nose': {
                                const noseLength = headHeight * 0.15;
                                const noseBridge = headHeight * 0.05;
                                const noseX = dynamicCenterX + (headWidth/2 * 0.8) * viewFactor;
                                const noseY = headY;
                                const nosePath = `M ${noseX} ${noseY - noseBridge} C ${noseX + viewFactor * noseLength * 0.5} ${noseY}, ${noseX + viewFactor * noseLength} ${noseY + noseLength * 0.5}, ${noseX} ${noseY + noseLength}`;
                                return <path key={f.id} d={nosePath} fill={bodyColor} opacity={f.opacity} />;
                             }
                            case 'fringe':
                                return <g key={f.id} filter={bodyOutlines ? `url(#${filterId})` : 'none'}><path d={f.path} fill={hairColor} /></g>;
                            default:
                                return null;
                        }
                    })}
                </g>
            </g>
        );
    }, [charInstance, instanceKey, localCursorPos]);

    return renderedCharacter;
};

export default React.memo(Character);