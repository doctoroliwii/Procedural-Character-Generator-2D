import React, { useMemo } from 'react';
import type { CharacterParams, CharacterInstance, ComicPanelData } from '../types';
import Character from './Character';

// --- START HELPER FUNCTIONS ---

function checkCollision(rectA: {x: number, y: number, width: number, height: number}, rectB: {x: number, y: number, width: number, height: number}) {
  return rectA.x < rectB.x + rectB.width &&
         rectA.x + rectA.width > rectB.x &&
         rectA.y < rectB.y + rectB.height &&
         rectA.y + rectA.height > rectB.y;
}

function findOptimalBubblePosition(
    speakerHead: {x: number, y: number, width: number, height: number},
    bubbleW: number,
    bubbleH: number,
    allHeadsInPanel: {x: number, y: number, width: number, height: number}[],
    otherBubbleRects: {x: number, y: number, width: number, height: number}[]
) {
    const padding = 25;
    const sidePadding = 15;
    const candidates = [
        { x: speakerHead.x + speakerHead.width / 2, y: speakerHead.y - bubbleH / 2 - padding },
        { x: speakerHead.x + speakerHead.width + bubbleW / 2, y: speakerHead.y - bubbleH / 4 },
        { x: speakerHead.x - bubbleW / 2, y: speakerHead.y - bubbleH / 4 },
        { x: speakerHead.x + speakerHead.width + bubbleW / 2 + sidePadding, y: speakerHead.y + speakerHead.height / 2 },
        { x: speakerHead.x - bubbleW / 2 - sidePadding, y: speakerHead.y + speakerHead.height / 2 },
        { x: speakerHead.x + speakerHead.width / 2, y: speakerHead.y - bubbleH - padding*2 },
    ];

    for (const pos of candidates) {
        const bubbleRect = { x: pos.x - bubbleW / 2, y: pos.y - bubbleH / 2, width: bubbleW, height: bubbleH };
        let isColliding = false;

        for (const head of allHeadsInPanel) {
            if (checkCollision(bubbleRect, head)) {
                isColliding = true;
                break;
            }
        }
        if (isColliding) continue;

        for (const otherBubble of otherBubbleRects) {
            const paddedOtherBubble = { ...otherBubble, x: otherBubble.x - 10, y: otherBubble.y - 10, width: otherBubble.width + 20, height: otherBubble.height + 20 };
            if (checkCollision(bubbleRect, paddedOtherBubble)) {
                isColliding = true;
                break;
            }
        }

        if (!isColliding) {
            return { bubbleX: pos.x, bubbleY: pos.y };
        }
    }
    return { bubbleX: candidates[0].x, bubbleY: candidates[0].y };
}

