import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions, CharacterInstance, ComicPanelData, Lore, CharacterProfile, Story, RichText, Segment } from './types';
import { INITIAL_PARAMS, PARAM_CONFIGS } from './constants';
import CharacterCanvas from './components/CharacterCanvas';
import ControlPanel, { PanelKey, PanelState } from './components/ControlPanel';
import MenuBar from './components/MenuBar';
import WelcomeModal from './components/WelcomeModal';
import { generateComicScript, getTrendingTopic, generateLore, generateStory, generateComicScriptFromStory, ComicScript, generatePanelBackground, generateFullCharacterProfile, generateCharacterName } from './services/geminiService';
import { CloseIcon, WarningIcon } from './components/icons';
import { generateRandomParams } from './services/characterGenerationService';
import StatusBar from './components/StatusBar';

const QUOTA_ERROR_MESSAGE = 'You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">here</a>.';

// --- TEXT UTILS ---
const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
const stringToRichText = (text: string, source: 'user' | 'ai' = 'user'): RichText => [{ text, source }];
const emptyRichText = (): RichText => [{ text: '', source: 'user' }];


// --- CSV UTILS --- START
type CsvDataType = 'lore' | 'characters' | 'story';

const safeStringify = (value: any): string => {
  let str;
  if (Array.isArray(value) && value.every(item => item && typeof item.text === 'string' && typeof item.source === 'string')) {
    str = richTextToString(value as RichText);
  } else {
    str = typeof value === 'string' ? value : JSON.stringify(value) || '';
  }
  
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const LORE_HEADERS: (keyof Lore)[] = ['genre', 'rules', 'history', 'locations'];
const STORY_HEADERS: (keyof Story)[] = ['genre', 'stakes', 'characterProfileIds', 'storyCircle'];
const CHARACTER_HEADERS: (keyof CharacterProfile)[] = [
  'id', 'name', 'age', 'species', 'occupation', 'originLocationId', 'skills', 'limitations', 'psychology', 'backstory', 'characterParams'
];

const RICH_TEXT_CHARACTER_FIELDS: (keyof CharacterProfile)[] = ['name', 'age', 'species', 'occupation', 'skills', 'limitations'];
const RICH_TEXT_LORE_FIELDS: (keyof Lore)[] = ['genre', 'rules', 'history'];
const RICH_TEXT_STORY_FIELDS: (keyof Story)[] = ['genre', 'stakes'];

function dataToCsv(data: any, type: CsvDataType): string {
  if (!data) return '';
  
  let headers: string[] = [];
  let rowsData: any[] = [];

  switch(type) {
    case 'lore':
      if (data) {
        headers = LORE_HEADERS;
        rowsData = [data];
      }
      break;
    case 'story':
      if (data) {
        headers = STORY_HEADERS;
        rowsData = [data];
      }
      break;
    case 'characters':
      if (Array.isArray(data) && data.length > 0) {
        headers = CHARACTER_HEADERS;
        rowsData = data;
      }
      break;
  }
  
  if (headers.length === 0) return '';
  
  const headerRow = headers.join(',');
  const rows = rowsData.map(row => {
    return headers.map(header => safeStringify(row[header])).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

function csvToData(csvString: string, type: CsvDataType): any {
    const lines = csvString.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) throw new Error("El CSV debe tener una cabecera y al menos una fila de datos.");

    const headers = lines[0].split(',');

    let expectedHeaders: string[] = [];
    switch(type) {
        case 'lore': expectedHeaders = LORE_HEADERS; break;
        case 'story': expectedHeaders = STORY_HEADERS; break;
        case 'characters': expectedHeaders = CHARACTER_HEADERS; break;
    }

    if (headers.length !== expectedHeaders.length || !headers.every((h, i) => h === expectedHeaders[i])) {
        throw new Error(`Cabeceras de CSV inválidas. Esperado: ${expectedHeaders.join(',')}`);
    }

    const dataRows = lines.slice(1);
    const data = dataRows.map((row, rowIndex) => {
        const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (values.length !== headers.length) {
            throw new Error(`La fila ${rowIndex + 2} tiene un número incorrecto de columnas. Esperado: ${headers.length}, Obtenido: ${values.length}.`);
        }
        
        const obj: any = {};
        headers.forEach((header, index) => {
            let value = values[index];
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1).replace(/""/g, '"');
            }
            try {
                if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
                    obj[header] = JSON.parse(value);
                } else {
                    obj[header] = value;
                }
            } catch (e) {
                obj[header] = value;
            }
        });
        
        // Convert plain strings to RichText for relevant fields
        if (type === 'lore') {
            RICH_TEXT_LORE_FIELDS.forEach(field => {
                if (typeof obj[field] === 'string') obj[field] = stringToRichText(obj[field]);
            });
            if (Array.isArray(obj.locations)) {
                obj.locations = obj.locations.map((loc: any) => ({
                    ...loc,
                    name: typeof loc.name === 'string' ? stringToRichText(loc.name) : loc.name,
                    description: typeof loc.description === 'string' ? stringToRichText(loc.description) : loc.description,
                }));
            }
        } else if (type === 'story') {
            RICH_TEXT_STORY_FIELDS.forEach(field => {
                if (typeof obj[field] === 'string') obj[field] = stringToRichText(obj[field]);
            });
        } else if (type === 'characters') {
             RICH_TEXT_CHARACTER_FIELDS.forEach(field => {
                if (typeof obj[field] === 'string') obj[field] = stringToRichText(obj[field]);
            });
            // Nested rich text fields
            if(obj.psychology) {
                Object.keys(obj.psychology).forEach(key => {
                     if (typeof obj.psychology[key] === 'string') obj.psychology[key] = stringToRichText(obj.psychology[key]);
                });
            }
            if(obj.backstory) {
                Object.keys(obj.backstory).forEach(key => {
                     if (typeof obj.backstory[key] === 'string') obj.backstory[key] = stringToRichText(obj.backstory[key]);
                });
            }
        }
        return obj;
    });

    if (type === 'lore' || type === 'story') {
        if (data.length === 0) throw new Error("No se encontraron datos para importar.");
        return data[0];
    }
    return data;
}
// --- CSV UTILS --- END


