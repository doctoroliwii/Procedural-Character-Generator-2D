import React, { useState, useCallback, useEffect } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions, CharacterInstance, ComicPanelData } from './types';
import { INITIAL_PARAMS, PARAM_CONFIGS } from './constants';
import CharacterCanvas from './components/CharacterCanvas';
import ControlPanel, { PanelKey, PanelState } from './components/ControlPanel';
import MenuBar from './components/MenuBar';
import { generateComicScript, getTrendingTopic } from './services/geminiService';

const generateRandomParams = (): CharacterParams => {
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
    newParams.rArmBend = -armBend; // Symmetrical bend
    const legAngle = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    newParams.lLegAngle = legAngle;
    newParams.rLegAngle = legAngle;
    const legBend = Math.floor(Math.random() * (20 - (-40) + 1)) - 40;
    newParams.lLegBend = legBend;
    newParams.rLegBend = -legBend; // Symmetrical bend

    // Randomize mouth bend
    newParams.mouthBend = Math.floor(Math.random() * 151) - 75; // Random bend from -75 to 75

    newParams.upperEyelidCoverage = Math.floor(Math.pow(Math.random(), 2.5) * 80);
    newParams.lowerEyelidCoverage = Math.floor(Math.pow(Math.random(), 3) * 40);

    // Randomize eyelashes
    newParams.eyelashes = Math.random() < 0.5;
    if (newParams.eyelashes) {
        newParams.eyelashCount = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashCount.max - PARAM_CONFIGS.eyelashCount.min + 1)) + PARAM_CONFIGS.eyelashCount.min;
        newParams.eyelashLength = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashLength.max - PARAM_CONFIGS.eyelashLength.min + 1)) + PARAM_CONFIGS.eyelashLength.min;
        newParams.eyelashAngle = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashAngle.max - PARAM_CONFIGS.eyelashAngle.min + 1)) + PARAM_CONFIGS.eyelashAngle.min;
    }

    // Randomize hair
    newParams.hair = Math.random() < 0.8; // 80% chance of hair
    if (newParams.hair) {
      newParams.backHairWidthRatio = Math.floor(Math.random() * (PARAM_CONFIGS.backHairWidthRatio.max - PARAM_CONFIGS.backHairWidthRatio.min + 1)) + PARAM_CONFIGS.backHairWidthRatio.min;
      newParams.backHairHeightRatio = Math.floor(Math.random() * (PARAM_CONFIGS.backHairHeightRatio.max - PARAM_CONFIGS.backHairHeightRatio.min + 1)) + PARAM_CONFIGS.backHairHeightRatio.min;
      
      const randHeadHeight = newParams.headHeight as number;
      const randEyeSizeRatio = newParams.eyeSizeRatio as number;
      const margin = 5;
      const headTopY = 120 - randHeadHeight / 2;
      const eyeTopY = 120 - (randHeadHeight * (randEyeSizeRatio / 100));
      const maxFringeHeightPx = eyeTopY - headTopY - margin;
      const maxFringeHeightRatio = Math.max(0, (maxFringeHeightPx / randHeadHeight) * 100);
      
      const minFringeHeightRatio = PARAM_CONFIGS.fringeHeightRatio.min;
      newParams.fringeHeightRatio = Math.floor(Math.random() * (maxFringeHeightRatio - minFringeHeightRatio + 1)) + minFringeHeightRatio;
    }

    const headShapes: CharacterParams['headShape'][] = ['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle'];
    newParams.headShape = headShapes[Math.floor(Math.random() * headShapes.length)];
    const torsoShapes: CharacterParams['torsoShape'][] = ['rectangle', 'square', 'circle', 'triangle', 'inverted-triangle'];
    newParams.torsoShape = torsoShapes[Math.floor(Math.random() * torsoShapes.length)];
    const pelvisShapes: CharacterParams['pelvisShape'][] = ['rectangle', 'horizontal-oval'];
    newParams.pelvisShape = pelvisShapes[Math.floor(Math.random() * pelvisShapes.length)];

    newParams.eyeStyle = Math.random() < 0.8 ? 'blocky' : 'realistic';

    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    newParams.bodyColor = randomColor();
    newParams.irisColor = randomColor();
    newParams.hairColor = randomColor();
    
    newParams.outlineColor = '#000000';
    newParams.pupilColor = '#000000';

    return { 
      ...INITIAL_PARAMS, // Base defaults
      ...newParams 
    };
};