const createBubblePathWithTail = (bubbleRect: {x: number, y: number, width: number, height: number}, tailTip: {x: number, y: number}): string => {
    const { x, y, width, height } = bubbleRect;
    const r = 15;
    const tailBaseWidth = 20;

    const dx = tailTip.x - (x + width / 2);
    const dy = tailTip.y - (y + height / 2);
    
    let edge = 'bottom';
    
    const horizontalDist = Math.max(0, Math.abs(dx) - width / 2);
    const verticalDist = Math.max(0, Math.abs(dy) - height / 2);

    if (horizontalDist > verticalDist) {
        edge = dx > 0 ? 'right' : 'left';
    } else {
        edge = dy > 0 ? 'bottom' : 'top';
    }
    
    let tailP1: {x: number, y: number}, tailP2: {x: number, y: number};
    
    switch(edge) {
        case 'top':
            const tailBaseCenterXTop = Math.max(x + r, Math.min(x + width - r, tailTip.x));
            tailP1 = { x: tailBaseCenterXTop + tailBaseWidth / 2, y: y };
            tailP2 = { x: tailBaseCenterXTop - tailBaseWidth / 2, y: y };
            break;
        case 'bottom':
            const tailBaseCenterXBottom = Math.max(x + r, Math.min(x + width - r, tailTip.x));
            tailP1 = { x: tailBaseCenterXBottom - tailBaseWidth / 2, y: y + height };
            tailP2 = { x: tailBaseCenterXBottom + tailBaseWidth / 2, y: y + height };
            break;
        case 'left':
            const tailBaseCenterYLeft = Math.max(y + r, Math.min(y + height - r, tailTip.y));
            tailP1 = { x: x, y: tailBaseCenterYLeft - tailBaseWidth / 2 };
            tailP2 = { x: x, y: tailBaseCenterYLeft + tailBaseWidth / 2 };
            break;
        case 'right':
        default:
            const tailBaseCenterYRight = Math.max(y + r, Math.min(y + height - r, tailTip.y));
            tailP1 = { x: x + width, y: tailBaseCenterYRight + tailBaseWidth / 2 };
            tailP2 = { x: x + width, y: tailBaseCenterYRight - tailBaseWidth / 2 };
            break;
    }

    let path = `M ${x + r},${y}`;
    if (edge === 'top') path += ` L ${tailP2.x},${y} L ${tailTip.x},${tailTip.y} L ${tailP1.x},${y}`;
    path += ` L ${x + width - r},${y}`;
    path += ` A ${r},${r} 0 0 1 ${x + width},${y + r}`;
    if (edge === 'right') path += ` L ${x + width},${tailP2.y} L ${tailTip.x},${tailTip.y} L ${x + width},${tailP1.y}`;
    path += ` L ${x + width},${y + height - r}`;
    path += ` A ${r},${r} 0 0 1 ${x + width - r},${y + height}`;
    if (edge === 'bottom') path += ` L ${tailP2.x},${y + height} L ${tailTip.x},${tailTip.y} L ${tailP1.x},${y + height}`;
    path += ` L ${x + r},${y + height}`;
    path += ` A ${r},${r} 0 0 1 ${x},${y + height - r}`;
    if (edge === 'left') path += ` L ${x},${tailP2.y} L ${tailTip.x},${tailTip.y} L ${x},${tailP1.y}`;
    path += ` L ${x},${y + r}`;
    path += ` A ${r},${r} 0 0 1 ${x + r},${y} Z`;
    
    return path;
};

const calculateLocalFootY = (params: CharacterParams): number => {
    const { headWidth, headHeight, headShape, neckHeight, torsoHeight, torsoWidth, torsoShape, torsoCornerRadius, pelvisHeight, pelvisWidthRatio, lLegWidth, rLegWidth, legLength, lLegAngle, rLegAngle } = params;
    const headY = 120;
    const headBottomY = headY + (headShape === 'circle' || headShape === 'square' ? headWidth / 2 : headHeight / 2);
    const neckY = headBottomY - 15;
    const torsoTopY = neckY + neckHeight;
    const getTorsoWidthAtY = (y: number) => { const yRel = y - torsoTopY; if (yRel < 0 || yRel > torsoHeight) return 0; switch (torsoShape) { case 'circle': { const rx = torsoWidth / 2; const ry = torsoHeight / 2; if (ry === 0) return torsoWidth; const centerY = torsoTopY + ry; const yDistFromCenter = Math.abs(y - centerY); if (yDistFromCenter > ry) return 0; return 2 * rx * Math.sqrt(1 - (yDistFromCenter / ry) ** 2); } case 'triangle': return torsoHeight > 0 ? torsoWidth * (yRel / torsoHeight) : 0; case 'inverted-triangle': return torsoHeight > 0 ? torsoWidth * (1 - yRel / torsoHeight) : torsoWidth; default: return torsoWidth; } };
    const calculatedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);
    const searchStartY = torsoTopY + torsoHeight; const searchEndY = torsoTopY + torsoHeight * 0.4; let junctionY = searchStartY;
    for (let y = searchStartY; y >= searchEndY; y -= 2) { if (getTorsoWidthAtY(y) >= calculatedPelvisWidth) { junctionY = y; break; } }
    const pelvisOverlap = 5; const pelvisY = junctionY - pelvisOverlap; const legY = pelvisY + pelvisHeight * 0.8;
    const lAnkleY = legY + legLength * Math.cos(lLegAngle * Math.PI / 180); const rAnkleY = legY + legLength * Math.cos(rLegAngle * Math.PI / 180);
    const lFootGroundY = lAnkleY + lLegWidth / 2; const rFootGroundY = rAnkleY + rLegWidth / 2;
    return Math.max(lFootGroundY, rFootGroundY);
};

