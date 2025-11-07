import React, { useState, useCallback, useEffect } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions, CharacterInstance, ComicPanelData, Lore, CharacterProfile, Story } from './types';
import { INITIAL_PARAMS, PARAM_CONFIGS } from './constants';
import CharacterCanvas from './components/CharacterCanvas';
import ControlPanel, { PanelKey, PanelState } from './components/ControlPanel';
import MenuBar from './components/MenuBar';
import WelcomeModal from './components/WelcomeModal';
import { generateComicScript, getTrendingTopic, generateLore, generateStory, generateComicScriptFromStory, ComicScript } from './services/geminiService';
import { CloseIcon, WarningIcon } from './components/icons';
import { generateRandomParams } from './services/characterGenerationService';
import StatusBar from './components/StatusBar';

const QUOTA_ERROR_MESSAGE = 'You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline font-semibold">here</a>.';

function App() {
  const [appState, setAppState] = useState<'welcome' | 'editing'>('welcome');
  const [characters, setCharacters] = useState<CharacterInstance[]>([]);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({ color1: '#ffffff', color2: '#F9DCC9', animation: true, });
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [canvasResetToken, setCanvasResetToken] = useState(0);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 400, height: 700 });
  
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
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [panels, setPanels] = useState<Record<PanelKey, PanelState>>({
    Comic: { isOpen: false, position: { x: 280, y: 240 }, zIndex: 1 },
    LoreEditor: { isOpen: false, position: { x: 340, y: 240 }, zIndex: 1 },
    CharacterEditor: { isOpen: false, position: { x: 20, y: 60 }, zIndex: 1 },
    Options: { isOpen: false, position: { x: 80, y: 120 }, zIndex: 1 },
    About: { isOpen: false, position: { x: 90, y: 130 }, zIndex: 1 },
  });

  const openPanel = useCallback((key: PanelKey) => {
    setPanels(prev => {
        const newPanels = { ...prev };
        const maxZ = Math.max(0, ...Object.values(newPanels).map((p: PanelState) => p.zIndex));
        newPanels[key] = { ...newPanels[key], isOpen: true, zIndex: maxZ + 1 };
        return newPanels;
    });
  }, []);
  
  const handleNewCharacter = useCallback(() => {
    setComicPanels(null);
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
      characterParams: { ...INITIAL_PARAMS }
    };
    setCharacterProfiles(prev => [...prev, newProfile]);
    setSelectedCharId(newProfile.id);
    openPanel('CharacterEditor');
    setAppState('editing');
    setCanvasResetToken(t => t + 1);
  }, [lore, openPanel]);

  const handleNewComic = useCallback(() => {
    setComicPanels([]);
    setCharacterProfiles([]);
    setSelectedCharId(null);
    openPanel('Comic');
    setAppState('editing');
  }, [openPanel]);

  const handleNewUniverse = useCallback(() => {
    setComicPanels(null);
    setCharacterProfiles([]);
    setSelectedCharId(null);
    openPanel('LoreEditor');
    setAppState('editing');
  }, [openPanel]);

  const handleRandomize = useCallback(() => {
    setComicPanels(null);
    const randomParams = generateRandomParams();
    randomParams.bodyOutlines = true;
    randomParams.eyeOutlines = true;

    const newProfile: CharacterProfile = {
      id: `char-${Date.now()}`,
      name: 'New Character',
      age: '', species: '', occupation: '', originLocationId: '',
      psychology: { motivation: '', fear: '', virtues: '', flaws: '', archetype: '' },
      skills: '', limitations: '',
      backstory: { origin: '', wound: '', journey: '', initialState: '' },
      characterParams: randomParams
    };
    setCharacterProfiles([newProfile]);
    setSelectedCharId(newProfile.id);
  }, []);
  
  const handleDeleteCharacter = (idToDelete: string) => {
      setCharacterProfiles(prev => {
          const newProfiles = prev.filter(c => c.id !== idToDelete);
          const newSelectedId = newProfiles.length > 0 ? newProfiles[newProfiles.length - 1].id : null;
          setSelectedCharId(newSelectedId);
          return newProfiles;
      });
  };
  
  useEffect(() => {
    const selectedProfile = characterProfiles.find(p => p.id === selectedCharId);
    
    const instances = selectedProfile && selectedProfile.characterParams ? 
        [{
            params: selectedProfile.characterParams,
            x: 0,
            y: 0,
            scale: 1,
            zIndex: 1,
        }] : [];
    
    setCharacters(instances);
  }, [characterProfiles, selectedCharId]);

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
    setCharacterProfiles([]);
    setSelectedCharId(null);
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
          params.eyeTracking = false;
          params.bodyOutlines = true;
          params.eyeOutlines = true;
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
              params.eyeTracking = false;
              params.bodyOutlines = true;
              params.eyeOutlines = true;
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
  
  const handleRandomizeComic = useCallback(async () => {
    setApiError(null);
    openPanel('Comic');
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
  }, [openPanel]);
  
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
              age: '', species: '', occupation: '', originLocationId: lore?.locations[0]?.id || '',
              psychology: { motivation: '', fear: '', virtues: '', flaws: '', archetype: '' },
              skills: '', limitations: '',
              backstory: { origin: '', wound: '', journey: '', initialState: '' },
              characterParams: { ...INITIAL_PARAMS }
            };
            setCharacterProfiles(prev => {
                const newProfiles = [...prev, newProfile];
                setSelectedCharId(newProfile.id);
                return newProfiles;
            });
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
    if (comicPanels !== null) {
      setCharacters([]);
    }
  }, [comicPanels]);

  const bringToFront = useCallback((key: PanelKey) => {
    setPanels(prev => {
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

  const handleMinComicFontSizeChange = useCallback((value: number) => { if (value > maxComicFontSize) { setMinComicFontSize(value); setMaxComicFontSize(value); } else { setMinComicFontSize(value); } }, [maxComicFontSize]);
  const handleMaxComicFontSizeChange = useCallback((value: number) => { if (value < minComicFontSize) { setMaxComicFontSize(value); setMinComicFontSize(value); } else { setMaxComicFontSize(value); } }, [minComicFontSize]);
  
  return (
    <div className="flex flex-col h-screen w-screen bg-[#FFFBF7] font-sans overflow-hidden">
      {appState === 'welcome' && (
        <WelcomeModal 
          onNewCharacter={handleNewCharacter}
          onNewComic={handleNewComic}
          onNewUniverse={handleNewUniverse}
        />
      )}
      {apiError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-auto max-w-2xl bg-[#FFFBF7] border border-[#FDEFE2] text-[#593A2D] px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-3" role="alert">
            <WarningIcon className="w-6 h-6 flex-shrink-0 text-red-500" />
            <span className="text-sm flex-grow" dangerouslySetInnerHTML={{ __html: apiError }} />
            <button onClick={() => setApiError(null)} className="p-1 -m-1 rounded-full text-[#8C5A3A] hover:bg-[#FDEFE2] transition-colors" aria-label="Dismiss error">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
      )}
      <MenuBar onRandomize={handleRandomize} onRandomizeComic={handleRandomizeComic} isRandomizingComic={isRandomizingComic} onMenuItemClick={openPanel} />
      <main className="flex-grow relative">
        <CharacterCanvas 
            characters={characters} 
            comicPanels={comicPanels} 
            backgroundOptions={backgroundOptions} 
            showBoundingBoxes={showBoundingBoxes} 
            comicAspectRatio={comicAspectRatio} 
            minComicFontSize={minComicFontSize} 
            maxComicFontSize={maxComicFontSize} 
            canvasResetToken={canvasResetToken} 
            onViewBoxChange={setViewBox}
        />
      </main>
      <StatusBar viewBox={viewBox} />
       <ControlPanel
          panels={panels}
          backgroundOptions={backgroundOptions}
          onBackgroundOptionsChange={setBackgroundOptions}
          showBoundingBoxes={showBoundingBoxes}
          onShowBoundingBoxesChange={setShowBoundingBoxes}
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
          selectedCharId={selectedCharId}
          onSelectedCharIdChange={setSelectedCharId}
          onDeleteCharacter={handleDeleteCharacter}
          story={story}
          onStoryChange={setStory}
          onGenerateNarrativeElement={handleGenerateNarrativeElement}
          comicMode={comicMode}
          onComicModeChange={setComicMode}
          setApiError={setApiError}
        />
    </div>
  );
}
export default App;