const calculateLocalFootY = (params: CharacterParams): number => {
    const {
        headWidth, headHeight, headShape,
        neckHeight,
        torsoHeight, torsoWidth, torsoShape, torsoCornerRadius,
        pelvisHeight, pelvisWidthRatio,
        lLegWidth, rLegWidth,
        legLength, lLegAngle, rLegAngle
    } = params;

    const headY = 120;
    const headBottomY = headY + (headShape === 'circle' || headShape === 'square' ? headWidth / 2 : headHeight / 2);
    const neckY = headBottomY - 15;
    const torsoTopY = neckY + neckHeight;

    const getTorsoWidthAtY = (y: number) => {
        const yRel = y - torsoTopY; if (yRel < 0 || yRel > torsoHeight) return 0; switch (torsoShape) { case 'circle': { const rx = torsoWidth / 2; const ry = torsoHeight / 2; if (ry === 0) return torsoWidth; const centerY = torsoTopY + ry; const yDistFromCenter = Math.abs(y - centerY); if (yDistFromCenter > ry) return 0; return 2 * rx * Math.sqrt(1 - (yDistFromCenter / ry) ** 2); } case 'triangle': return torsoHeight > 0 ? torsoWidth * (yRel / torsoHeight) : 0; case 'inverted-triangle': return torsoHeight > 0 ? torsoWidth * (1 - yRel / torsoHeight) : torsoWidth; case 'rectangle': case 'square': { const r = torsoShape === 'square' ? Math.min(torsoCornerRadius, torsoWidth / 2) : Math.min(torsoCornerRadius, torsoWidth / 2, torsoHeight / 2); const w_half = torsoWidth / 2; const h = torsoHeight; let boundaryX_half; if (yRel < r) { const y_arc_relative_to_center = yRel - r; const x_offset_from_corner_center = Math.sqrt(Math.max(0, r*r - y_arc_relative_to_center*y_arc_relative_to_center)); boundaryX_half = (w_half - r) + x_offset_from_corner_center; } else if (yRel > h - r) { const y_arc_relative_to_center = yRel - (h - r); const x_offset_from_corner_center = Math.sqrt(Math.max(0, r*r - y_arc_relative_to_center*y_arc_relative_to_center)); boundaryX_half = (w_half - r) + x_offset_from_corner_center; } else { boundaryX_half = w_half; } return boundaryX_half * 2; } default: return torsoWidth; } 
    };
    
    const calculatedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);

    const searchStartY = torsoTopY + torsoHeight;
    const searchEndY = torsoTopY + torsoHeight * 0.4;
    let junctionY = searchStartY;
    for (let y = searchStartY; y >= searchEndY; y -= 2) {
        if (getTorsoWidthAtY(y) >= calculatedPelvisWidth) {
            junctionY = y;
            break;
        }
    }

    const pelvisOverlap = 5;
    const pelvisY = junctionY - pelvisOverlap;
    const legY = pelvisY + pelvisHeight * 0.8;
    const finalLegY = legY;
    
    const lAnkleY = finalLegY + legLength * Math.cos(lLegAngle * Math.PI / 180);
    const rAnkleY = finalLegY + legLength * Math.cos(rLegAngle * Math.PI / 180);
    
    const lFootGroundY = lAnkleY + lLegWidth / 2;
    const rFootGroundY = rAnkleY + rLegWidth / 2;
    
    return Math.max(lFootGroundY, rFootGroundY);
};