const getCharacterHeadBounds = (params: CharacterParams) => {
    const { headWidth, headHeight, headShape } = params;
    const centerX = VIEWBOX_WIDTH_BASE / 2;
    const headY = 120;
    const width = headWidth;
    const height = headShape === 'circle' || headShape === 'square' ? headWidth : headHeight;
    const x = centerX - width / 2;
    const y = headY - height / 2;
    return { x, y, width, height };
};

const getCharacterMouthPos = (params: CharacterParams) => {
    const { mouthYOffsetRatio, headHeight } = params;
    const centerX = VIEWBOX_WIDTH_BASE / 2;
    const headY = 120;
    const calculatedMouthYOffset = (headHeight / 2) * (mouthYOffsetRatio / 100);
    return { x: centerX, y: headY + calculatedMouthYOffset };
};

const wrapText = (text: string, fontSize: number, maxWidth: number): string[] => {
    if (!text) return [];
    const words = text.split(' ');
    if (words.length === 0) return [];
    const lines: string[] = [];
    let currentLine = words[0];
    const avgCharWidth = fontSize * 0.7;
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const prospectiveLine = currentLine + " " + word;
        if (prospectiveLine.length * avgCharWidth > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = prospectiveLine;
        }
    }
    lines.push(currentLine);
    return lines;
};
// --- END HELPER FUNCTIONS ---

const VIEWBOX_WIDTH_BASE = 400;
const VIEWBOX_HEIGHT = 600;

const calculatePanelTransform = (panel: ComicPanelData, pW: number, pH: number) => {
    const { characters, shotType } = panel;
    if (characters.length === 0) return `translate(${pW / 2}, ${pH / 2}) scale(0.6)`;

    let groupMinX = Infinity, groupMaxX = -Infinity, groupMinY = Infinity, groupMaxY = -Infinity;

    characters.forEach(char => {
        const { params, x, y, scale } = char;
        let localMinY: number, localMaxY: number;

        if (shotType === 'full-shot') {
            localMinY = 120 - params.headHeight / 2;
            localMaxY = calculateLocalFootY(params);
        } else {
            const headTopY = 120 - params.headHeight / 2;
            if (shotType === 'close-up') {
                localMinY = headTopY - 20;
                localMaxY = headTopY + params.headHeight + params.neckHeight + 40;
            } else { // medium-shot
                const headBottomY = 120 + params.headHeight / 2;
                const torsoTopY = headBottomY - 15 + params.neckHeight;
                localMinY = headTopY - 20;
                localMaxY = torsoTopY + params.torsoHeight;
            }
        }
        
        const localWidth = Math.max(params.headWidth, params.torsoWidth);
        const localMinX = 200 - localWidth / 2;
        const localMaxX = 200 + localWidth / 2;

        const transformedMinX = (localMinX - 200) * scale + x + 200;
        const transformedMaxX = (localMaxX - 200) * scale + x + 200;
        const transformedMinY = (localMinY - 300) * scale + y + 300;
        const transformedMaxY = (localMaxY - 300) * scale + y + 300;

        groupMinX = Math.min(groupMinX, transformedMinX);
        groupMaxX = Math.max(groupMaxX, transformedMaxX);
        groupMinY = Math.min(groupMinY, transformedMinY);
        groupMaxY = Math.max(groupMaxY, transformedMaxY);
    });

    const contentWidth = groupMaxX - groupMinX;
    const contentHeight = groupMaxY - groupMinY;

    if (contentWidth <= 0 || contentHeight <= 0) {
        return `translate(${pW / 2}, ${pH / 2}) scale(0.6)`;
    }

    const padding = shotType === 'close-up' ? 1.05 : 1.15;
    const scaleX = pW / (contentWidth * padding);
    const scaleY = pH / (contentHeight * padding);
    const finalScale = Math.min(scaleX, scaleY);

    const contentCenterX = groupMinX + contentWidth / 2;
    const contentCenterY = groupMinY + contentHeight / 2;

    const translateX = (pW / 2) - (contentCenterX * finalScale);
    const translateY = (pH / 2) - (contentCenterY * finalScale);

    return `translate(${translateX}, ${translateY}) scale(${finalScale})`;
};


