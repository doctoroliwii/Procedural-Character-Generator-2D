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

const HORIZON_LINE_MIN = 0.6; // 60% de altura
const HORIZON_LINE_MAX = 0.8; // 80% de altura
const THIRDS = [0.33, 0.66]; // Regla de tercios
const GOLDEN_RATIO = [0.382, 0.618]; // Proporción áurea
const SCALE_CLOSEUP = [1.3, 1.8]; // Primer plano
const SCALE_MEDIUM = [0.8, 1.2]; // Plano medio
const SCALE_WIDE = [0.5, 0.7]; // Plano general

const ComicPanel: React.FC<ComicPanelProps> = ({ panel, panelLayout, minComicFontSize, maxComicFontSize, instanceKey, comicLanguage, comicFontFamily, comicPanelCornerRadius, layer }) => {
    const { x, y, width, height } = panelLayout;
    
    const clipId = `clip-${instanceKey}`;
    const outlineColor = '#4A2E2C';
    const outlineWidth = 6;
    const cornerRadius = comicPanelCornerRadius;
    const VIEWBOX_WIDTH_BASE = 400;
    const VIEWBOX_HEIGHT = 700;

    const composedCharacters = useMemo(() => {
        if (panel.isNanoBananaOnly || !panel.characters || panel.characters.length === 0) {
            return panel.characters;
        }

        const getRandomNumberInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const horizonLineY = height * getRandomNumberInRange(HORIZON_LINE_MIN, HORIZON_LINE_MAX);
        const useGoldenRatio = panel.characters.length <= 2;
        const xPositions = (useGoldenRatio ? GOLDEN_RATIO : THIRDS).sort(() => 0.5 - Math.random());
        
        const characterXPositions: { [key: number]: number } = {};
        const uniqueCharIds = [...new Set(panel.characterIdsInPanel)];
        uniqueCharIds.forEach((id, index) => {
            characterXPositions[id] = xPositions[index % xPositions.length];
        });

        return panel.characters.map((charInstance, index) => {
            const charId = panel.characterIdsInPanel[index];

            const shotRoll = Math.random();
            let scale: number;
            if (shotRoll < 0.3) {
                scale = getRandomNumberInRange(SCALE_CLOSEUP[0], SCALE_CLOSEUP[1]);
            } else if (shotRoll < 0.8) {
                scale = getRandomNumberInRange(SCALE_MEDIUM[0], SCALE_MEDIUM[1]);
            } else {
                scale = getRandomNumberInRange(SCALE_WIDE[0], SCALE_WIDE[1]);
            }
            
            const xPosPercent = characterXPositions[charId] ?? 0.5;
            const newX = (xPosPercent - 0.5) * (VIEWBOX_WIDTH_BASE * 0.9);

            const depthFactor = (scale - SCALE_WIDE[0]) / (SCALE_CLOSEUP[1] - SCALE_WIDE[0]);
            const yOffsetForDepth = depthFactor * (height * 0.05); // Bigger characters (higher scale/depthFactor) are lower (higher yOffset)
            
            const feetY = horizonLineY + yOffsetForDepth;

            const feetOffsetFromCenterInCharacterCoords = 250; // Approximate distance from character origin (0,0) to feet
            const scaledFeetOffset = feetOffsetFromCenterInCharacterCoords * scale * (height / VIEWBOX_HEIGHT);
            
            // The character's y prop is an offset from the center of the scaled viewbox.
            // We want the character's feet to be at `feetY`.
            const newY = (feetY - scaledFeetOffset) - (height / 2);

            return {
                ...charInstance,
                x: newX,
                y: newY,
                scale: scale
            };
        });
    }, [panel.characters, panel.characterIdsInPanel, panel.isNanoBananaOnly, width, height]);


    const dialogueElements = useMemo(() => {
        if (!panel.dialogues || panel.dialogues.length === 0 || !composedCharacters) {
            return [];
        }

        const fontSize = Math.max(minComicFontSize, Math.min(maxComicFontSize, width / 20));
        const padding = fontSize * 0.8;
        const lineSpacing = fontSize * 1.4;

        const ALLOW_OVERFLOW_TOP = true;
        const ALLOW_OVERFLOW_SIDES = 30;

        const characterFaces = (composedCharacters || []).map((char, index) => {
            const { params } = char;
            const viewFactor = Math.sin((params.viewAngle * Math.PI) / 180);
            const bodyXOffset = viewFactor * params.torsoWidth * 0.1;
            const headYInCharacterCoords = 120;
            const characterCenterYInCharacterCoords = VIEWBOX_HEIGHT / 2;
            
            const headCenterX = (char.x + bodyXOffset) * (width / VIEWBOX_WIDTH_BASE) + (width / 2);
            const headCenterY = (char.y + headYInCharacterCoords - characterCenterYInCharacterCoords) * (height / VIEWBOX_HEIGHT) + (height / 2);
            const faceWidth = params.headWidth * char.scale * (width / VIEWBOX_WIDTH_BASE) * 1.2;
            const faceHeight = params.headHeight * char.scale * (height / VIEWBOX_HEIGHT) * 1.2;
            
            return {
                x: headCenterX - faceWidth / 2,
                y: headCenterY - faceHeight / 2,
                width: faceWidth,
                height: faceHeight,
                charId: panel.characterIdsInPanel[index]
            };
        });
        
        let occupiedRects: {x: number, y: number, width: number, height: number}[] = [...characterFaces];
        let bubbles: any[] = [];

        const sortedDialogues = [...panel.dialogues].sort((a, b) => {
            const charAIndex = panel.characterIdsInPanel.indexOf(a.characterId);
            const charBIndex = panel.characterIdsInPanel.indexOf(b.characterId);
            if (charAIndex === -1 || charBIndex === -1) return 0;
            const charAX = (composedCharacters || [])[charAIndex]?.x || 0;
            const charBX = (composedCharacters || [])[charBIndex]?.x || 0;
            return charAX - charBX;
        });

        sortedDialogues.forEach((dialogue, index) => {
            const charIndex = panel.characterIdsInPanel.indexOf(dialogue.characterId);
            if (charIndex === -1) return;

            const speakerFace = characterFaces.find(f => f.charId === dialogue.characterId);
            if (!speakerFace) return;
            
            const words = dialogue.text.toUpperCase().split(' ');
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

            const bubbleWidth = Math.min(width * 0.9, Math.max(...lines.map(l => l.length)) * fontSize * 0.6 + padding * 2);
            const bubbleHeight = lines.length * lineSpacing + padding * 2;
            
            let bubbleX = 0, bubbleY = 0;
            let foundPosition = false;

            for (let attempt = 0; attempt < 20; attempt++) {
                const radius = 20 + attempt * 6;
                const placement = Math.random();
                let angle: number;

                if (placement < 0.7) { // Top
                    angle = Math.PI/2 + (Math.random() - 0.5) * Math.PI/2.5;
                } else if (placement < 0.9) { // Sides
                    angle = Math.random() > 0.5 ? (Math.PI / 6) * Math.random() : (5 * Math.PI / 6) + (Math.PI / 6) * Math.random();
                } else { // Bottom
                    angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI/4;
                }
                
                bubbleX = (speakerFace.x + speakerFace.width / 2) + Math.cos(angle) * radius - bubbleWidth / 2;
                bubbleY = (speakerFace.y + speakerFace.height / 2) - Math.sin(angle) * radius - (angle > 0 ? bubbleHeight : 0);

                const currentRect = { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight };

                const isOutOfBounds = 
                    (currentRect.x < -ALLOW_OVERFLOW_SIDES) ||
                    (currentRect.x + currentRect.width > width + ALLOW_OVERFLOW_SIDES) ||
                    (currentRect.y < 0 && !ALLOW_OVERFLOW_TOP) ||
                    (currentRect.y + currentRect.height > height);

                if (isOutOfBounds) continue;

                const isColliding = occupiedRects.some(rect => checkCollision(rect, currentRect));
                if (!isColliding) {
                    foundPosition = true;
                    break;
                }
            }
            
            if (!foundPosition) {
                bubbleY = Math.max((ALLOW_OVERFLOW_TOP ? -bubbleHeight/2 : padding), speakerFace.y - bubbleHeight - 15);
                bubbleX = speakerFace.x + speakerFace.width/2 - bubbleWidth/2;
            }

            const finalRect = { x: bubbleX, y: bubbleY, width: bubbleWidth, height: bubbleHeight };
            occupiedRects.push(finalRect);
            
            const tailTip = { x: speakerFace.x + speakerFace.width / 2, y: speakerFace.y + speakerFace.height / 2 };
            const pathData = createBubblePathWithTail(finalRect, tailTip);

            bubbles.push(
                <g key={`dialogue-${index}`}>
                    <path d={pathData} fill="white" stroke={outlineColor} strokeWidth={outlineWidth / 2} />
                    <text x={finalRect.x + padding} y={finalRect.y + padding + fontSize} fontFamily={comicFontFamily} fontSize={fontSize} fill={outlineColor} fontWeight="bold" style={{ whiteSpace: 'pre', userSelect: 'none' }}>
                        {lines.map((line, lineIndex) => (
                            <tspan key={lineIndex} x={finalRect.x + padding} dy={lineIndex > 0 ? lineSpacing : 0}>{line}</tspan>
                        ))}
                    </text>
                </g>
            );
        });
        return bubbles;
    }, [panel.dialogues, panel.characterIdsInPanel, composedCharacters, width, height, minComicFontSize, maxComicFontSize, comicFontFamily]);


    if (layer === 'content') {
        return (
            <g key={`content-${instanceKey}`} transform={`translate(${x}, ${y})`}>
                <clipPath id={clipId}>
                    <rect x="0" y="0" width={width} height={height} rx={cornerRadius} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                    <rect x="0" y="0" width={width} height={height} fill={panel.backgroundColor} />

                    {panel.proceduralBackground ? (
                         <svg
                            x="0"
                            y="0"
                            width={width}
                            height={height}
                            viewBox={`0 0 ${panel.proceduralBackground.canvasWidth} ${panel.proceduralBackground.canvasHeight}`}
                            preserveAspectRatio="xMidYMid slice"
                        >
                            <ProceduralBackgroundRenderer
                                background={panel.proceduralBackground}
                                viewBox={{ x: 0, y: 0, width: panel.proceduralBackground.canvasWidth, height: panel.proceduralBackground.canvasHeight }}
                                onViewBoxChange={() => {}} // Not interactive in panel
                            />
                        </svg>
                    ) : (
                        <>
                            {panel.backgroundImageB64 && (
                                <image href={`data:image/png;base64,${panel.backgroundImageB64}`} x="0" y="0" width={width} height={height} preserveAspectRatio="xMidYMid slice" />
                            )}
                        </>
                    )}

                    {!panel.isNanoBananaOnly && (
                        <g transform={`translate(${width / 2}, ${height / 2}) scale(${width / VIEWBOX_WIDTH_BASE}, ${height / VIEWBOX_HEIGHT})`}>
                            {(composedCharacters || panel.characters).map((charInstance, charIndex) =>
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