function App() {
  const [appState, setAppState] = useState<'welcome' | 'editing'>('welcome');
  const [characters, setCharacters] = useState<CharacterInstance[]>([]);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOptions>({ color1: '#ffffff', color2: '#F9DCC9', animation: true, });
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [canvasResetToken, setCanvasResetToken] = useState(0);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 400, height: 700 });
  const [uiScale, setUiScale] = useState(100);
  
  // Simple Comic state
  const [comicTheme, setComicTheme] = useState('Típico chiste chileno');
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
  
  const [characterEditorTab, setCharacterEditorTab] = useState<'narrative' | 'appearance'>('narrative');
  
  const comicCanvasRef = useRef<{ export: () => void }>(null);


  const [panels, setPanels] = useState<Record<PanelKey, PanelState>>({
    Comic: { isOpen: false, position: { x: 0, y: 40 }, zIndex: 1 },
    LoreEditor: { isOpen: false, position: { x: 340, y: 240 }, zIndex: 1 },
    CharacterEditor: { isOpen: false, position: { x: 20, y: 60 }, zIndex: 1 },
    Options: { isOpen: false, position: { x: 80, y: 120 }, zIndex: 1 },
    About: { isOpen: false, position: { x: 90, y: 130 }, zIndex: 1 },
    TrendingTheme: { isOpen: false, position: { x: 250, y: 40 }, zIndex: 1 },
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
      name: stringToRichText('New Character'),
      age: emptyRichText(),
      species: emptyRichText(),
      occupation: emptyRichText(),
      originLocationId: lore?.locations[0]?.id || '',
      psychology: { 
        motivation: emptyRichText(), 
        fear: emptyRichText(), 
        virtues: emptyRichText(), 
        flaws: emptyRichText(), 
        archetype: emptyRichText() 
      },
      skills: emptyRichText(),
      limitations: emptyRichText(),
      backstory: { 
        origin: emptyRichText(), 
        wound: emptyRichText(), 
        journey: emptyRichText(), 
        initialState: emptyRichText() 
      },
      characterParams: { ...INITIAL_PARAMS }
    };
    setCharacterProfiles(prev => [...prev, newProfile]);
    setSelectedCharId(newProfile.id);
    setCharacterEditorTab('narrative'); // Start in full-screen narrative mode
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
      name: stringToRichText('New Character'),
      age: emptyRichText(), species: emptyRichText(), occupation: emptyRichText(), originLocationId: '',
      psychology: { motivation: emptyRichText(), fear: emptyRichText(), virtues: emptyRichText(), flaws: emptyRichText(), archetype: emptyRichText() },
      skills: emptyRichText(), limitations: emptyRichText(),
      backstory: { origin: emptyRichText(), wound: emptyRichText(), journey: emptyRichText(), initialState: emptyRichText() },
      characterParams: randomParams
    };
    setCharacterProfiles([newProfile]);
    setSelectedCharId(newProfile.id);
    setCharacterEditorTab('appearance'); // Start with appearance for randomized char
    openPanel('CharacterEditor');
  }, [openPanel]);
  
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
    if (count <= 0) return [];
    
    const layouts = [];
    const GUTTER = 2.5; // Gutter size as a percentage
    const MARGIN = 2.5; // Outer margin size as a percentage

    const totalWidth = 100 - MARGIN * 2;
    const totalHeight = 100 - MARGIN * 2;
    
    let grid: {rows: number, cols: number, custom?: boolean} = {rows: 1, cols: 1};

    switch (count) {
        case 1: grid = { rows: 1, cols: 1 }; break;
        case 2: grid = { rows: 1, cols: 2 }; break;
        case 3: grid = { rows: 2, cols: 2, custom: true }; break; // 1 large on top, 2 small below
        case 4: grid = { rows: 2, cols: 2 }; break;
        case 5: grid = { rows: 2, cols: 3, custom: true }; break; // 2 on top, 3 on bottom
        case 6: grid = { rows: 2, cols: 3 }; break;
        default: grid = { rows: Math.ceil(count / 3), cols: 3 }; break;
    }

    if (grid.custom) {
        if (count === 3) {
            const topHeight = (totalHeight - GUTTER) / 2;
            const bottomHeight = topHeight;
            const bottomWidth = (totalWidth - GUTTER) / 2;
            layouts.push({ x: MARGIN, y: MARGIN, width: totalWidth, height: topHeight });
            layouts.push({ x: MARGIN, y: MARGIN + topHeight + GUTTER, width: bottomWidth, height: bottomHeight });
            layouts.push({ x: MARGIN + bottomWidth + GUTTER, y: MARGIN + topHeight + GUTTER, width: bottomWidth, height: bottomHeight });
        } else if (count === 5) {
            const topHeight = (totalHeight - GUTTER) / 2;
            const bottomHeight = topHeight;
            const topWidth = (totalWidth - GUTTER) / 2;
            const bottomWidth = (totalWidth - (GUTTER * 2)) / 3;
            layouts.push({ x: MARGIN, y: MARGIN, width: topWidth, height: topHeight });
            layouts.push({ x: MARGIN + topWidth + GUTTER, y: MARGIN, width: topWidth, height: topHeight });
            layouts.push({ x: MARGIN, y: MARGIN + topHeight + GUTTER, width: bottomWidth, height: bottomHeight });
            layouts.push({ x: MARGIN + bottomWidth + GUTTER, y: MARGIN + topHeight + GUTTER, width: bottomWidth, height: bottomHeight });
            layouts.push({ x: MARGIN + (bottomWidth + GUTTER) * 2, y: MARGIN + topHeight + GUTTER, width: bottomWidth, height: bottomHeight });
        }
    } else {
        const { rows, cols } = grid;
        const panelWidth = (totalWidth - (cols - 1) * GUTTER) / cols;
        const panelHeight = (totalHeight - (rows - 1) * GUTTER) / rows;

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            layouts.push({
                x: MARGIN + col * (panelWidth + GUTTER),
                y: MARGIN + row * (panelHeight + GUTTER),
                width: panelWidth,
                height: panelHeight,
            });
        }
    }
    
    return layouts;
  };
  
  const createPanelCharacterVariation = (baseParams: CharacterParams): CharacterParams => {
    const newParams = { ...baseParams };
    newParams.eyebrowAngle += (Math.random() - 0.5) * 30;
  
    const mouthChoice = Math.random();
    if (mouthChoice < 0.4) {
      newParams.mouthBend = Math.random() * 50;
    } else if (mouthChoice < 0.7) {
      newParams.mouthBend = Math.random() * -50;
    } else {
      newParams.mouthBend = (Math.random() - 0.5) * 10;
    }
  
    newParams.lArmAngle += (Math.random() - 0.5) * 20;
    newParams.rArmAngle += (Math.random() - 0.5) * 20;
    newParams.lArmBend += (Math.random() - 0.5) * 40;
    newParams.rArmBend += (Math.random() - 0.5) * 40;
    newParams.lLegAngle += (Math.random() - 0.5) * 10;
    newParams.rLegAngle += (Math.random() - 0.5) * 10;
  
    return newParams;
  };

  const processComicScript = useCallback(async (script: ComicScript, characterParamsList: CharacterParams[]) => {
      const newPanels: ComicPanelData[] = [];
      const panelLayouts = generatePanelLayouts(script.panels.length);

      const isRTL = comicLanguage === 'ja' || comicLanguage === 'zh';
      let layoutMap = panelLayouts.map((_, i) => i);

      if (isRTL) {
          const numPanels = script.panels.length;
          if (numPanels === 2) { layoutMap = [1, 0]; }
          else if (numPanels === 3) { layoutMap = [0, 2, 1]; }
          else if (numPanels === 4) { layoutMap = [1, 0, 3, 2]; }
          else if (numPanels === 5) { layoutMap = [1, 0, 4, 3, 2]; }
          else if (numPanels === 6) { layoutMap = [1, 0, 3, 2, 5, 4]; }
      }

      const backgroundPromises = script.panels.map(panel => generatePanelBackground(panel.description));
      const backgroundImages = await Promise.all(backgroundPromises);

      for (let i = 0; i < script.panels.length; i++) {
        const panelScript = script.panels[i];
        const layout = panelLayouts[layoutMap[i]];
        const panelCharacters: CharacterInstance[] = [];

        panelScript.charactersInPanel.forEach((charId, indexInPanel) => {
          if (charId < characterParamsList.length) {
            const baseParams = characterParamsList[charId];
            const newParams = createPanelCharacterVariation(baseParams);
            
            const charX = (panelScript.charactersInPanel.length > 1) ? (indexInPanel * 150 - (panelScript.charactersInPanel.length - 1) * 75) : 0;
            const isFlipped = panelScript.dialogues && panelScript.dialogues.length > 0 && panelScript.charactersInPanel.length > 1 && charX > 0;
            
            panelCharacters.push({ params: newParams, x: charX, y: (Math.random() * 50), scale: 0.8, zIndex: indexInPanel + 1, isFlipped });
          }
        });

        if (panelCharacters.length === 2) {
            const headY = 120;
            panelCharacters[0].lookAt = { x: 9999, y: headY }; 
            panelCharacters[1].lookAt = { x: -9999, y: headY };
        }
        
        newPanels.push({ id: `panel-${i}-${Date.now()}`, layout, characters: panelCharacters, characterIdsInPanel: panelScript.charactersInPanel, dialogues: panelScript.dialogues || [], backgroundColor: `hsl(${Math.random() * 360}, 50%, 95%)`, description: panelScript.description, shotType: panelScript.shotType || 'medium-shot', backgroundImageB64: backgroundImages[i] });
      }
      setComicPanels(newPanels);
  }, [comicLanguage]);

  const handleGenerateComic = useCallback(async (mode: 'simple' | 'custom', options?: { theme?: string; panels?: number; language?: string; }, customData?: { lore: Lore, story: Story, characterProfiles: CharacterProfile[] }) => {
    setIsGeneratingComic(true);
    setApiError(null);
    setComicPanels([]);
    
    try {
      if (mode === 'simple') {
        let profilesToUse: CharacterProfile[];
        if (characterProfiles.length > 0) {
            profilesToUse = characterProfiles;
        } else {
            profilesToUse = await (async () => {
                const newProfiles: CharacterProfile[] = [];
                const numCharsToGen = 2; 
                const namePromises = [];
                for (let i = 0; i < numCharsToGen; i++) {
                    namePromises.push(generateCharacterName(options?.theme ?? comicTheme, options?.language ?? comicLanguage));
                }
                const generatedNames = await Promise.all(namePromises);

                for (let i = 0; i < numCharsToGen; i++) {
                    const randomParams = generateRandomParams();
                    randomParams.bodyOutlines = true;
                    randomParams.eyeOutlines = true;
                    randomParams.eyeTracking = false;
                    newProfiles.push({
                        id: `char-simple-${Date.now()}-${i}`,
                        name: stringToRichText(generatedNames[i] || `Personaje ${i + 1}`),
                        age: emptyRichText(), species: emptyRichText(), occupation: emptyRichText(), originLocationId: '',
                        psychology: { motivation: emptyRichText(), fear: emptyRichText(), virtues: emptyRichText(), flaws: emptyRichText(), archetype: emptyRichText() },
                        skills: emptyRichText(), limitations: emptyRichText(),
                        backstory: { origin: emptyRichText(), wound: emptyRichText(), journey: emptyRichText(), initialState: emptyRichText() },
                        characterParams: randomParams
                    });
                }
                setCharacterProfiles(newProfiles);
                setSelectedCharId(newProfiles.length > 0 ? newProfiles[0].id : null);
                return newProfiles;
            })();
        }

        const themeToUse = options?.theme ?? comicTheme;
        const panelsToUse = options?.panels ?? numComicPanels;
        const languageToUse = options?.language ?? comicLanguage;
        const script = await generateComicScript(themeToUse, panelsToUse, languageToUse, profilesToUse.length);
        if (!script || !script.panels || script.panels.length === 0) throw new Error("Received an empty or invalid script from the API.");

        const characterParamsList = profilesToUse.map(p => p.characterParams!).filter(Boolean) as CharacterParams[];
        await processComicScript(script, characterParamsList);

      } else { // Custom Mode
        const loreToUse = customData?.lore ?? lore;
        const storyToUse = customData?.story ?? story;
        const profilesToUse = customData?.characterProfiles ?? characterProfiles;

        if (!storyToUse || !loreToUse || profilesToUse.length === 0) {
          throw new Error("Please define Lore, Characters, and a Story in the Narrative Editor first.");
        }
        const script = await generateComicScriptFromStory(storyToUse, loreToUse, profilesToUse, numComicPanels, comicLanguage);

        if (!customData) { // Only update profiles if not using custom one-off data
          const updatedProfiles = profilesToUse.map(p => {
            if (storyToUse.characterProfileIds.includes(p.id) && !p.characterParams) {
                let params = generateRandomParams();
                params.eyeTracking = false;
                params.bodyOutlines = true;
                params.eyeOutlines = true;
                return { ...p, characterParams: params };
            }
            return p;
          });
          setCharacterProfiles(updatedProfiles);
        }
        
        const characterParamsInStory = storyToUse.characterProfileIds.map(id => profilesToUse.find(p => p.id === id)?.characterParams).filter(Boolean) as CharacterParams[];
        await processComicScript(script, characterParamsInStory);
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
  }, [comicTheme, numComicPanels, comicLanguage, story, lore, characterProfiles, processComicScript]);
  
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
  
  const handleRandomizeComicCharacters = useCallback(() => {
    if (!comicPanels) return;
  
    const allCharIds = comicPanels.flatMap(p => p.characterIdsInPanel);
    const totalUniqueCharacters = allCharIds.length > 0 ? Math.max(...allCharIds) + 1 : 0;
    if (totalUniqueCharacters === 0) return;
  
    const newCharacterParamsList: CharacterParams[] = [];
    for (let i = 0; i < totalUniqueCharacters; i++) {
      let params = generateRandomParams();
      params.eyeTracking = false;
      params.bodyOutlines = true;
      params.eyeOutlines = true;
      newCharacterParamsList.push(params);
    }
  
    const newComicPanels = comicPanels.map(panel => {
      const newPanelCharacters: CharacterInstance[] = panel.characterIdsInPanel.map((charId, indexInPanel) => {
        const originalInstance = panel.characters[indexInPanel];
        const baseParams = newCharacterParamsList[charId];
        const newParams = createPanelCharacterVariation(baseParams);
  
        return {
          ...originalInstance,
          params: newParams,
        };
      });
  
      if (newPanelCharacters.length === 2) {
        const headY = 120;
        newPanelCharacters[0].lookAt = { x: 9999, y: headY };
        newPanelCharacters[1].lookAt = { x: -9999, y: headY };
      }
  
      return { ...panel, characters: newPanelCharacters };
    });
  
    setComicPanels(newComicPanels);
  }, [comicPanels]);

  const handleGenerateNarrativeElement = useCallback(async (elementType: 'lore' | 'character' | 'story', context?: any) => {
    setApiError(null);
    try {
        if (elementType === 'lore') {
            const result = await generateLore(context?.genreSuggestion || 'Fantasy');
            const newLore: Lore = {
                genre: stringToRichText(result.genre, 'ai'),
                rules: stringToRichText(result.rules, 'ai'),
                history: stringToRichText(result.history, 'ai'),
                locations: result.locations.map(l => ({ 
                    ...l, 
                    id: `loc-${Date.now()}-${Math.random()}`,
                    name: stringToRichText(l.name, 'ai'),
                    description: stringToRichText(l.description, 'ai')
                }))
            };
            setLore(newLore);
            return newLore;
        } else if (elementType === 'character') {
             const newProfile: CharacterProfile = {
              id: `char-${Date.now()}`,
              name: stringToRichText('New Character'),
              age: emptyRichText(), species: emptyRichText(), occupation: emptyRichText(), 
              originLocationId: lore?.locations[0]?.id || '',
              psychology: { motivation: emptyRichText(), fear: emptyRichText(), virtues: emptyRichText(), flaws: emptyRichText(), archetype: emptyRichText() },
              skills: emptyRichText(), limitations: emptyRichText(),
              backstory: { origin: emptyRichText(), wound: emptyRichText(), journey: emptyRichText(), initialState: emptyRichText() },
              characterParams: { ...INITIAL_PARAMS }
            };
            setCharacterProfiles(prev => {
                const newProfiles = [...prev, newProfile];
                setSelectedCharId(newProfile.id);
                return newProfiles;
            });
            return newProfile;
        } else if (elementType === 'story') {
            if (!lore || characterProfiles.length === 0) { alert("Please generate Lore and at least one Character first."); return; }
            const charactersInStory = characterProfiles.filter(c => context.characterIds.includes(c.id));
            if (charactersInStory.length === 0) { alert("Please select at least one character for the story."); return; }
            const result = await generateStory(lore, charactersInStory, context.genre, context.stakes);
            const newStory = { 
                genre: context.genre, 
                stakes: context.stakes, 
                storyCircle: result.storyCircle, 
                characterProfileIds: context.characterIds 
            };
            setStory(newStory);
            return newStory;
        }
    } catch (error: any) {
        console.error(`Error generating ${elementType}:`, error);
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            setApiError(QUOTA_ERROR_MESSAGE);
        } else {
            setApiError('Failed to call the Gemini API. Please try again.');
        }
        throw error; // Re-throw to allow callers to handle it
    }
  }, [lore, characterProfiles]);
  
  const handleGenerateSimpleCharacters = useCallback(async (count: number) => {
    const namePromises = [];
    for (let i = 0; i < count; i++) {
        namePromises.push(generateCharacterName('a funny comic', comicLanguage));
    }
    const generatedNames = await Promise.all(namePromises);

    const newProfiles: CharacterProfile[] = [];
    for (let i = 0; i < count; i++) {
        const randomParams = generateRandomParams();
        randomParams.bodyOutlines = true;
        randomParams.eyeOutlines = true;
        randomParams.eyeTracking = false;
        newProfiles.push({
            id: `char-simple-${Date.now()}-${i}`,
            name: stringToRichText(generatedNames[i] || `Personaje ${i + 1}`),
            age: emptyRichText(), species: emptyRichText(), occupation: emptyRichText(), originLocationId: '',
            psychology: { motivation: emptyRichText(), fear: emptyRichText(), virtues: emptyRichText(), flaws: emptyRichText(), archetype: emptyRichText() },
            skills: emptyRichText(), limitations: emptyRichText(),
            backstory: { origin: emptyRichText(), wound: emptyRichText(), journey: emptyRichText(), initialState: emptyRichText() },
            characterParams: randomParams
        });
    }
    setCharacterProfiles(newProfiles);
    if (newProfiles.length > 0) {
        setSelectedCharId(newProfiles[0].id);
    } else {
        setSelectedCharId(null);
    }
  }, [comicLanguage]);

  const handleRegenerateCharacterName = useCallback(async (characterId: string) => {
    setApiError(null);
    try {
        const char = characterProfiles.find(c => c.id === characterId);
        if (!char) return;
        
        const newName = await generateCharacterName(comicTheme, comicLanguage);
        setCharacterProfiles(prev => prev.map(p => 
            p.id === characterId ? {...p, name: stringToRichText(newName, 'ai')} : p
        ));
    } catch (error: any) {
        console.error("Error regenerating name:", error);
        setApiError('Failed to generate a new name.');
    }
  }, [comicTheme, comicLanguage, characterProfiles]);

  const handleGenerateAllAndComic = useCallback(async () => {
    setIsGeneratingComic(true);
    setApiError(null);
    try {
      // 1. Generate Lore
      const loreResult = await generateLore('Sci-fi Comedy');
      const newLore: Lore = {
        genre: stringToRichText(loreResult.genre, 'ai'),
        rules: stringToRichText(loreResult.rules, 'ai'),
        history: stringToRichText(loreResult.history, 'ai'),
        locations: loreResult.locations.map(l => ({ ...l, id: `loc-${Date.now()}-${Math.random()}`, name: stringToRichText(l.name, 'ai'), description: stringToRichText(l.description, 'ai') }))
      };
      
      // 2. Generate 2 Characters
      const newProfiles: CharacterProfile[] = [];
      for (let i = 0; i < 2; i++) {
        const partialProfile: CharacterProfile = {
          id: `char-${Date.now()}-${i}`,
          name: stringToRichText('New Character'), age: emptyRichText(), species: emptyRichText(), occupation: emptyRichText(), originLocationId: newLore.locations[0]?.id || '',
          psychology: { motivation: emptyRichText(), fear: emptyRichText(), virtues: emptyRichText(), flaws: emptyRichText(), archetype: emptyRichText() },
          skills: emptyRichText(), limitations: emptyRichText(),
          backstory: { origin: emptyRichText(), wound: emptyRichText(), journey: emptyRichText(), initialState: emptyRichText() },
        };
        const narrativeResult = await generateFullCharacterProfile(partialProfile, newLore);
        const fullProfile: CharacterProfile = {
            ...partialProfile,
            ...narrativeResult,
            // FIX: Cast result properties to string as the return type of generateFullCharacterProfile is incorrect.
            // The API returns strings, but the type signature says RichText, causing a type mismatch.
            name: stringToRichText(narrativeResult.name as unknown as string, 'ai'), age: stringToRichText(narrativeResult.age as unknown as string, 'ai'), species: stringToRichText(narrativeResult.species as unknown as string, 'ai'),
            occupation: stringToRichText(narrativeResult.occupation as unknown as string, 'ai'), skills: stringToRichText(narrativeResult.skills as unknown as string, 'ai'), limitations: stringToRichText(narrativeResult.limitations as unknown as string, 'ai'),
            psychology: {
                motivation: stringToRichText(narrativeResult.psychology.motivation as unknown as string, 'ai'), fear: stringToRichText(narrativeResult.psychology.fear as unknown as string, 'ai'),
                virtues: stringToRichText(narrativeResult.psychology.virtues as unknown as string, 'ai'), flaws: stringToRichText(narrativeResult.psychology.flaws as unknown as string, 'ai'), archetype: stringToRichText(narrativeResult.psychology.archetype as unknown as string, 'ai'),
            },
            backstory: {
                origin: stringToRichText(narrativeResult.backstory.origin as unknown as string, 'ai'), wound: stringToRichText(narrativeResult.backstory.wound as unknown as string, 'ai'),
                journey: stringToRichText(narrativeResult.backstory.journey as unknown as string, 'ai'), initialState: stringToRichText(narrativeResult.backstory.initialState as unknown as string, 'ai'),
            }
        };
        newProfiles.push(fullProfile);
      }

      // 3. Generate Story
      const storyGenre = stringToRichText(`${richTextToString(newLore.genre)} aventura`, 'ai');
      const storyStakes = stringToRichText('The fate of the galaxy hangs in the balance', 'ai');
      const storyResult = await generateStory(newLore, newProfiles, storyGenre, storyStakes);
      const newStory: Story = {
        genre: storyGenre, stakes: storyStakes,
        storyCircle: storyResult.storyCircle,
        characterProfileIds: newProfiles.map(p => p.id),
      };

      // 4. Set all state at once
      setLore(newLore);
      setCharacterProfiles(newProfiles);
      setStory(newStory);
      setSelectedCharId(newProfiles.length > 0 ? newProfiles[0].id : null);

      // 5. Generate comic using the new data directly
      await handleGenerateComic('custom', undefined, { lore: newLore, story: newStory, characterProfiles: newProfiles });

    } catch (error) {
      console.error("Failed to generate all and comic", error);
      setApiError('A failure occurred during the generation process. Please try again.');
    } finally {
      setIsGeneratingComic(false);
    }
  }, [handleGenerateComic]);

  const handleExportComic = useCallback(() => {
    comicCanvasRef.current?.export();
  }, []);

  useEffect(() => {
    const scale = uiScale / 100;
    const styleId = 'ui-scale-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    // By setting the font-size on the :root (html) with !important,
    // we ensure that all rem-based units in the UI scale properly,
    // overriding any browser-level minimum font size settings that might
    // prevent text from scaling down.
    styleElement.innerHTML = `
      :root {
        font-size: ${16 * scale}px !important;
      }
    `;
  }, [uiScale]);

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

  const togglePanel = useCallback((key: PanelKey, openerKey?: PanelKey) => {
    setPanels(prev => {
        const newPanels = { ...prev };
        const panelState = newPanels[key];
        const isOpen = !panelState.isOpen;
        let zIndex = panelState.zIndex;
        let position = panelState.position;

        if (isOpen) {
            const maxZ = Math.max(...Object.values(newPanels).map((p: PanelState) => p.zIndex));
            zIndex = maxZ + 1;
            if (openerKey && prev[openerKey]?.isOpen) {
                const openerState = prev[openerKey];
                const panelWidth = 224; // w-56
                const gap = 16;
                const parentWidth = window.innerWidth;
                
                let newX = openerState.position.x + panelWidth + gap;
                if (newX + panelWidth > parentWidth) {
                    newX = openerState.position.x - panelWidth - gap;
                }
                
                newX = Math.max(0, newX);
                newX = Math.min(newX, parentWidth - panelWidth);

                position = {
                    x: newX,
                    y: openerState.position.y
                };
            }
        }
        newPanels[key] = { ...panelState, isOpen, zIndex, position };
        return newPanels;
    });
  }, []);

  const updatePanelPosition = useCallback((key: PanelKey, position: { x: number; y: number }) => {
    setPanels(prev => ({
        ...prev,
        [key]: { ...prev[key], position }
    }));
  }, []);
  
  // FIX: Added a handler to properly update backgroundOptions state from a partial object.
  const handleBackgroundOptionsChange = useCallback((options: Partial<BackgroundOptions>) => {
    setBackgroundOptions(prev => ({ ...prev, ...options }));
  }, []);

  const handleMinComicFontSizeChange = useCallback((value: number) => { if (value > maxComicFontSize) { setMinComicFontSize(value); setMaxComicFontSize(value); } else { setMinComicFontSize(value); } }, [maxComicFontSize]);
  const handleMaxComicFontSizeChange = useCallback((value: number) => { if (value < minComicFontSize) { setMaxComicFontSize(value); setMinComicFontSize(value); } else { setMaxComicFontSize(value); } }, [minComicFontSize]);
  
  const handleExport = useCallback((type: CsvDataType) => {
    let data;
    let filename = `${type}.csv`;
    switch(type) {
      case 'lore': data = lore; break;
      case 'characters': data = characterProfiles; break;
      case 'story': data = story; break;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        alert(`No hay datos de "${type}" para exportar.`);
        return;
    }

    try {
        const csvString = dataToCsv(data, type);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Error exporting CSV:", error);
        alert(`Ocurrió un error al exportar los datos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [lore, characterProfiles, story]);

  const handleImport = useCallback((type: CsvDataType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvString = event.target?.result as string;
        if (!csvString) {
          alert("El archivo está vacío o no se pudo leer.");
          return;
        }

        try {
          const importedData = csvToData(csvString, type);
          switch(type) {
            case 'lore':
              setLore(importedData as Lore);
              alert("Universo importado con éxito.");
              break;
            case 'story':
              setStory(importedData as Story);
              alert("Historia importada con éxito.");
              break;
            case 'characters':
              setCharacterProfiles(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newChars = (importedData as CharacterProfile[]).filter(p => !existingIds.has(p.id));
                if (newChars.length === 0) {
                    alert("No se encontraron personajes nuevos para importar (IDs ya existen).");
                    return prev;
                }
                alert(`${newChars.length} personaje(s) importado(s) con éxito.`);
                return [...prev, ...newChars];
              });
              break;
          }
        } catch (error) {
          console.error("Error importing CSV:", error);
          alert(`Error al importar el archivo: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);
  
  const handleAppendComicTheme = useCallback((theme: string) => {
    setComicTheme(prev => {
        const newTheme = `#${theme.replace(/\s+/g, '_')}`;
        if (prev.trim() === '') return newTheme;
        return `${prev} ${newTheme}`;
    });
  }, []);

  const fullScreenPanelKey = panels.LoreEditor.isOpen
    ? 'LoreEditor'
    : (panels.CharacterEditor.isOpen && characterEditorTab === 'narrative'
      ? 'CharacterEditor'
      : null);


  return (
    <div className="flex flex-col h-screen w-screen bg-condorito-pink font-sans overflow-hidden">
      {appState === 'welcome' && (
        <WelcomeModal 
          onNewCharacter={handleNewCharacter}
          onNewComic={handleNewComic}
          onNewUniverse={handleNewUniverse}
        />
      )}
      {apiError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-auto max-w-2xl bg-panel-back border border-panel-header text-condorito-brown px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-3" role="alert">
            <WarningIcon className="w-6 h-6 flex-shrink-0 text-condorito-red" />
            <span className="text-xs flex-grow" dangerouslySetInnerHTML={{ __html: apiError }} />
            <button onClick={() => setApiError(null)} className="p-1 -m-1 rounded-full text-condorito-brown hover:bg-panel-header transition-colors" aria-label="Dismiss error">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
      )}
      <MenuBar 
        onRandomize={handleRandomize} 
        onRandomizeComic={handleRandomizeComic} 
        isRandomizingComic={isRandomizingComic} 
        onMenuItemClick={openPanel} 
        handleImport={handleImport}
        handleExport={handleExport}
        onExportComic={handleExportComic}
      />
      <main className={`flex-grow relative ${fullScreenPanelKey ? 'invisible' : ''}`}>
        <CharacterCanvas 
            ref={comicCanvasRef}
            characters={characters} 
            comicPanels={comicPanels} 
            backgroundOptions={backgroundOptions} 
            showBoundingBoxes={showBoundingBoxes} 
            comicAspectRatio={comicAspectRatio} 
            minComicFontSize={minComicFontSize} 
            maxComicFontSize={maxComicFontSize} 
            comicLanguage={comicLanguage}
            comicTheme={comicTheme}
            canvasResetToken={canvasResetToken} 
            onViewBoxChange={setViewBox}
        />
      </main>
      <StatusBar viewBox={viewBox} />
       <ControlPanel
          panels={panels}
          fullScreenPanelKey={fullScreenPanelKey}
          backgroundOptions={backgroundOptions}
          onBackgroundOptionsChange={handleBackgroundOptionsChange}
          showBoundingBoxes={showBoundingBoxes}
          onShowBoundingBoxesChange={setShowBoundingBoxes}
          uiScale={uiScale}
          onUiScaleChange={setUiScale}
          comicTheme={comicTheme}
          onComicThemeChange={setComicTheme}
          onAppendComicTheme={handleAppendComicTheme}
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
          onGenerateAllAndComic={handleGenerateAllAndComic}
          isGeneratingComic={isGeneratingComic}
          onRandomizeComic={handleRandomizeComic}
          isRandomizingComic={isRandomizingComic}
          comicPanels={comicPanels}
          onRandomizeComicCharacters={handleRandomizeComicCharacters}
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
          onGenerateSimpleCharacters={handleGenerateSimpleCharacters}
          onRegenerateCharacterName={handleRegenerateCharacterName}
          comicMode={comicMode}
          onComicModeChange={setComicMode}
          characterEditorTab={characterEditorTab}
          onCharacterEditorTabChange={setCharacterEditorTab}
          setApiError={setApiError}
        />
    </div>
  );
}
export default App;