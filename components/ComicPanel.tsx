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

const getClosestPointOnRect = (point: {x: number, y: number}, rect: {x: number, y: number, width: number, height: number}) => {
    const closestX = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
    return { x: closestX, y: closestY };
};

const createBubblePathWithTail = (
    bubbleRect: {x: number, y: number, width: number, height: number}, 
    initialTailTip: {x: number, y: number}
): string => {
    const { x, y, width, height } = bubbleRect;
    
    // Failsafe: if the tail tip is inside the bubble, move it to the nearest edge
    let tailTip = { ...initialTailTip };
    if (tailTip.x > x && tailTip.x < x + width && tailTip.y > y && tailTip.y < y + height) {
        tailTip = getClosestPointOnRect(tailTip, bubbleRect);
    }
    
    const r = 15; // Border radius
    const tailBaseWidth = 20;

    // Calculate center of bubble
    const bubbleCenterX = x + width / 2;
    const bubbleCenterY = y + height / 2;
    
    // Calculate distances to each edge
    const distToTop = Math.abs(tailTip.y - y);
    const distToBottom = Math.abs(tailTip.y - (y + height));
    const distToLeft = Math.abs(tailTip.x - x);
    const distToRight = Math.abs(tailTip.x - (x + width));
    
    // Find the closest edge
    const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
    
    let edge: 'top' | 'bottom' | 'left' | 'right';
    
    if (minDist === distToBottom) {
        edge = 'bottom';
    } else if (minDist === distToTop) {
        edge = 'top';
    } else if (minDist === distToLeft) {
        edge = 'left';
    } else {
        edge = 'right';
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

    // Build the path with rounded corners
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

const estimateTextWidth = (text: string, fontSize: number): number => {
    let width = 0;
    // This regex covers Hiragana, Katakana, CJK Unified Ideographs, and full-width forms
    const cjkRegex = /[\u3040-\u30ff\u4e00-\u9faf\uff00-\uffef]/g;
    const cjkChars = (text.match(cjkRegex) || []).length;
    const otherChars = text.length - cjkChars;
    // Heuristics: CJK chars are roughly square (width ~ fontSize * 1.05), others are narrower (width ~ fontSize * 0.6).
    width += cjkChars * fontSize * 1.05;
    width += otherChars * fontSize * 0.6;
    return width;
};

const wrapText = (text: string, fontSize: number, maxWidth: number): string[] => {
    if (!text) return [];
    // CJK languages don't use spaces, so we need to be able to break after any character.
    const isCjk = /[\u3040-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(text);
    const words = isCjk ? text.split('') : text.split(' ');
    if (words.length === 0) return [];
    const lines: string[] = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const separator = isCjk ? '' : ' ';
        const prospectiveLine = currentLine + separator + word;
        if (estimateTextWidth(prospectiveLine, fontSize) > maxWidth) {
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
const VIEWBOX_HEIGHT = 700;

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
        const localMinX = VIEWBOX_WIDTH_BASE / 2 - localWidth / 2;
        const localMaxX = VIEWBOX_WIDTH_BASE / 2 + localWidth / 2;

        const transformedMinX = (localMinX - VIEWBOX_WIDTH_BASE / 2) * scale + x;
        const transformedMaxX = (localMaxX - VIEWBOX_WIDTH_BASE / 2) * scale + x;
        const transformedMinY = (localMinY - VIEWBOX_HEIGHT / 2) * scale + y;
        const transformedMaxY = (localMaxY - VIEWBOX_HEIGHT / 2) * scale + y;

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

    // --- NEW COMPOSITION LOGIC ---
    // Reserve top 25% of the panel for dialogue bubbles.
    const characterAreaY = pH * 0.25; // Reducir a 25% para dar más espacio a personajes
    const characterAreaHeight = pH * 0.75;
    const characterAreaWidth = pW;

    // Add padding to the content
    const padding = shotType === 'close-up' ? 1.05 : 1.15;
    const paddedContentWidth = contentWidth * padding;
    const paddedContentHeight = contentHeight * padding;
    
    // Calculate scale to fit content within the character area
    const scaleX = characterAreaWidth / paddedContentWidth;
    const scaleY = characterAreaHeight / paddedContentHeight;
    const finalScale = Math.min(scaleX, scaleY);
    
    // Center of the original content bounding box
    const contentCenterX = groupMinX + contentWidth / 2;
    const contentCenterY = groupMinY + contentHeight / 2;
    
    // Calculate translation to center the scaled content within the character area
    const translateX = (pW / 2) - (contentCenterX * finalScale);
    // The target Y is the center of the character area
    const targetY = characterAreaY + (characterAreaHeight / 2);
    const translateY = targetY - (contentCenterY * finalScale);

    return `translate(${translateX}, ${translateY}) scale(${finalScale})`;
};


interface ComicPanelProps {
  panel: ComicPanelData;
  panelLayout: { x: number; y: number; width: number; height: number };
  minComicFontSize: number;
  maxComicFontSize: number;
  instanceKey: string;
  comicLanguage: string;
  layer: 'content' | 'dialogue';
}

const ComicPanel: React.FC<ComicPanelProps> = ({ panel, panelLayout, minComicFontSize, maxComicFontSize, instanceKey, comicLanguage, layer }) => {
  const { x: pX, y: pY, width: pW, height: pH } = panelLayout;

  const panelTransform = useMemo(() => {
    return calculatePanelTransform(panel, pW, pH);
  }, [panel, pW, pH]);

  const dialogueData = useMemo(() => {
    if (layer === 'content' || !panelTransform || panel.dialogues.length === 0) return [];

    const transformMatch = /translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/.exec(panelTransform);
    if (!transformMatch) return [];
    
    const [, txStr, tyStr, sStr] = transformMatch;
    const tx = parseFloat(txStr); const ty = parseFloat(tyStr); const s = parseFloat(sStr);
    const isRTL = comicLanguage === 'ja' || comicLanguage === 'zh';

    const getAbsoluteHeadBounds = (char: CharacterInstance) => {
        const headBoundsLocal = getCharacterHeadBounds(char.params);
        const groupTopLeft = { x: (headBoundsLocal.x - VIEWBOX_WIDTH_BASE/2) * char.scale + char.x, y: (headBoundsLocal.y - VIEWBOX_HEIGHT/2) * char.scale + char.y };
        const groupBottomRight = { x: (headBoundsLocal.x + headBoundsLocal.width - VIEWBOX_WIDTH_BASE/2) * char.scale + char.x, y: (headBoundsLocal.y + headBoundsLocal.height - VIEWBOX_HEIGHT/2) * char.scale + char.y };
        const panelTopLeft = { x: groupTopLeft.x * s + tx, y: groupTopLeft.y * s + ty };
        const panelBottomRight = { x: groupBottomRight.x * s + tx, y: groupBottomRight.y * s + ty };
        return { x: pX + panelTopLeft.x, y: pY + panelTopLeft.y, width: panelBottomRight.x - panelTopLeft.x, height: panelBottomRight.y - panelTopLeft.y };
    };
    
    const allHeadBoundsInPanel = panel.characters.map(getAbsoluteHeadBounds);

    // --- 1. INITIALIZATION ---
    let maxBubbleWidth = Math.min(250, pW * (panel.dialogues.length > 2 ? 0.6 : 0.8));

    let bubbles = panel.dialogues.map((dialogue, index) => {
      const FONT_SCALE_FACTOR = 25;
      const DIALOGUE_COUNT_FACTOR = 0.95;
      const numDialogues = panel.dialogues.length;

      const textLength = dialogue.text.length;
      const sizeRange = maxComicFontSize - minComicFontSize;
      const lengthBasedSize = maxComicFontSize - (textLength / FONT_SCALE_FACTOR) * sizeRange;
      const clampedLengthSize = Math.max(minComicFontSize, lengthBasedSize);
      const sizeAfterPenalty = clampedLengthSize * Math.pow(DIALOGUE_COUNT_FACTOR, Math.max(0, numDialogues - 1));
      const dynamicFontSize = Math.max(minComicFontSize, Math.min(maxComicFontSize, sizeAfterPenalty));
      
      const textLines = wrapText(dialogue.text.toUpperCase(), dynamicFontSize, maxBubbleWidth - 20);
      const textHeight = textLines.length * dynamicFontSize * 1.2;
      const width = Math.min(maxBubbleWidth, Math.max(80, textLines.reduce((max, line) => Math.max(max, estimateTextWidth(line, dynamicFontSize)), 0) + 20));
      const height = textHeight + 20;
      
      const speakerIndexInPanel = panel.characterIdsInPanel.indexOf(dialogue.characterId);
      const speakerHeadBounds = speakerIndexInPanel !== -1 ? allHeadBoundsInPanel[speakerIndexInPanel] : { x: pX + pW / 2, y: pY + pH / 2, width: 0, height: 0 };
      
      const headCenterX = speakerHeadBounds.x + speakerHeadBounds.width / 2;
      const headTopY = speakerHeadBounds.y;

      // Posicionar el bocadillo arriba de la cabeza del personaje
      const yPos = headTopY - height - 30; // 30px de margen
      
      const totalCharsInPanel = panel.characters.length;
      let horizontalOffset = 0;
      if (totalCharsInPanel > 1 && speakerIndexInPanel !== -1) {
          const offsetAmount = pW * 0.05;
          horizontalOffset = (speakerIndexInPanel / (totalCharsInPanel - 1) - 0.5) * 2 * offsetAmount;
      }
      const xPos = headCenterX + horizontalOffset;

      return {
        id: index, x: xPos - width / 2, y: yPos, width, height, dynamicFontSize, textLines, textHeight, speakerHeadBounds,
      };
    });

    // --- 2. SIMULATION ---
    const iterations = 100;
    const padding = { bubble: 12, head: 10, panel: 5 };
    const paddedHeads = allHeadBoundsInPanel.map(h => ({ x: h.x - padding.head, y: h.y - padding.head, width: h.width + padding.head * 2, height: h.height + padding.head * 2 }));

    for (let i = 0; i < iterations; i++) {
        let moved = false;
        
        // Bubble vs Bubble collision
        for (let j = 0; j < bubbles.length; j++) {
            for (let k = j + 1; k < bubbles.length; k++) {
                const b1 = bubbles[j];
                const b2 = bubbles[k];
                const rect1 = { ...b1, width: b1.width + padding.bubble, height: b1.height + padding.bubble, x: b1.x - padding.bubble/2, y: b1.y - padding.bubble/2 };
                const rect2 = { ...b2, width: b2.width + padding.bubble, height: b2.height + padding.bubble, x: b2.x - padding.bubble/2, y: b2.y - padding.bubble/2 };

                if (checkCollision(rect1, rect2)) {
                    moved = true;
                    const dx = (rect1.x + rect1.width / 2) - (rect2.x + rect2.width / 2);
                    const dy = (rect1.y + rect1.height / 2) - (rect2.y + rect2.height / 2);
                    const overlapX = (rect1.width / 2 + rect2.width / 2) - Math.abs(dx);
                    const overlapY = (rect1.height / 2 + rect2.height / 2) - Math.abs(dy);
                    if (overlapX > 0 && overlapY > 0) {
                        if (overlapX < overlapY) {
                            const push = overlapX / 2 * (dx > 0 ? 1 : -1);
                            b1.x += push; b2.x -= push;
                        } else {
                            const push = overlapY / 2 * (dy > 0 ? 1 : -1);
                            b1.y += push; b2.y -= push;
                        }
                    }
                }
            }
        }

        // Bubble vs Heads & Panel Boundary
        for (let j = 0; j < bubbles.length; j++) {
            const b = bubbles[j];
            // vs Heads
            paddedHeads.forEach(head => {
                if(checkCollision(b, head)) {
                   moved = true;
                   const dx = (b.x + b.width / 2) - (head.x + head.width / 2);
                   const dy = (b.y + b.height / 2) - (head.y + head.height / 2);
                   const overlapX = (b.width / 2 + head.width / 2) - Math.abs(dx);
                   const overlapY = (b.height / 2 + head.height / 2) - Math.abs(dy);
                   if (overlapX > 0 && overlapY > 0) {
                       if (overlapY < overlapX && dy < 0) {
                            b.y -= overlapY;
                       } else {
                           if (overlapX < overlapY) {
                               b.x += overlapX * (dx > 0 ? 1 : -1);
                           } else {
                               b.y += overlapY * (dy > 0 ? 1 : -1);
                           }
                       }
                   }
                }
            });

            // vs Boundary
            if (b.x < pX + padding.panel) { b.x = pX + padding.panel; moved = true; }
            if (b.x + b.width > pX + pW - padding.panel) { b.x = pX + pW - padding.panel - b.width; moved = true; }
            if (b.y < pY + padding.panel) { b.y = pY + padding.panel; moved = true; }
            if (b.y + b.height > pY + pH - padding.panel) { b.y = pY + pH - padding.panel - b.height; moved = true; }
        }

        if (!moved) break;
    }

    // --- 3. FINALIZATION ---
    return bubbles.map(bubble => {
      const tailTip = {
          x: bubble.speakerHeadBounds.x + bubble.speakerHeadBounds.width / 2,
          y: bubble.speakerHeadBounds.y + bubble.speakerHeadBounds.height * 0.85, // Más cerca de la parte inferior (boca)
      };
      const bubblePath = createBubblePathWithTail(bubble, tailTip);

      return {
        key: `dialogue-${instanceKey}-${bubble.id}`,
        bubblePath,
        bubbleX: bubble.x + bubble.width / 2,
        bubbleY: bubble.y + bubble.height / 2,
        textHeight: bubble.textHeight,
        dynamicFontSize: bubble.dynamicFontSize,
        textLines: bubble.textLines,
      };
    });

  }, [panel, panelTransform, minComicFontSize, maxComicFontSize, pX, pY, pW, pH, instanceKey, layer, comicLanguage]);


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
  const bgImageProps = useMemo(() => {
    if (!panel.backgroundImageB64) return null;

    const bleed = 1.18; // 18% enlargement
    const newWidth = pW * bleed;
    const newHeight = pH * bleed;
    const newX = -(pW * (bleed - 1)) / 2; // Center the oversized image
    const newY = -(pH * (bleed - 1)) / 2;

    return {
      href: `data:image/png;base64,${panel.backgroundImageB64}`,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      preserveAspectRatio: "none" as const,
    };
  }, [panel.backgroundImageB64, pW, pH]);

  return (
    <g transform={`translate(${pX}, ${pY})`}>
        <defs><clipPath id={`clip-${panel.id}`}><rect x="0" y="0" width={pW} height={pH} /></clipPath></defs>
        <rect x="0" y="0" width={pW} height={pH} fill={panel.backgroundColor} />
        <g clipPath={`url(#clip-${panel.id})`}>
            {bgImageProps && <image {...bgImageProps} />}
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