const adjustParamsForLegs = (params: CharacterParams): CharacterParams => {
    const newParams = { ...params };
    const { lLegWidth, rLegWidth, pelvisWidthRatio } = newParams;
    let { torsoWidth } = newParams;

    const lLegRadius = lLegWidth / 2;
    const rLegRadius = rLegWidth / 2;
    const lSocketRadius = lLegRadius * 1.6;
    const rSocketRadius = rLegRadius * 1.6;
    const minSpaceBetweenHips = lSocketRadius + rSocketRadius + 4;
    const minPelvisWidthForLegs = minSpaceBetweenHips / 0.7;
    let calculatedPelvisWidth = torsoWidth * (pelvisWidthRatio / 100);

    if (calculatedPelvisWidth < minPelvisWidthForLegs) {
        calculatedPelvisWidth = minPelvisWidthForLegs;
    }
    
    if (calculatedPelvisWidth > torsoWidth) {
        torsoWidth = calculatedPelvisWidth;
    }
    
    newParams.torsoWidth = torsoWidth;
    newParams.pelvisWidthRatio = (calculatedPelvisWidth / torsoWidth) * 100;
    
    return newParams;
};


function App() {
  const [characters, setCharacters] = useState<CharacterInstance[]>([
    { params: INITIAL_PARAMS, x: 0, y: 0, scale: 1, zIndex: 1 }
  ]);
  const [limbSymmetry, setLimbSymmetry] = useState(true);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({
    color1: '#ffffff',
    color2: '#d4e2e1',
    animation: true,
  });
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [maxGroupSize, setMaxGroupSize] = useState(8);
  const [groupXSpread, setGroupXSpread] = useState(500);
  
  // Comic state
  const [comicPanels, setComicPanels] = useState<ComicPanelData[] | null>(null);
  const [comicTheme, setComicTheme] = useState('Un robot descubre la amistad');
  const [numComicPanels, setNumComicPanels] = useState(4);
  const [isGeneratingComic, setIsGeneratingComic] = useState(false);
  const [isRandomizingComic, setIsRandomizingComic] = useState(false);
  const [comicAspectRatio, setComicAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [minComicFontSize, setMinComicFontSize] = useState(12);
  const [maxComicFontSize, setMaxComicFontSize] = useState(18);
  const [comicLanguage, setComicLanguage] = useState('es');


  const [panels, setPanels] = useState<Record<PanelKey, PanelState>>({
    Head: { isOpen: true, position: { x: 20, y: 20 }, zIndex: 10 },
    Hair: { isOpen: false, position: { x: 70, y: 70 }, zIndex: 1 },
    Eyes: { isOpen: false, position: { x: 30, y: 30 }, zIndex: 1 },
    Eyebrows: { isOpen: false, position: { x: 40, y: 40 }, zIndex: 1 },
    Mouth: { isOpen: false, position: { x: 50, y: 50 }, zIndex: 1 },
    Body: { isOpen: false, position: { x: 60, y: 60 }, zIndex: 1 },
    Arms: { isOpen: true, position: { x: 20, y: 240 }, zIndex: 9 },
    Legs: { isOpen: false, position: { x: 20, y: 460 }, zIndex: 8 },
    Color: { isOpen: true, position: { x: 280, y: 20 }, zIndex: 7 },
    GroupSettings: { isOpen: false, position: { x: 100, y: 100 }, zIndex: 1 },
    Comic: { isOpen: false, position: { x: 280, y: 240 }, zIndex: 1 },
    Options: { isOpen: false, position: { x: 80, y: 80 }, zIndex: 1 },
    About: { isOpen: false, position: { x: 90, y: 90 }, zIndex: 1 },
  });

  const setPanelVisibility = useCallback((mode: 'single' | 'group' | 'comic') => {
    setPanels(prev => {
      const newPanelsState: Record<PanelKey, PanelState> = JSON.parse(JSON.stringify(prev));
      let maxZ = Math.max(...Object.values(newPanelsState).map(p => p.zIndex));

      // Close all panels
      (Object.keys(newPanelsState) as PanelKey[]).forEach(key => {
        newPanelsState[key].isOpen = false;
      });

      if (mode === 'comic') {
        newPanelsState.Comic.isOpen = true;
        newPanelsState.Comic.zIndex = ++maxZ;
      } else if (mode === 'group') {
        newPanelsState.GroupSettings.isOpen = true;
        newPanelsState.GroupSettings.zIndex = ++maxZ;
      } else { // mode === 'single'
        const defaultOpenSingle: PanelKey[] = ['Head', 'Arms', 'Color'];
        defaultOpenSingle.forEach(key => {
          newPanelsState[key].isOpen = true;
          newPanelsState[key].zIndex = ++maxZ;
        });
      }
      return newPanelsState;
    });
  }, []);

  const handleRandomize = useCallback(() => {
    setComicPanels(null); // Exit comic mode
    let params = generateRandomParams();
    params = adjustParamsForLegs(params);
    setCharacters([{ params, x: 0, y: 0, scale: 1, zIndex: 1 }]);
    setBackgroundOptions(prev => ({ ...prev, animation: true }));
    setPanelVisibility('single');
  }, [setPanelVisibility]);

  const handleRandomizeGroup = useCallback(() => {
    setComicPanels(null); // Exit comic mode
    const VIEWBOX_HEIGHT = 600; 
    const numCharacters = Math.floor(Math.random() * (maxGroupSize - minGroupSize + 1)) + minGroupSize;
    
    const generatedCharacters: Omit<CharacterInstance, 'zIndex'>[] = [];
    for (let i = 0; i < numCharacters; i++) {
        let params = generateRandomParams();
        params = adjustParamsForLegs(params);
        params.eyeTracking = false;
        generatedCharacters.push({
            params,
            x: (Math.random() - 0.5) * groupXSpread,
            y: (Math.random() - 0.5) * 200,
            scale: 0.6 + Math.random() * 0.4,
        });
    }

    setBackgroundOptions(prev => ({ ...prev, animation: false }));

    const charactersWithFootY = generatedCharacters.map(char => {
        const localFootY = calculateLocalFootY(char.params);
        const finalFootY = (char.y + VIEWBOX_HEIGHT / 2) + (localFootY - VIEWBOX_HEIGHT / 2) * char.scale;
        return { ...char, finalFootY };
    });

    charactersWithFootY.sort((a, b) => a.finalFootY - b.finalFootY);

    const newCharacters: CharacterInstance[] = charactersWithFootY.map((char, index) => ({
        params: char.params,
        x: char.x,
        y: char.y,
        scale: char.scale,
        zIndex: index + 1,
    }));

    setCharacters(newCharacters);
    setPanelVisibility('group');
  }, [minGroupSize, maxGroupSize, groupXSpread, setPanelVisibility]);

  const generatePanelLayouts = (count: number) => {
    const layouts = [];
    const gutter = 2; // percentage
    if (count === 0) return [];
    
    let cols, rows;
    switch (count) {
        case 1: cols = 1; rows = 1; break;
        case 2: cols = 1; rows = 2; break;
        case 3: cols = 1; rows = 3; break;
        case 4: cols = 2; rows = 2; break;
        case 5: cols = 2; rows = 3; break; // 2x2 grid with one spanning the bottom
        case 6: cols = 2; rows = 3; break;
        default: cols = 2; rows = Math.ceil(count / 2); break;
    }

    const panelWidth = (100 - (cols + 1) * gutter) / cols;
    const panelHeight = (100 - (rows + 1) * gutter) / rows;

    for (let i = 0; i < count; i++) {
        if (count === 5 && i === 4) { // Special case for 5 panels
            layouts.push({
                x: gutter,
                y: gutter + 2 * (panelHeight + gutter),
                width: 100 - 2 * gutter,
                height: panelHeight,
            });
        } else {
            const row = Math.floor(i / cols);
            const col = i % cols;
            layouts.push({
                x: gutter + col * (panelWidth + gutter),
                y: gutter + row * (panelHeight + gutter),
                width: panelWidth,
                height: panelHeight,
            });
        }
    }
    return layouts;
  };

  const handleGenerateComic = useCallback(async (options?: { theme?: string; panels?: number; language?: string; }) => {
    setIsGeneratingComic(true);
    setCharacters([]);
    setComicPanels([]);
    
    const themeToUse = options?.theme ?? comicTheme;
    const panelsToUse = options?.panels ?? numComicPanels;
    const languageToUse = options?.language ?? comicLanguage;

    try {
      const script = await generateComicScript(themeToUse, panelsToUse, languageToUse);
      if (!script || !script.panels || script.panels.length === 0) {
        throw new Error("Received an empty or invalid script from the API.");
      }

      const uniqueCharacterParams: CharacterParams[] = [];
      for (let i = 0; i < script.totalUniqueCharacters; i++) {
        let params = generateRandomParams();
        params = adjustParamsForLegs(params);
        params.eyeTracking = false;
        uniqueCharacterParams.push(params);
      }
      
      const newPanels: ComicPanelData[] = [];
      const panelLayouts = generatePanelLayouts(script.panels.length);

      for (let i = 0; i < script.panels.length; i++) {
        const panelScript = script.panels[i];
        const panelCharacters: CharacterInstance[] = [];

        panelScript.charactersInPanel.forEach((charId, indexInPanel) => {
          if (charId < uniqueCharacterParams.length) {
            const params = uniqueCharacterParams[charId];
            panelCharacters.push({
              params,
              x: (panelScript.charactersInPanel.length > 1) ? (indexInPanel * 150 - (panelScript.charactersInPanel.length - 1) * 75) : 0,
              y: (Math.random() * 50),
              scale: 0.8,
              zIndex: indexInPanel + 1
            });
          }
        });
        
        newPanels.push({
          id: `panel-${i}-${Date.now()}`,
          layout: panelLayouts[i],
          characters: panelCharacters,
          characterIdsInPanel: panelScript.charactersInPanel,
          dialogues: panelScript.dialogues || [],
          backgroundColor: `hsl(${Math.random() * 360}, 50%, 95%)`,
          description: panelScript.description,
          shotType: panelScript.shotType || 'medium-shot',
        });
      }
      setComicPanels(newPanels);

    } catch (error) {
      console.error("Failed to generate comic", error);
      alert("There was an error generating the comic. Please check the console for details.");
    } finally {
      setIsGeneratingComic(false);
    }
  }, [comicTheme, numComicPanels, comicLanguage]);
  
  const handleRandomizeComic = useCallback(async () => {
    setIsRandomizingComic(true);
    let themeToUse = '';
    try {
      themeToUse = await getTrendingTopic();
    } catch (error) {
      console.warn("Failed to get trending topic, using a fallback.", error);
      const randomThemes = [
        'Un robot descubre la amistad',
        'Un gato detective resuelve el misterio del ovillo de lana perdido',
        'Dos ardillas discutiendo por la última bellota',
        'Una cafetera sensible se enamora de una tostadora',
        'Piratas intentando descubrir cómo usar un microondas'
      ];
      themeToUse = randomThemes[Math.floor(Math.random() * randomThemes.length)];
    }
    
    const randomPanels = Math.floor(Math.random() * 4) + 2; // 2 to 5 panels
    
    setComicTheme(themeToUse);
    setNumComicPanels(randomPanels);
    
    setPanelVisibility('comic');
    await handleGenerateComic({ theme: themeToUse, panels: randomPanels });
    setIsRandomizingComic(false);
  }, [handleGenerateComic, setPanelVisibility]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'r') {
            const target = e.target as HTMLElement;
            if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') return;
            e.preventDefault();
            if (comicPanels !== null) {
              handleGenerateComic();
            } else {
              handleRandomize();
            }
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            setShowBoundingBoxes(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRandomize, comicPanels, handleGenerateComic]);

  const bringToFront = (key: PanelKey) => {
    setPanels(prev => {
      const maxZ = Math.max(...Object.values(prev).map((p: PanelState) => p.zIndex));
      if (prev[key].zIndex === maxZ) return prev;
      return { ...prev, [key]: { ...prev[key], zIndex: maxZ + 1 } };
    });
  };

  const togglePanel = useCallback((key: PanelKey) => {
    setPanels(prev => ({ ...prev, [key]: { ...prev[key], isOpen: !prev[key].isOpen } }));
    if (!panels[key].isOpen) bringToFront(key);
  }, [panels]);

  const handleMenuItemClick = (key: PanelKey) => {
    if (key === 'Comic') {
        if (comicPanels === null) {
          setComicPanels([]);
        }
        setCharacters([]);
        setPanelVisibility('comic');
    }
    togglePanel(key);
  };

  const updatePanelPosition = useCallback((key: PanelKey, position: { x: number; y: number }) => {
    setPanels(prev => ({ ...prev, [key]: { ...prev[key], position } }));
  }, []);

  const handleLimbSymmetryChange = (enabled: boolean) => setLimbSymmetry(enabled);
  const handleMinGroupSizeChange = (value: number) => { if (value > maxGroupSize) { setMinGroupSize(value); setMaxGroupSize(value); } else { setMinGroupSize(value); } };
  const handleMaxGroupSizeChange = (value: number) => { if (value < minGroupSize) { setMaxGroupSize(value); setMinGroupSize(value); } else { setMaxGroupSize(value); } };
  const handleMinComicFontSizeChange = (value: number) => { if (value > maxComicFontSize) { setMinComicFontSize(value); setMaxComicFontSize(value); } else { setMinComicFontSize(value); } };
  const handleMaxComicFontSizeChange = (value: number) => { if (value < minComicFontSize) { setMaxComicFontSize(value); setMinComicFontSize(value); } else { setMaxComicFontSize(value); } };

  const handleParamChange = (param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => {
    if (characters.length !== 1) return;
    const symmetryMap: Partial<Record<CharacterParamKey, CharacterParamKey>> = { 'lArmAngle': 'rArmAngle', 'rArmAngle': 'lArmAngle', 'lArmBend': 'rArmBend', 'rArmBend': 'lArmBend', 'lLegAngle': 'rLegAngle', 'rLegAngle': 'lLegAngle', 'lLegBend': 'rLegBend', 'rLegBend': 'lLegBend', 'lArmWidth': 'rArmWidth', 'rArmWidth': 'lArmWidth', 'lHandSize': 'rHandSize', 'rHandSize': 'lHandSize', 'lLegWidth': 'rLegWidth', 'rLegWidth': 'lLegWidth', 'lFootSize': 'rFootSize', 'rFootSize': 'lFootSize' };
    const bendParams: CharacterParamKey[] = ['lArmBend', 'rArmBend', 'lLegBend', 'rLegBend'];

    setCharacters(prev => {
      let newParams = { ...prev[0].params, [param]: value };
      if (limbSymmetry && symmetryMap[param as CharacterParamKey]) {
        const symmetricParam = symmetryMap[param as CharacterParamKey]!;
        if (bendParams.includes(param as CharacterParamKey)) { (newParams as any)[symmetricParam] = -(value as number); } else { (newParams as any)[symmetricParam] = value; }
      }
      newParams = adjustParamsForLegs(newParams);
      const widthRatio = newParams.mouthWidthRatio;
      const maxBend = 380 - 4 * widthRatio;
      newParams.mouthBend = Math.max(-maxBend, Math.min(maxBend, newParams.mouthBend));
      if (param === 'eyeSizeRatio' || param === 'headHeight') {
          const { headHeight, eyeSizeRatio, fringeHeightRatio } = newParams;
          const margin = 5;
          const headTopY = 120 - headHeight / 2;
          const eyeTopY = 120 - (headHeight * (eyeSizeRatio / 100));
          const maxFringeHeightPx = eyeTopY - headTopY - margin;
          const maxFringeHeightRatio = Math.max(0, (maxFringeHeightPx / headHeight) * 100);
          if (fringeHeightRatio > maxFringeHeightRatio) { newParams.fringeHeightRatio = maxFringeHeightRatio; }
      }
      return [{ ...prev[0], params: newParams }];
    });
  };
  
  const currentParams = characters.length === 1 ? characters[0].params : INITIAL_PARAMS;
  const maxMouthBend = 380 - 4 * currentParams.mouthWidthRatio;
  const maxFringeHeightRatio = (() => {
    const { headHeight, eyeSizeRatio } = currentParams;
    const margin = 5;
    const headTopY = 120 - headHeight / 2;
    const eyeTopY = 120 - (headHeight * (eyeSizeRatio / 100));
    const maxFringeHeightPx = eyeTopY - headTopY - margin;
    const maxRatio = Math.max(0, (maxFringeHeightPx / headHeight) * 100);
    return isNaN(maxRatio) ? 100 : maxRatio;
  })();

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-200 font-sans overflow-hidden">
      <MenuBar
        onRandomize={handleRandomize}
        onRandomizeGroup={handleRandomizeGroup}
        onRandomizeComic={handleRandomizeComic}
        isRandomizingComic={isRandomizingComic}
        onMenuItemClick={handleMenuItemClick}
      />
      <main className="flex-grow relative">
        <CharacterCanvas
          characters={characters}
          comicPanels={comicPanels}
          backgroundOptions={backgroundOptions}
          showBoundingBoxes={showBoundingBoxes}
          comicAspectRatio={comicAspectRatio}
          minComicFontSize={minComicFontSize}
          maxComicFontSize={maxComicFontSize}
        />
        <ControlPanel
          panels={panels}
          params={currentParams}
          onParamChange={handleParamChange}
          backgroundOptions={backgroundOptions}
          onBackgroundOptionsChange={setBackgroundOptions}
          limbSymmetry={limbSymmetry}
          onLimbSymmetryChange={handleLimbSymmetryChange}
          maxMouthBend={maxMouthBend}
          maxFringeHeightRatio={maxFringeHeightRatio}
          showBoundingBoxes={showBoundingBoxes}
          onShowBoundingBoxesChange={setShowBoundingBoxes}
          minGroupSize={minGroupSize}
          onMinGroupSizeChange={handleMinGroupSizeChange}
          maxGroupSize={maxGroupSize}
          onMaxGroupSizeChange={handleMaxGroupSizeChange}
          groupXSpread={groupXSpread}
          onGroupXSpreadChange={setGroupXSpread}
          comicTheme={comicTheme}
          onComicThemeChange={setComicTheme}
          numComicPanels={numComicPanels}
          onNumComicPanelsChange={setNumComicPanels}
          comicAspectRatio={comicAspectRatio}
          onComicAspectRatioChange={setComicAspectRatio}
          minComicFontSize={minComicFontSize}
          onMinComicFontSizeChange={handleMinComicFontSizeChange}
          maxComicFontSize={maxComicFontSize}
          onMaxComicFontSizeChange={handleMaxComicFontSizeChange}
          comicLanguage={comicLanguage}
          onComicLanguageChange={setComicLanguage}
          onGenerateComic={() => handleGenerateComic()}
          isGeneratingComic={isGeneratingComic || isRandomizingComic}
          togglePanel={togglePanel}
          updatePanelPosition={updatePanelPosition}
          bringToFront={bringToFront}
        />
      </main>
    </div>
  );
}
export default App;