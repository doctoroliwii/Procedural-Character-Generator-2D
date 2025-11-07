import React, { useState, useCallback, useEffect } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions, CharacterInstance, ComicPanelData, Lore, CharacterProfile, Story } from './types';
import { INITIAL_PARAMS, PARAM_CONFIGS } from './constants';
import CharacterCanvas from './components/CharacterCanvas';
import ControlPanel, { PanelKey, PanelState } from './components/ControlPanel';
import MenuBar from './components/MenuBar';
import { generateComicScript, getTrendingTopic, generateLore, generateStory, generateComicScriptFromStory, ComicScript } from './services/geminiService';
import { CloseIcon, WarningIcon } from './components/icons';

const generateRandomParams = (): CharacterParams => {
    const newParams: Partial<CharacterParams> = {};
    const limbParamKeys: (keyof typeof PARAM_CONFIGS)[] = [ 'lArmAngle', 'rArmAngle', 'lArmBend', 'rArmBend', 'lLegAngle', 'rLegAngle', 'lLegBend', 'rLegBend', 'lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize', 'lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize', ];
    const keysToRandomize = (Object.keys(PARAM_CONFIGS) as Array<keyof typeof PARAM_CONFIGS>).filter(k => !limbParamKeys.includes(k));
    for (const key of keysToRandomize) { const config = PARAM_CONFIGS[key as keyof typeof PARAM_CONFIGS]; const randomValue = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min; (newParams as any)[key] = randomValue; }
    const armWidth = Math.floor(Math.random() * (PARAM_CONFIGS.lArmWidth.max - PARAM_CONFIGS.lArmWidth.min + 1)) + PARAM_CONFIGS.lArmWidth.min; newParams.lArmWidth = armWidth; newParams.rArmWidth = armWidth;
    const handSize = Math.floor(Math.random() * (PARAM_CONFIGS.lHandSize.max - PARAM_CONFIGS.lHandSize.min + 1)) + PARAM_CONFIGS.lHandSize.min; newParams.lHandSize = handSize; newParams.rHandSize = handSize;
    const legWidth = Math.floor(Math.random() * (PARAM_CONFIGS.lLegWidth.max - PARAM_CONFIGS.lLegWidth.min + 1)) + PARAM_CONFIGS.lLegWidth.min; newParams.lLegWidth = legWidth; newParams.rLegWidth = legWidth;
    const footSize = Math.floor(Math.random() * (PARAM_CONFIGS.lFootSize.max - PARAM_CONFIGS.lFootSize.min + 1)) + PARAM_CONFIGS.lFootSize.min; newParams.lFootSize = footSize; newParams.rFootSize = footSize;
    const armAngle = Math.floor(Math.random() * (70 - 10 + 1)) + 10; newParams.lArmAngle = armAngle; newParams.rArmAngle = armAngle;
    const armBend = Math.floor(Math.random() * (60 - (-20) + 1)) - 20; newParams.lArmBend = armBend; newParams.rArmBend = -armBend;
    const legAngle = Math.floor(Math.random() * (20 - 5 + 1)) + 5; newParams.lLegAngle = legAngle; newParams.rLegAngle = legAngle;
    const legBend = Math.floor(Math.random() * (20 - (-40) + 1)) - 40; newParams.lLegBend = legBend; newParams.rLegBend = -legBend;
    newParams.mouthBend = Math.floor(Math.random() * 151) - 75;
    newParams.upperEyelidCoverage = Math.floor(Math.pow(Math.random(), 2.5) * 80); newParams.lowerEyelidCoverage = Math.floor(Math.pow(Math.random(), 3) * 40);
    newParams.eyelashes = Math.random() < 0.5; if (newParams.eyelashes) { newParams.eyelashCount = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashCount.max - PARAM_CONFIGS.eyelashCount.min + 1)) + PARAM_CONFIGS.eyelashCount.min; newParams.eyelashLength = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashLength.max - PARAM_CONFIGS.eyelashLength.min + 1)) + PARAM_CONFIGS.eyelashLength.min; newParams.eyelashAngle = Math.floor(Math.random() * (PARAM_CONFIGS.eyelashAngle.max - PARAM_CONFIGS.eyelashAngle.min + 1)) + PARAM_CONFIGS.eyelashAngle.min; }
    newParams.hair = Math.random() < 0.8; if (newParams.hair) { newParams.backHairWidthRatio = Math.floor(Math.random() * (PARAM_CONFIGS.backHairWidthRatio.max - PARAM_CONFIGS.backHairWidthRatio.min + 1)) + PARAM_CONFIGS.backHairWidthRatio.min; newParams.backHairHeightRatio = Math.floor(Math.random() * (PARAM_CONFIGS.backHairHeightRatio.max - PARAM_CONFIGS.backHairHeightRatio.min + 1)) + PARAM_CONFIGS.backHairHeightRatio.min; const randHeadHeight = newParams.headHeight as number; const randEyeSizeRatio = newParams.eyeSizeRatio as number; const margin = 5; const headTopY = 120 - randHeadHeight / 2; const eyeTopY = 120 - (randHeadHeight * (randEyeSizeRatio / 100)); const maxFringeHeightPx = eyeTopY - headTopY - margin; const maxFringeHeightRatio = Math.max(0, (maxFringeHeightPx / randHeadHeight) * 100); const minFringeHeightRatio = PARAM_CONFIGS.fringeHeightRatio.min; newParams.fringeHeightRatio = Math.floor(Math.random() * (maxFringeHeightRatio - minFringeHeightRatio + 1)) + minFringeHeightRatio; }
    const headShapes: CharacterParams['headShape'][] = ['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle']; newParams.headShape = headShapes[Math.floor(Math.random() * headShapes.length)];
    const torsoShapes: CharacterParams['torsoShape'][] = ['rectangle', 'square', 'circle', 'triangle', 'inverted-triangle']; newParams.torsoShape = torsoShapes[Math.floor(Math.random() * torsoShapes.length)];
    const pelvisShapes: CharacterParams['pelvisShape'][] = ['rectangle', 'horizontal-oval']; newParams.pelvisShape = pelvisShapes[Math.floor(Math.random() * pelvisShapes.length)];
    newParams.eyeStyle = Math.random() < 0.8 ? 'blocky' : 'realistic';
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    newParams.bodyColor = randomColor(); newParams.irisColor = randomColor(); newParams.hairColor = randomColor();
    newParams.outlineColor = '#000000'; newParams.pupilColor = '#000000';
    return { ...INITIAL_PARAMS, ...newParams };
};