interface ComicPanelProps {
  panel: ComicPanelData;
  panelLayout: { x: number; y: number; width: number; height: number };
  minComicFontSize: number;
  maxComicFontSize: number;
  instanceKey: string;
  layer: 'content' | 'dialogue';
}

const ComicPanel: React.FC<ComicPanelProps> = ({ panel, panelLayout, minComicFontSize, maxComicFontSize, instanceKey, layer }) => {
  const { x: pX, y: pY, width: pW, height: pH } = panelLayout;

  const panelTransform = useMemo(() => {
    return calculatePanelTransform(panel, pW, pH);
  }, [panel, pW, pH]);

  const dialogueData = useMemo(() => {
    if (layer === 'content' || !panelTransform) return [];

    const transformMatch = /translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/.exec(panelTransform);
    if (!transformMatch) return [];
    
    const [, txStr, tyStr, sStr] = transformMatch;
    const tx = parseFloat(txStr);
    const ty = parseFloat(tyStr);
    const s = parseFloat(sStr);
    
    const transformPointToAbsolute = (localPos: { x: number, y: number }) => {
      const transformedX = localPos.x * s + tx;
      const transformedY = localPos.y * s + ty;
      return { x: pX + transformedX, y: pY + transformedY };
    };

    const getAbsoluteHeadBounds = (char: CharacterInstance) => {
        const headBoundsLocal = getCharacterHeadBounds(char.params);
        const getTransformedLocalPoint = (px: number, py: number) => ({
            x: ((px - 200) * char.scale) + char.x + 200,
            y: ((py - 300) * char.scale) + char.y + 300
        });
        const headTopLeft = getTransformedLocalPoint(headBoundsLocal.x, headBoundsLocal.y);
        const headBottomRight = getTransformedLocalPoint(headBoundsLocal.x + headBoundsLocal.width, headBoundsLocal.y + headBoundsLocal.height);
        const absTopLeft = transformPointToAbsolute(headTopLeft);
        const absBottomRight = transformPointToAbsolute(headBottomRight);
        return { x: absTopLeft.x, y: absTopLeft.y, width: absBottomRight.x - absTopLeft.x, height: absBottomRight.y - absTopLeft.y, };
    };
    
    const allHeadBoundsInPanel = panel.characters.map(getAbsoluteHeadBounds);
    const placedBubbleRects: {x: number, y: number, width: number, height: number}[] = [];

    return panel.dialogues.map((dialogue, i) => {
      const speakerId = dialogue.characterId;
      const speakerIndexInPanel = panel.characterIdsInPanel.indexOf(speakerId);
      if (speakerIndexInPanel === -1) return null;
      
      const speaker = panel.characters[speakerIndexInPanel];
      if (!speaker) return null;

      const speakerHeadBounds = allHeadBoundsInPanel[speakerIndexInPanel];
      const maxBubbleWidth = Math.min(180, pW * 0.7);
      
      const FONT_SCALE_FACTOR = 40;
      const textLength = dialogue.text.length;
      const sizeRange = maxComicFontSize - minComicFontSize;
      const targetSize = maxComicFontSize - (textLength / FONT_SCALE_FACTOR) * sizeRange;
      const dynamicFontSize = Math.max(minComicFontSize, Math.min(maxComicFontSize, targetSize));
      
      const textLines = wrapText(dialogue.text.toUpperCase(), dynamicFontSize, maxBubbleWidth - 20);
      const textHeight = textLines.length * dynamicFontSize * 1.2;
      const bubbleWidth = Math.min(maxBubbleWidth, Math.max(80, textLines.reduce((max, line) => Math.max(max, line.length * dynamicFontSize * 0.7), 0) + 20));
      const bubbleHeight = textHeight + 20;

      const { bubbleX, bubbleY } = findOptimalBubblePosition(speakerHeadBounds, bubbleWidth, bubbleHeight, allHeadBoundsInPanel, placedBubbleRects);
      
      const bubbleRect = { x: bubbleX - bubbleWidth / 2, y: bubbleY - bubbleHeight / 2, width: bubbleWidth, height: bubbleHeight };
      placedBubbleRects.push(bubbleRect);
      
      const mouthPosInCanvas = getCharacterMouthPos(speaker.params);
      const finalMouthPosLocal = {
          x: ((mouthPosInCanvas.x - 200) * speaker.scale) + speaker.x + 200,
          y: ((mouthPosInCanvas.y - 300) * speaker.scale) + speaker.y + 300
      };

      const tailTip = transformPointToAbsolute(finalMouthPosLocal);
      const bubblePath = createBubblePathWithTail(bubbleRect, tailTip);

      return { key: `dialogue-${instanceKey}-${i}`, bubblePath, bubbleX, bubbleY, textHeight, dynamicFontSize, textLines };
    }).filter(Boolean);

  }, [panel, panelTransform, minComicFontSize, maxComicFontSize, pX, pY, pW, pH, instanceKey, layer]);

  if (layer === 'dialogue') {
      return (
        <g className="dialogue-layer">
          {dialogueData.map((data: any) => (
              <g key={data.key}>
                  <path d={data.bubblePath} fill="white" stroke="black" strokeWidth="2" strokeLinejoin='round' />
                  <text x={data.bubbleX} y={data.bubbleY - data.textHeight/2 + data.dynamicFontSize} textAnchor="middle" fontSize={data.dynamicFontSize} fontFamily="sans-serif" fill="black" fontWeight="bold" style={{ userSelect: 'none' }}>
                      {data.textLines.map((line: string, lineIndex: number) => (
                          <tspan key={lineIndex} x={data.bubbleX} dy={lineIndex === 0 ? 0 : data.dynamicFontSize * 1.2}>{line}</tspan>
                      ))}
                  </text>
              </g>
          ))}
        </g>
      )
  }

  // layer === 'content'
  return (
    <g transform={`translate(${pX}, ${pY})`}>
        <defs><clipPath id={`clip-${panel.id}`}><rect x="0" y="0" width={pW} height={pH} /></clipPath></defs>
        <rect x="0" y="0" width={pW} height={pH} fill={panel.backgroundColor} />
        <g clipPath={`url(#clip-${panel.id})`}>
            <g transform={panelTransform}>
                {panel.characters.map((char, charIndex) => 
                    <Character 
                      key={`${panel.id}-${charIndex}`}
                      charInstance={char} 
                      instanceKey={`${panel.id}-${charIndex}`}
                      localCursorPos={{x: 0, y: 0}}
                    />
                )}
            </g>
        </g>
        <rect x="0" y="0" width={pW} height={pH} fill="none" stroke="black" strokeWidth="4" />
    </g>
  );
};

export default React.memo(ComicPanel);