import React, { useMemo } from 'react';
import type { CharacterInstance, ComicPanelData, ProceduralBackground } from '../types';
import Character from './Character';
import ProceduralBackgroundRenderer from './ProceduralBackgroundRenderer';

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
    
    const r = 15; // Border radius
    const tailBaseWidth = 20;
    const MAX_TAIL_LENGTH = 60;
    
    const bubbleCenterX = x + width / 2;
    const bubbleCenterY = y + height / 2;
    
    const dx = initialTailTip.x - bubbleCenterX;
    const dy = initialTailTip.y - bubbleCenterY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    let tailTip = { ...initialTailTip };
    if (dist > MAX_TAIL_LENGTH) {
        tailTip.x = bubbleCenterX + (dx / dist) * MAX_TAIL_LENGTH;
        tailTip.y = bubbleCenterY + (dy / dist) * MAX_TAIL_LENGTH;
    }
    
    const tailBaseCenter = getClosestPointOnRect(tailTip, bubbleRect);

    const angle = Math.atan2(tailTip.y - tailBaseCenter.y, tailTip.x - tailBaseCenter.x);
    
    const p1 = { x: tailBaseCenter.x - Math.sin(angle) * (tailBaseWidth / 2), y: tailBaseCenter.y + Math.cos(angle) * (tailBaseWidth / 2) };
    const p2 = { x: tailBaseCenter.x + Math.sin(angle) * (tailBaseWidth / 2), y: tailBaseCenter.y - Math.cos(angle) * (tailBaseWidth / 2) };

    const controlPoint = {
        x: (tailBaseCenter.x + tailTip.x) / 2,
        y: (tailBaseCenter.y + tailTip.y) / 2,
    };

    let path = `M ${x+r} ${y} H ${x+width-r} A ${r} ${r} 0 0 1 ${x+width} ${y+r} V ${y+height-r} A ${r} ${r} 0 0 1 ${x+width-r} ${y+height} H ${x+r} A ${r} ${r} 0 0 1 ${x} ${y+height-r} V ${y+r} A ${r} ${r} 0 0 1 ${x+r} ${y}`;
    
    const tailPath = `M ${p1.x} ${p1.y} Q ${controlPoint.x} ${controlPoint.y} ${tailTip.x} ${tailTip.y} Q ${controlPoint.x} ${controlPoint.y} ${p2.x} ${p2.y}`;
    
    return path + " " + tailPath;
};


interface ComicPanelProps {
    panel: ComicPanelData;
    panelLayout: { x: number; y: number; width: number; height: number; };
    minComicFontSize: number;
    maxComicFontSize: number;
    instanceKey: string;
    comicLanguage: string;
    comicFontFamily: string;
    comicPanelCornerRadius: number;
    layer: 'content' | 'dialogue';
}