const adjustParamsForLegs = (params: CharacterParams): CharacterParams => {
  return params;
};

const QUOTA_ERROR_MESSAGE = 'You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">here</a>.';

function App() {
  const [characters, setCharacters] = useState<CharacterInstance[]>([ { params: INITIAL_PARAMS, x: 0, y: 0, scale: 1, zIndex: 1 } ]);
  const [limbSymmetry, setLimbSymmetry] = useState(true);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({ color1: '#ffffff', color2: '#d4e2e1', animation: true, });
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [maxGroupSize, setMaxGroupSize] = useState(8);
  const [groupXSpread, setGroupXSpread] = useState(500);
  
  // Simple Comic state
  const [comicTheme, setComicTheme] = useState('Un robot descubre la amistad');
  const [numComicPanels, setNumComicPanels] = useState(4);
  
  // Shared Comic state
  const [comicPanels, setComicPanels] = useState<ComicPanelData[] | null>(null);
  const [isGeneratingComic, setIsGeneratingComic] = useState(false);
  const [isRandomizingComic, setIsRandomizingComic] = useState(false);
  const [comicAspectRatio, setComicAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [minComicFontSize, setMinComicFontSize] = useState(12);
  const [maxComicFontSize, setMaxComicFontSize] = useState(18);
  const [comicLanguage, setComicLanguage] = useState('es');
  
  // Custom Comic State
  const [comicMode, setComicMode] = useState<'simple' | 'custom'>('simple');
  const [lore, setLore] = useState<Lore | null>(null);
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>([]);
  const [story, setStory] = useState<Story | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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
    LoreEditor: { isOpen: false, position: { x: 340, y: 240 }, zIndex: 1 },
    CharacterEditor: { isOpen: false, position: { x: 400, y: 20 }, zIndex: 1 },
    Options: { isOpen: false, position: { x: 80, y: 80 }, zIndex: 1 },
    About: { isOpen: false, position: { x: 90, y: 90 }, zIndex: 1 },
  });

  const setPanelVisibility = useCallback((mode: 'single' | 'group' | 'comic') => {
    setPanels(prev => {
      const newPanelsState: Record<PanelKey, PanelState> = JSON.parse(JSON.stringify(prev));
      let maxZ = Math.max(...Object.values(newPanelsState).map(p => p.zIndex));
      (Object.keys(newPanelsState) as PanelKey[]).forEach(key => { newPanelsState[key].isOpen = false; });
      if (mode === 'comic') { newPanelsState.Comic.isOpen = true; newPanelsState.Comic.zIndex = ++maxZ; } 
      else if (mode === 'group') { newPanelsState.GroupSettings.isOpen = true; newPanelsState.GroupSettings.zIndex = ++maxZ; } 
      else { const defaultOpenSingle: PanelKey[] = ['Head', 'Arms', 'Color']; defaultOpenSingle.forEach(key => { newPanelsState[key].isOpen = true; newPanelsState[key].zIndex = ++maxZ; }); }
      return newPanelsState;
    });
  }, []);

  const handleRandomize = useCallback(() => { setComicPanels(null); let params = generateRandomParams(); params = adjustParamsForLegs(params); setCharacters([{ params, x: 0, y: 0, scale: 1, zIndex: 1 }]); setBackgroundOptions(prev => ({ ...prev, animation: true })); setPanelVisibility('single'); }, [setPanelVisibility]);
  
  const handleRandomizeGroup = useCallback(() => {
    setComicPanels(null);
    const groupSize = Math.floor(Math.random() * (maxGroupSize - minGroupSize + 1)) + minGroupSize;
    const newCharacters: CharacterInstance[] = [];
    for (let i = 0; i < groupSize; i++) {
        let params = generateRandomParams();
        params = adjustParamsForLegs(params);
        const xPos = (i - (groupSize - 1) / 2) * (groupXSpread / (groupSize || 1));
        newCharacters.push({
            params,
            x: xPos,
            y: 0,
            scale: 0.8 + Math.random() * 0.2,
            zIndex: i + 1
        });
    }
    setCharacters(newCharacters);
    setBackgroundOptions(prev => ({ ...prev, animation: true }));
    setPanelVisibility('group');
  }, [minGroupSize, maxGroupSize, groupXSpread, setPanelVisibility]);

  const generatePanelLayouts = (count: number) => {
    const layouts = [];
    if (count <= 0) return [];
    if (count === 1) {
        layouts.push({ x: 5, y: 5, width: 90, height: 90 });
    } else if (count === 2) {
        layouts.push({ x: 5, y: 25, width: 42.5, height: 50 });
        layouts.push({ x: 52.5, y: 25, width: 42.5, height: 50 });
    } else if (count === 3) {
        layouts.push({ x: 5, y: 5, width: 90, height: 42.5 });
        layouts.push({ x: 5, y: 52.5, width: 42.5, height: 42.5 });
        layouts.push({ x: 52.5, y: 52.5, width: 42.5, height: 42.5 });
    } else if (count === 4) {
        layouts.push({ x: 5, y: 5, width: 42.5, height: 42.5 });
        layouts.push({ x: 52.5, y: 5, width: 42.5, height: 42.5 });
        layouts.push({ x: 5, y: 52.5, width: 42.5, height: 42.5 });
        layouts.push({ x: 52.5, y: 52.5, width: 42.5, height: 42.5 });
    } else if (count === 5) {
        layouts.push({ x: 5, y: 5, width: 42.5, height: 42.5 });
        layouts.push({ x: 52.5, y: 5, width: 42.5, height: 42.5 });
        layouts.push({ x: 5, y: 52.5, width: 27, height: 42.5 });
        layouts.push({ x: 37, y: 52.5, width: 27, height: 42.5 });
        layouts.push({ x: 69, y: 52.5, width: 27, height: 42.5 });
    } else { // 6 or more
        const cols = 2;
        const rows = Math.ceil(count / cols);
        const panelWidth = 90 / cols;
        const panelHeight = 90 / rows;
        const xMargin = 5;
        const yMargin = 5;
        for(let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            layouts.push({
                x: xMargin + col * panelWidth,
                y: yMargin + row * panelHeight,
                width: panelWidth,
                height: panelHeight,
            });
        }
    }
    return layouts;
  };
  
  const processComicScript = (script: ComicScript, characterParamsList: CharacterParams[]) => {
      const newPanels: ComicPanelData[] = [];
      const panelLayouts = generatePanelLayouts(script.panels.length);

      for (let i = 0; i < script.panels.length; i++) {
        const panelScript = script.panels[i];
        const panelCharacters: CharacterInstance[] = [];

        panelScript.charactersInPanel.forEach((charId, indexInPanel) => {
          if (charId < characterParamsList.length) {
            const params = characterParamsList[charId];
            const charX = (panelScript.charactersInPanel.length > 1) ? (indexInPanel * 150 - (panelScript.charactersInPanel.length - 1) * 75) : 0;
            const isFlipped = panelScript.dialogues && panelScript.dialogues.length > 0 && panelScript.charactersInPanel.length > 1 && charX > 0;
            
            panelCharacters.push({ params, x: charX, y: (Math.random() * 50), scale: 0.8, zIndex: indexInPanel + 1, isFlipped });
          }
        });
        
        newPanels.push({ id: `panel-${i}-${Date.now()}`, layout: panelLayouts[i], characters: panelCharacters, characterIdsInPanel: panelScript.charactersInPanel, dialogues: panelScript.dialogues || [], backgroundColor: `hsl(${Math.random() * 360}, 50%, 95%)`, description: panelScript.description, shotType: panelScript.shotType || 'medium-shot' });
      }
      setComicPanels(newPanels);
  }

  const handleGenerateComic = useCallback(async (mode: 'simple' | 'custom', options?: { theme?: string; panels?: number; language?: string; }) => {
    setIsGeneratingComic(true);
    setApiError(null);
    setCharacters([]);
    setComicPanels([]);
    
    try {
      if (mode === 'simple') {
        const themeToUse = options?.theme ?? comicTheme;
        const panelsToUse = options?.panels ?? numComicPanels;
        const languageToUse = options?.language ?? comicLanguage;
        const script = await generateComicScript(themeToUse, panelsToUse, languageToUse);
        if (!script || !script.panels || script.panels.length === 0) throw new Error("Received an empty or invalid script from the API.");

        const uniqueCharacterParams: CharacterParams[] = [];
        for (let i = 0; i < script.totalUniqueCharacters; i++) {
          let params = generateRandomParams();
          params = adjustParamsForLegs(params);
          params.eyeTracking = false;
          uniqueCharacterParams.push(params);
        }
        processComicScript(script, uniqueCharacterParams);

      } else { // Custom Mode
        if (!story || !lore || characterProfiles.length === 0) {
          throw new Error("Please define Lore, Characters, and a Story in the Narrative Editor first.");
        }
        const script = await generateComicScriptFromStory(story, lore, characterProfiles, numComicPanels, comicLanguage);

        const updatedProfiles = characterProfiles.map(p => {
          if (story.characterProfileIds.includes(p.id) && !p.characterParams) {
              let params = generateRandomParams();
              params = adjustParamsForLegs(params);
              params.eyeTracking = false;
              return { ...p, characterParams: params };
          }
          return p;
        });
        setCharacterProfiles(updatedProfiles);
        
        const characterParamsInStory = story.characterProfileIds.map(id => updatedProfiles.find(p => p.id === id)?.characterParams).filter(Boolean) as CharacterParams[];
        processComicScript(script, characterParamsInStory);
      }
    } catch (error: any) {
      console.error("Failed to generate comic", error);
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        setApiError(QUOTA_ERROR_MESSAGE);
      } else {
        setApiError('Failed to call the Gemini API. Please try again.');
      }
    } finally {
      setIsGeneratingComic(false);
    }
  }, [comicTheme, numComicPanels, comicLanguage, story, lore, characterProfiles]);
  
  const handleMenuItemClick = (key: PanelKey) => {
    setPanels(prev => {
        const newPanels = { ...prev };
        const panelState = newPanels[key];
        // FIX: Explicitly type `p` as PanelState to resolve TS error with Object.values.
        const maxZ = Math.max(...Object.values(newPanels).map((p: PanelState) => p.zIndex));
        newPanels[key] = { ...panelState, isOpen: true, zIndex: maxZ + 1 };
        return newPanels;
    });
  };
  
  const handleRandomizeComic = useCallback(async () => {
    setApiError(null);
    handleMenuItemClick('Comic');
    setIsRandomizingComic(true);
    try {
        const topic = await getTrendingTopic();
        setComicTheme(topic);
    } catch (error: any) {
        console.error("Failed to get trending topic, using fallback.", error);
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            setApiError(QUOTA_ERROR_MESSAGE);
        } else {
            setApiError('Failed to call the Gemini API. Please try again.');
        }
        const fallbackTheme = "Dos amigos en una aventura sorprendente";
        setComicTheme(fallbackTheme);
    } finally {
        setIsRandomizingComic(false);
    }
  }, [handleMenuItemClick]);
  
  const handleGenerateNarrativeElement = useCallback(async (elementType: 'lore' | 'character' | 'story', context?: any) => {
    setApiError(null);
    try {
        if (elementType === 'lore') {
            const result = await generateLore(context?.genreSuggestion || 'Fantasy');
            const newLore = { ...result, locations: result.locations.map(l => ({ ...l, id: `loc-${Date.now()}-${Math.random()}` })) };
            setLore(newLore);
        } else if (elementType === 'character') {
            const newProfile: CharacterProfile = {
              id: `char-${Date.now()}`,
              name: 'New Character',
              age: '',
              species: '',
              occupation: '',
              originLocationId: lore?.locations[0]?.id || '',
              psychology: { motivation: '', fear: '', virtues: '', flaws: '', archetype: '' },
              skills: '',
              limitations: '',
              backstory: { origin: '', wound: '', journey: '', initialState: '' },
            };
            setCharacterProfiles(prev => [...prev, newProfile]);
        } else if (elementType === 'story') {
            if (!lore || characterProfiles.length === 0) { alert("Please generate Lore and at least one Character first."); return; }
            const charactersInStory = characterProfiles.filter(c => context.characterIds.includes(c.id));
            if (charactersInStory.length === 0) { alert("Please select at least one character for the story."); return; }
            const result = await generateStory(lore, charactersInStory, context.genre, context.stakes);
            setStory({ ...result, characterProfileIds: context.characterIds });
        }
    } catch (error: any) {
        console.error(`Error generating ${elementType}:`, error);
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            setApiError(QUOTA_ERROR_MESSAGE);
        } else {
            setApiError('Failed to call the Gemini API. Please try again.');
        }
    }
  }, [lore, characterProfiles]);

  useEffect(() => {
    if (comicPanels === null && characters.length === 0) {
      handleRandomize();
    }
    if (comicPanels !== null && characters.length > 0) {
      setCharacters([]);
    }
  }, [comicPanels, characters, handleRandomize]);

  const bringToFront = useCallback((key: PanelKey) => {
    setPanels(prev => {
        // FIX: Explicitly type `p` as PanelState to resolve TS error with Object.values.
        const maxZ = Math.max(...Object.values(prev).map((p: PanelState) => p.zIndex));
        if (prev[key].zIndex === maxZ) return prev;
        const newPanels = { ...prev };
        newPanels[key] = { ...newPanels[key], zIndex: maxZ + 1 };
        return newPanels;
    });
  }, []);

  const togglePanel = useCallback((key: PanelKey) => {
    setPanels(prev => {
        const newPanels = { ...prev };
        const panelState = newPanels[key];
        const isOpen = !panelState.isOpen;
        let zIndex = panelState.zIndex;
        if (isOpen) {
            // FIX: Explicitly type `p` as PanelState to resolve TS error with Object.values.
            const maxZ = Math.max(...Object.values(newPanels).map((p: PanelState) => p.zIndex));
            zIndex = maxZ + 1;
        }
        newPanels[key] = { ...panelState, isOpen, zIndex };
        return newPanels;
    });
  }, []);

  const updatePanelPosition = useCallback((key: PanelKey, position: { x: number; y: number }) => {
    setPanels(prev => ({
        ...prev,
        [key]: { ...prev[key], position }
    }));
  }, []);

  const handleLimbSymmetryChange = useCallback((enabled: boolean) => setLimbSymmetry(enabled), []);
  const handleMinGroupSizeChange = useCallback((value: number) => { if (value > maxGroupSize) { setMinGroupSize(value); setMaxGroupSize(value); } else { setMinGroupSize(value); } }, [maxGroupSize]);
  const handleMaxGroupSizeChange = useCallback((value: number) => { if (value < minGroupSize) { setMaxGroupSize(value); setMinGroupSize(value); } else { setMaxGroupSize(value); } }, [minGroupSize]);
  const handleMinComicFontSizeChange = useCallback((value: number) => { if (value > maxComicFontSize) { setMinComicFontSize(value); setMaxComicFontSize(value); } else { setMinComicFontSize(value); } }, [maxComicFontSize]);
  const handleMaxComicFontSizeChange = useCallback((value: number) => { if (value < minComicFontSize) { setMaxComicFontSize(value); setMinComicFontSize(value); } else { setMaxComicFontSize(value); } }, [minComicFontSize]);
  
  const handleParamChange = useCallback((param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => {
    setCharacters(prev => {
        if (prev.length === 0) return prev;
        const newCharacters = [...prev];
        const newParams: CharacterParams = { ...newCharacters[0].params };

        if (limbSymmetry) {
            if (param === 'lArmWidth') newParams.rArmWidth = value as number;
            else if (param === 'rArmWidth') newParams.lArmWidth = value as number;
            else if (param === 'lHandSize') newParams.rHandSize = value as number;
            else if (param === 'rHandSize') newParams.lHandSize = value as number;
            else if (param === 'lLegWidth') newParams.rLegWidth = value as number;
            else if (param === 'rLegWidth') newParams.lLegWidth = value as number;
            else if (param === 'lFootSize') newParams.rFootSize = value as number;
            else if (param === 'rFootSize') newParams.lFootSize = value as number;
            else if (param === 'lArmAngle') newParams.rArmAngle = value as number;
            else if (param === 'rArmAngle') newParams.lArmAngle = value as number;
            else if (param === 'lArmBend') newParams.rArmBend = -(value as number);
            else if (param === 'rArmBend') newParams.lArmBend = -(value as number);
            else if (param === 'lLegAngle') newParams.rLegAngle = value as number;
            else if (param === 'rLegAngle') newParams.lLegAngle = value as number;
            else if (param === 'lLegBend') newParams.rLegBend = -(value as number);
            else if (param === 'rLegBend') newParams.lLegBend = -(value as number);
        }
        
        (newParams as any)[param] = value;
        newCharacters[0] = { ...newCharacters[0], params: adjustParamsForLegs(newParams) };
        return newCharacters;
    });
  }, [limbSymmetry]);
  
  const currentParams = characters.length === 1 ? characters[0].params : INITIAL_PARAMS;
  const maxMouthBend = 380 - 4 * currentParams.mouthWidthRatio;
  const maxFringeHeightRatio = (() => { const { headHeight, eyeSizeRatio } = currentParams; const margin = 5; const headTopY = 120 - headHeight / 2; const eyeTopY = 120 - (headHeight * (eyeSizeRatio / 100)); const maxFringeHeightPx = eyeTopY - headTopY - margin; const maxRatio = Math.max(0, (maxFringeHeightPx / headHeight) * 100); return isNaN(maxRatio) ? 100 : maxRatio; })();

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-200 font-sans overflow-hidden">
      {apiError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-auto max-w-2xl bg-white border border-gray-200 text-gray-800 px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-3" role="alert">
            <WarningIcon className="w-6 h-6 flex-shrink-0 text-red-500" />
            <span className="text-sm flex-grow" dangerouslySetInnerHTML={{ __html: apiError }} />
            <button onClick={() => setApiError(null)} className="p-1 -m-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Dismiss error">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
      )}
      <MenuBar onRandomize={handleRandomize} onRandomizeGroup={handleRandomizeGroup} onRandomizeComic={handleRandomizeComic} isRandomizingComic={isRandomizingComic} onMenuItemClick={handleMenuItemClick} />
      <main className="flex-grow relative">
        <CharacterCanvas characters={characters} comicPanels={comicPanels} backgroundOptions={backgroundOptions} showBoundingBoxes={showBoundingBoxes} comicAspectRatio={comicAspectRatio} minComicFontSize={minComicFontSize} maxComicFontSize={maxComicFontSize} />
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
          onGenerateComic={handleGenerateComic}
          isGeneratingComic={isGeneratingComic}
          togglePanel={togglePanel}
          updatePanelPosition={updatePanelPosition}
          bringToFront={bringToFront}
          lore={lore}
          onLoreChange={setLore}
          characterProfiles={characterProfiles}
          onCharacterProfilesChange={setCharacterProfiles}
          story={story}
          onStoryChange={setStory}
          onGenerateNarrativeElement={handleGenerateNarrativeElement}
          comicMode={comicMode}
          onComicModeChange={setComicMode}
          setApiError={setApiError}
        />
      </main>
    </div>
  );
}
export default App;