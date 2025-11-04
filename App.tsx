
import React, { useState, useCallback, useEffect } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions } from './types';
import { INITIAL_PARAMS, PARAM_CONFIGS } from './constants';
import CharacterCanvas from './components/CharacterCanvas';
import ControlPanel from './components/ControlPanel';

function App() {
  const [params, setParams] = useState<CharacterParams>(INITIAL_PARAMS);
  const [limbSymmetry, setLimbSymmetry] = useState(true);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({
    color1: '#ffffff',
    color2: '#d4e2e1',
    animation: true,
  });

  const handleLimbSymmetryChange = (enabled: boolean) => {
    setLimbSymmetry(enabled);
  };

  const handleParamChange = (param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => {
    const symmetryMap: Partial<Record<CharacterParamKey, CharacterParamKey>> = {
      'lArmAngle': 'rArmAngle', 'rArmAngle': 'lArmAngle',
      'lArmBend': 'rArmBend', 'rArmBend': 'lArmBend',
      'lLegAngle': 'rLegAngle', 'rLegAngle': 'lLegAngle',
      'lLegBend': 'rLegBend', 'rLegBend': 'lLegBend',
      'lArmWidth': 'rArmWidth', 'rArmWidth': 'lArmWidth',
      // FIX: Removed duplicate key definitions that caused an error.
      'lHandSize': 'rHandSize', 'rHandSize': 'lHandSize',
      'lLegWidth': 'rLegWidth', 'rLegWidth': 'lLegWidth',
      'lFootSize': 'rFootSize', 'rFootSize': 'lFootSize',
    };

    setParams(prev => {
      let newParams = { ...prev, [param]: value };

      if (limbSymmetry && symmetryMap[param as CharacterParamKey]) {
        const symmetricParam = symmetryMap[param as CharacterParamKey]!;
        (newParams as any)[symmetricParam] = value;
      }
      
      // Dynamic adjustment for pelvis and torso width
      if (param === 'pelvisWidthRatio' || param === 'torsoWidth') {
        const pelvisWidthValue = param === 'pelvisWidthRatio' ? (value as number) : newParams.pelvisWidthRatio;
        const torsoWidthValue = param === 'torsoWidth' ? (value as number) : newParams.torsoWidth;
        const newPelvisWidth = (pelvisWidthValue / 100) * torsoWidthValue;
        if (newPelvisWidth > torsoWidthValue) {
          newParams.torsoWidth = newPelvisWidth;
        }
      }
      return newParams;
    });
  };
  
  const handleBackgroundOptionsChange = useCallback((options: Partial<BackgroundOptions>) => {
    setBackgroundOptions(prev => ({ ...prev, ...options }));
  }, []);

  const handleRandomize = useCallback(() => {
    const newParams: Partial<CharacterParams> = {};
    const limbParamKeys: (keyof typeof PARAM_CONFIGS)[] = [
      'lArmAngle', 'rArmAngle', 'lArmBend', 'rArmBend', 
      'lLegAngle', 'rLegAngle', 'lLegBend', 'rLegBend',
      'lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize',
      'lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize',
    ];
    const keysToRandomize = (Object.keys(PARAM_CONFIGS) as Array<keyof typeof PARAM_CONFIGS>).filter(k => !limbParamKeys.includes(k));
    
    // Randomize non-limb sliders
    for (const key of keysToRandomize) {
      const config = PARAM_CONFIGS[key as keyof typeof PARAM_CONFIGS];
      const randomValue = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
      (newParams as any)[key] = randomValue;
    }
    
    // Randomize new limb properties symmetrically
    const armWidth = Math.floor(Math.random() * (PARAM_CONFIGS.lArmWidth.max - PARAM_CONFIGS.lArmWidth.min + 1)) + PARAM_CONFIGS.lArmWidth.min;
    newParams.lArmWidth = armWidth;
    newParams.rArmWidth = armWidth;
    const handSize = Math.floor(Math.random() * (PARAM_CONFIGS.lHandSize.max - PARAM_CONFIGS.lHandSize.min + 1)) + PARAM_CONFIGS.lHandSize.min;
    newParams.lHandSize = handSize;
    newParams.rHandSize = handSize;
    const legWidth = Math.floor(Math.random() * (PARAM_CONFIGS.lLegWidth.max - PARAM_CONFIGS.lLegWidth.min + 1)) + PARAM_CONFIGS.lLegWidth.min;
    newParams.lLegWidth = legWidth;
    newParams.rLegWidth = legWidth;
    const footSize = Math.floor(Math.random() * (PARAM_CONFIGS.lFootSize.max - PARAM_CONFIGS.lFootSize.min + 1)) + PARAM_CONFIGS.lFootSize.min;
    newParams.lFootSize = footSize;
    newParams.rFootSize = footSize;

    const armAngle = Math.floor(Math.random() * (70 - 10 + 1)) + 10;
    newParams.lArmAngle = armAngle;
    newParams.rArmAngle = armAngle;
    const armBend = Math.floor(Math.random() * (60 - (-20) + 1)) - 20;
    newParams.lArmBend = armBend;
    newParams.rArmBend = armBend;
    const legAngle = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    newParams.lLegAngle = legAngle;
    newParams.rLegAngle = legAngle;
    const legBend = Math.floor(Math.random() * (20 - (-40) + 1)) - 40;
    newParams.lLegBend = legBend;
    newParams.rLegBend = legBend;


    // Randomize booleans
    (newParams as any).mouthIsFlipped = Math.random() < 0.5;

    // Randomize Eyelids with a bias for open eyes
    // FIX: Corrected typo from upperEylidCoverage to upperEyelidCoverage
    newParams.upperEyelidCoverage = Math.floor(Math.pow(Math.random(), 2.5) * 80);
    // FIX: Corrected typo from lowerEylidCoverage to lowerEyelidCoverage
    newParams.lowerEyelidCoverage = Math.floor(Math.pow(Math.random(), 3) * 40);

    // Randomize shapes
    const headShapes: CharacterParams['headShape'][] = ['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle'];
    newParams.headShape = headShapes[Math.floor(Math.random() * headShapes.length)];
    const torsoShapes: CharacterParams['torsoShape'][] = ['rectangle', 'square', 'circle', 'triangle', 'inverted-triangle'];
    newParams.torsoShape = torsoShapes[Math.floor(Math.random() * torsoShapes.length)];
    const pelvisShapes: CharacterParams['pelvisShape'][] = ['rectangle', 'inverted-triangle', 'horizontal-oval'];
    newParams.pelvisShape = pelvisShapes[Math.floor(Math.random() * pelvisShapes.length)];

    // Randomize eye style with a strong bias for 'blocky'
    newParams.eyeStyle = Math.random() < 0.8 ? 'blocky' : 'realistic';

    // Randomize colors
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    newParams.bodyColor = randomColor();
    newParams.irisColor = randomColor();
    
    // Set outline and pupil to black for better aesthetics
    newParams.outlineColor = '#000000';
    newParams.pupilColor = '#000000';

    // --- Collision Detection and Resolution ---
    const checkAndResolveCollision = (paramsToUpdate: Partial<CharacterParams>): { updatedParams: Partial<CharacterParams>, hasCollision: boolean } => {
        const workingParams = { ...params, ...paramsToUpdate };
        const updated = { ...paramsToUpdate };
        let collisionDetected = false;

        const {
            headHeight, headWidth, eyeSizeRatio, mouthYOffsetRatio, mouthWidthRatio,
            mouthIsFlipped, eyeOutlines
        } = workingParams;

        // Constants from CharacterCanvas for accurate collision detection
        const headY = 120;
        const outlineWidth = 4;
        const mouthStrokeWidth = 4;

        // --- Geometries ---
        const calculatedMouthYOffset = (headHeight / 2) * (mouthYOffsetRatio / 100);
        const mouthYPos = headY + calculatedMouthYOffset;
        const calculatedMouthWidth = headWidth * (mouthWidthRatio / 100);
        const mouthCurvature = calculatedMouthWidth * 0.25 * (mouthIsFlipped ? -1 : 1);

        // --- Collision 1: Mouth below head ---
        const headBottom = headY + headHeight / 2;
        // The lowest point of the mouth quad curve, accounting for stroke width
        const mouthBottomPoint = (mouthIsFlipped ? mouthYPos : mouthYPos + mouthCurvature) + mouthStrokeWidth / 2;
        
        if (mouthBottomPoint > headBottom) {
            collisionDetected = true;
            if (workingParams.mouthYOffsetRatio > PARAM_CONFIGS.mouthYOffsetRatio.min) {
                // Move mouth up
                updated.mouthYOffsetRatio = Math.max(PARAM_CONFIGS.mouthYOffsetRatio.min, workingParams.mouthYOffsetRatio - 2);
            }
        }

        // --- Collision 2: Mouth inside eyes ---
        const calculatedEyeSize = headHeight * (eyeSizeRatio / 100);
        const eyeRy = calculatedEyeSize;
        const eyeBottom = headY + eyeRy + (eyeOutlines ? outlineWidth / 4 : 0);
        // The highest point of the mouth quad curve, accounting for stroke width
        const mouthTopPoint = (mouthIsFlipped ? mouthYPos + mouthCurvature : mouthYPos) - mouthStrokeWidth / 2;

        if (mouthTopPoint < eyeBottom) {
            collisionDetected = true;
            // Prioritize moving mouth down if there isn't also a head-bottom collision
            if (!updated.hasOwnProperty('mouthYOffsetRatio') && workingParams.mouthYOffsetRatio < PARAM_CONFIGS.mouthYOffsetRatio.max) {
                updated.mouthYOffsetRatio = Math.min(PARAM_CONFIGS.mouthYOffsetRatio.max, workingParams.mouthYOffsetRatio + 2);
            }
            // Also shrink eyes and mouth as a secondary measure
            if (workingParams.eyeSizeRatio > PARAM_CONFIGS.eyeSizeRatio.min) {
                updated.eyeSizeRatio = Math.max(PARAM_CONFIGS.eyeSizeRatio.min, workingParams.eyeSizeRatio - 1);
            }
            if (workingParams.mouthWidthRatio > PARAM_CONFIGS.mouthWidthRatio.min) {
                updated.mouthWidthRatio = Math.max(PARAM_CONFIGS.mouthWidthRatio.min, workingParams.mouthWidthRatio - 2);
            }
        }
        
        return { updatedParams: updated, hasCollision: collisionDetected };
    };

    let resolvedParams = newParams;
    let hasCollision = true;
    for (let i = 0; i < 10 && hasCollision; i++) { // Iterate up to 10 times to resolve
        const result = checkAndResolveCollision(resolvedParams);
        resolvedParams = result.updatedParams;
        hasCollision = result.hasCollision;
    }

    setParams(prev => ({ 
      ...prev, 
      ...resolvedParams 
    }));
  }, [params]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && (event.target as HTMLElement).tagName !== 'INPUT') {
        event.preventDefault();
        handleRandomize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRandomize]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col lg:flex-row">
      <header className="p-4 border-b border-gray-300 lg:hidden">
        <h1 className="text-2xl font-bold text-sky-600 text-center">Procedural Character Generator</h1>
      </header>
      
      <aside className="w-full lg:w-[420px] bg-gray-200/80 backdrop-blur-sm shadow-lg lg:h-screen lg:overflow-hidden">
        <ControlPanel
          params={params}
          onParamChange={handleParamChange}
          onRandomize={handleRandomize}
          backgroundOptions={backgroundOptions}
          onBackgroundOptionsChange={handleBackgroundOptionsChange}
          limbSymmetry={limbSymmetry}
          onLimbSymmetryChange={handleLimbSymmetryChange}
        />
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <CharacterCanvas params={params} backgroundOptions={backgroundOptions} />
      </main>
    </div>
  );
}

export default App;