const ComicPanel: React.FC<ComicPanelProps> = ({ panel, panelLayout, minComicFontSize, maxComicFontSize, instanceKey, comicLanguage, comicFontFamily, comicPanelCornerRadius, layer }) => {
    const { x, y, width, height } = panelLayout;
    
    const clipId = `clip-${instanceKey}`;
    const outlineColor = '#4A2E2C';
    const outlineWidth = 6;
    const cornerRadius = comicPanelCornerRadius;
    const VIEWBOX_WIDTH_BASE = 400;
    const VIEWBOX_HEIGHT = 700;

    const dialogueElements = useMemo(() => {
        if (!panel.dialogues || panel.dialogues.length === 0) {
            return [];
        }

        const fontSize = Math.max(minComicFontSize, Math.min(maxComicFontSize, width / 20));
        const padding = fontSize * 0.8;
        const lineSpacing = fontSize * 1.4;

        let bubbles: any[] = [];
        let occupiedRects: {x: number, y: number, width: number, height: number}[] = [];

        panel.dialogues.forEach((dialogue, index) => {
            const charIndex = panel.characterIdsInPanel.indexOf(dialogue.characterId);
            const character = charIndex !== -1 ? panel.characters[charIndex] : null;
            if (!character) return;
            
            const words = dialogue.text.split(' ');
            let lines: string[] = [];
            let currentLine = words[0] || '';
            for (let i = 1; i < words.length; i++) {
                if ((currentLine + ' ' + words[i]).length * fontSize * 0.6 > width * 0.7) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine += ' ' + words[i];
                }
            }
            lines.push(currentLine);

            const bubbleWidth = Math.min(width * 0.8, Math.max(...lines.map(l => l.length)) * fontSize * 0.6 + padding * 2);
            const bubbleHeight = lines.length * lineSpacing + padding * 2;
            
            const { params } = character;
            const viewFactor = Math.sin((params.viewAngle * Math.PI) / 180);
            const bodyXOffset = viewFactor * params.torsoWidth * 0.1;
            const headYInCharacterCoords = 120; // from Character.tsx
            const characterCenterYInCharacterCoords = VIEWBOX_HEIGHT / 2;
            
            // Correctly transform character-space head position to panel-space
            const speakerHeadX = (character.x + bodyXOffset) * (width / VIEWBOX_WIDTH_BASE) + (width / 2);
            const speakerHeadY = (character.y + headYInCharacterCoords - characterCenterYInCharacterCoords) * (height / VIEWBOX_HEIGHT) + (height / 2);
            
            const scaledHeadHeight = character.params.headHeight * character.scale * (height / VIEWBOX_HEIGHT);
            const headTopY = speakerHeadY - scaledHeadHeight / 2;

            let bubbleX = 0, bubbleY = 0;
            const attempts = 15;
            let foundPosition = false;

            for (let i = 0; i < attempts; i++) {
                const angle = (Math.random() * 0.8 + 0.1) * Math.PI; // Top hemisphere, avoiding horizontal
                const radius = Math.random() * (width / 5) + 20;
                
                bubbleX = speakerHeadX - Math.cos(angle) * radius - bubbleWidth / 2;
                bubbleY = speakerHeadY - Math.sin(angle) * radius - bubbleHeight; // Move up from head center

                // Clamp to panel bounds
                bubbleX = Math.max(padding, Math.min(width - bubbleWidth - padding, bubbleX));
                bubbleY = Math.max(padding, Math.min(height - bubbleHeight - padding, bubbleY));

                const currentRect = { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight };

                // Check for collision with other bubbles AND if it's above the character's head
                if ((currentRect.y + currentRect.height < headTopY - 10) && !occupiedRects.some(rect => checkCollision(rect, currentRect))) {
                    foundPosition = true;
                    break;
                }
            }
            
            if (!foundPosition) { // Fallback if no non-colliding spot is found
                // Place directly above head, then try to shift if needed
                bubbleY = Math.max(padding, headTopY - bubbleHeight - 15);
                bubbleX = speakerHeadX - bubbleWidth / 2;
                bubbleX = Math.max(padding, Math.min(width - bubbleWidth - padding, bubbleX));

                let currentRect = { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight };
                let tries = 0;
                while(occupiedRects.some(rect => checkCollision(rect, currentRect)) && tries < 5){
                     bubbleX += (tries % 2 === 0 ? 1 : -1) * (bubbleWidth / 4);
                     bubbleX = Math.max(padding, Math.min(width - bubbleWidth - padding, bubbleX));
                     currentRect.x = bubbleX;
                     tries++;
                }
            }

            const currentRect = { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight };
            occupiedRects.push(currentRect);
            
            const tailTip = { x: speakerHeadX, y: speakerHeadY };
            const pathData = createBubblePathWithTail(currentRect, tailTip);

            bubbles.push(
                <g key={`dialogue-${index}`}>
                    <path d={pathData} fill="white" stroke={outlineColor} strokeWidth={outlineWidth / 2} />
                    <text x={bubbleX + padding} y={bubbleY + padding + fontSize} fontFamily={comicFontFamily} fontSize={fontSize} fill={outlineColor} fontWeight="bold" style={{ whiteSpace: 'pre', userSelect: 'none' }}>
                        {lines.map((line, lineIndex) => (
                            <tspan key={lineIndex} x={bubbleX + padding} dy={lineIndex > 0 ? lineSpacing : 0}>{line}</tspan>
                        ))}
                    </text>
                </g>
            );
        });
        return bubbles;
    }, [panel.dialogues, panel.characters, panel.characterIdsInPanel, width, height, minComicFontSize, maxComicFontSize, comicFontFamily]);


    if (layer === 'content') {
        return (
            <g key={`content-${instanceKey}`} transform={`translate(${x}, ${y})`}>
                <clipPath id={clipId}>
                    <rect x="0" y="0" width={width} height={height} rx={cornerRadius} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                    <rect x="0" y="0" width={width} height={height} fill={panel.backgroundColor} />

                    {panel.proceduralBackground ? (
                        <g transform={`scale(${width / panel.proceduralBackground.canvasWidth}, ${height / panel.proceduralBackground.canvasHeight})`}>
                            <ProceduralBackgroundRenderer
                                background={panel.proceduralBackground}
                                viewBox={{ x: 0, y: 0, width: panel.proceduralBackground.canvasWidth, height: panel.proceduralBackground.canvasHeight }}
                                onViewBoxChange={() => {}} // Not interactive in panel
                            />
                        </g>
                    ) : (
                        <>
                            {panel.backgroundImageB64 && (
                                <image href={`data:image/png;base64,${panel.backgroundImageB64}`} x="0" y="0" width={width} height={height} preserveAspectRatio="xMidYMid slice" />
                            )}
                        </>
                    )}

                    {!panel.isNanoBananaOnly && (
                        <g transform={`translate(${width / 2}, ${height / 2}) scale(${width / VIEWBOX_WIDTH_BASE}, ${height / VIEWBOX_HEIGHT})`}>
                            {panel.characters.map((charInstance, charIndex) =>
                                <Character
                                    key={`${panel.id}-${charIndex}`}
                                    charInstance={charInstance}
                                    instanceKey={`${panel.id}-${charIndex}`}
                                    localCursorPos={{ x: 0, y: 0 }}
                                />
                            )}
                        </g>
                    )}
                </g>
                <rect x="0" y="0" width={width} height={height} fill="none" stroke={outlineColor} strokeWidth={outlineWidth} rx={cornerRadius} />
            </g>
        );
    }
    
    if (layer === 'dialogue') {
         return (
            <g key={`dialogue-${instanceKey}`} transform={`translate(${x}, ${y})`}>
                {dialogueElements}
            </g>
        );
    }
    
    return null;
};

export default ComicPanel;
