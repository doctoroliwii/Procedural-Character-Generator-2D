import React from 'react';
import type { ProceduralBackground } from '../types';

interface ProceduralBackgroundRendererProps {
  background: ProceduralBackground;
}

const ProceduralBackgroundRenderer: React.FC<ProceduralBackgroundRendererProps> = ({ background }) => {
  const { type, sky, ground, horizon, room, canvasWidth, canvasHeight } = background;

  if (type === 'exterior') {
    const horizonY = canvasHeight * (horizon.position / 100);
    const gradientId = `sky-gradient-${background.id}`;
    
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: sky.topColor }} />
            <stop offset="100%" style={{ stopColor: sky.bottomColor }} />
          </linearGradient>
        </defs>
        
        {/* Sky */}
        <rect x="0" y="0" width={canvasWidth} height={horizonY} fill={`url(#${gradientId})`} />
        
        {/* Ground */}
        <rect x="0" y={horizonY} width={canvasWidth} height={canvasHeight - horizonY} fill={ground.color} />
      </svg>
    );
  }

  if (type === 'interior') {
     return (
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
        {/* Simple back wall for now */}
        <rect x="0" y="0" width={canvasWidth} height={canvasHeight} fill={room.wallColor} />
      </svg>
    );
  }

  return null;
};

export default ProceduralBackgroundRenderer;
