import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Lore, CharacterProfile, Story, Location, RichText, Segment, Season, StoryArc, StoryCircleStep } from '../types';
import { DiceIcon, ImageIcon } from './icons';
import { generateNarrativeField, generateLocation, generateLocationImage } from '../services/geminiService';
import { PanelKey } from './ControlPanel';


interface LoreEditorProps {
  lore: Lore | null;
  onLoreChange: (lore: Lore | null) => void;
  characterProfiles: CharacterProfile[];
  story: Story | null;
  onStoryChange: (story: Story | null) => void;
  onGenerateNarrativeElement: (elementType: 'lore' | 'character' | 'story', context?: any) => Promise<any>;
  togglePanel: (key: PanelKey) => void;
  setApiError: (error: string | null) => void;
}

// --- UTILS ---
const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
const stringToRichText = (text: string, source: 'user' | 'ai'): RichText => [{ text, source }];
const EMPTY_LORE: Lore = { genre: [], rules: [], locations: [], history: [] };
const EMPTY_STORY: Story = { genre: [], stakes: [], characterProfileIds: [], seasons: [] };

// --- RichTextEditor Component ---
interface RichTextEditorProps {
    label: string;
    value: RichText | undefined;
    onChange: (value: RichText) => void;
    onBlur: React.FocusEventHandler<HTMLTextAreaElement | HTMLInputElement>;
    rows?: number;
    onGenerate?: () => void;
    isGenerating?: boolean;
    isSingleLine?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = React.memo(({ label, value, onChange, onBlur, rows = 3, onGenerate, isGenerating, isSingleLine = false }) => {
    const stringValue = richTextToString(value);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        onChange([{ text: e.target.value, source: 'user' }]);
    };

    const commonProps = {
        value: stringValue,
        onChange: handleChange,
        onBlur: onBlur,
        spellCheck: false,
        className: "w-full p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red transition",
    };

    return (
        <div>
            <label className="select-none block text-xs font-semibold text-condorito-brown mb-1">{label}</label>
            <div className="flex items-start gap-2">
                {onGenerate && (
                    <button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="mt-1.5 p-1.5 bg-condorito-red/10 text-condorito-red rounded-full hover:bg-condorito-red/20 disabled:bg-panel-header disabled:text-panel-border disabled:cursor-wait transition-colors"
                        aria-label={`Generate ${label}`}
                        title={`Generate ${label}`}
                    >
                        <DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                )}
                <div className="relative flex-grow">
                    {isSingleLine ? (
                        <input type="text" {...commonProps} className={`${commonProps.className} resize-none`} />
                    ) : (
                        <textarea rows={rows} {...commonProps} className={`${commonProps.className} resize-y`} />
                    )}
                </div>
            </div>
        </div>
    );
});


// --- UI Components ---
type MainTab = 'lore' | 'story';
type LoreSubTab = 'core' | 'locations';
type StorySubTab = 'premise' | 'structure';

const LORE_PRESETS_STORAGE_KEY = 'universe-lore-presets';

interface LorePreset {
    name: string;
    lore: Lore;
}


const MainTabButton = ({ tabName, label, activeTab, setActiveTab }: { tabName: MainTab, label: string, activeTab: MainTab, setActiveTab: (tab: MainTab) => void}) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`select-none flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'border-condorito-red text-condorito-red bg-white' : 'border-transparent text-condorito-brown hover:bg-panel-header/50 hover:text-condorito-brown'}`}
    >{label}</button>
);

const SubTabButton = ({ label, active, onClick, disabled }: { label: string, active: boolean, onClick: () => void, disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} className={`select-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-condorito-red text-white shadow-sm' : 'bg-panel-header text-condorito-brown hover:bg-panel-border'} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {label}
    </button>
);


const LoreEditor: React.FC<LoreEditorProps> = ({ lore, onLoreChange, characterProfiles, story, onStoryChange, onGenerateNarrativeElement, togglePanel, setApiError }) => {
    const [activeTab, setActiveTab] = useState<MainTab>('lore');
    const [activeSubTabs, setActiveSubTabs] = useState({ lore: 'core' as LoreSubTab, story: 'premise' as StorySubTab });
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isFieldLoading, setIsFieldLoading] = useState<Set<string>>(new Set());
    const [isImageLoading, setIsImageLoading] = useState<Set<string>>(new Set());

    const [localLore, setLocalLore] = useState(lore);
    const [localStory, setLocalStory] = useState(story);
    
    // --- Preset State ---
    const [lorePresets, setLorePresets] = useState<LorePreset[]>([]);
    const [showLorePresets, setShowLorePresets] = useState(false);
    const [isNamingLorePreset, setIsNamingLorePreset] = useState(false);
    const [lorePresetNameInput, setLorePresetNameInput] = useState('');

    useEffect(() => { setLocalLore(lore); }, [lore]);
    useEffect(() => { setLocalStory(story); }, [story]);
    
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LORE_PRESETS_STORAGE_KEY);
            if (stored) {
                setLorePresets(JSON.parse(stored));
            }
        } catch (e) { console.error("Failed to load lore presets", e); }
    }, []);

    const syncStateToParent = useCallback(() => {
        if (JSON.stringify(localLore) !== JSON.stringify(lore)) onLoreChange(localLore);
        if (JSON.stringify(localStory) !== JSON.stringify(story)) onStoryChange(localStory);
    }, [localLore, lore, onLoreChange, localStory, story, onStoryChange]);

    const handleGenerate = async (type: 'lore' | 'story', context?: any) => {
        syncStateToParent();
        setIsLoading(type);
        try {
            await onGenerateNarrativeElement(type, context);
        } finally {
            setIsLoading(null);
        }
    }
    
    // --- Preset Handlers ---
    const handleInitiateSaveLorePreset = () => {
        if (!localLore) {
            alert("No universe data to save.");
            return;
        }
        setIsNamingLorePreset(true);
        setLorePresetNameInput('');
        setShowLorePresets(false);
    };

    const handleConfirmSaveLorePreset = useCallback(() => {
        if (!lorePresetNameInput.trim()) {
            alert("Please enter a name for the preset.");
            return;
        }
        if (!localLore) {
            alert("No universe data to save.");
            return;
        }

        const presetName = lorePresetNameInput.trim();
        const newPreset: LorePreset = { name: presetName, lore: localLore };
        
        setLorePresets(prev => {
            const existingIndex = prev.findIndex(p => p.name.toLowerCase() === presetName.toLowerCase());
            const newPresets = [...prev];
            if (existingIndex > -1) {
                newPresets[existingIndex] = newPreset;
            } else {
                newPresets.push(newPreset);
            }
            try {
                const sorted = newPresets.sort((a,b) => a.name.localeCompare(b.name));
                localStorage.setItem(LORE_PRESETS_STORAGE_KEY, JSON.stringify(sorted));
                return sorted;
            } catch (error) { console.error("Failed to save lore presets", error); return prev; }
        });

        setIsNamingLorePreset(false);
        setLorePresetNameInput('');
    }, [lorePresetNameInput, localLore]);
    
    const handleLoadLorePreset = useCallback((presetLore: Lore) => {
        setLocalLore(presetLore);
        onLoreChange(presetLore); // Also update parent
        setShowLorePresets(false);
    }, [onLoreChange]);
    
    const handleDeleteLorePreset = useCallback((presetName: string) => {
        if (!confirm(`Are you sure you want to delete the universe preset "${presetName}"?`)) return;
        setLorePresets(prev => {
            const newPresets = prev.filter(p => p.name !== presetName);
            try { localStorage.setItem(LORE_PRESETS_STORAGE_KEY, JSON.stringify(newPresets)); } 
            catch (error) { console.error("Failed to delete lore preset", error); }
            return newPresets;
        });
    }, []);


    const handleGenerateField = useCallback(async (field: string) => {
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(field));
        const context = { lore: localLore, story: localStory, characters: characterProfiles };
        try {
            const { text } = await generateNarrativeField(field, context);
            const [mainKey, subKey] = field.split('.');
            const richText = stringToRichText(text, 'ai');

            if (mainKey === 'lore') {
                const emptyLore: Lore = { genre: [], rules: [], locations: [], history: [] };
                setLocalLore(current => ({ ...(current || emptyLore), [subKey]: richText }));
            } else if (mainKey === 'story') {
                 setLocalStory(current => {
                    const baseStory: Story = current ?? { genre: [], stakes: [], characterProfileIds:[], seasons:[] };
                    return { ...baseStory, [subKey]: richText };
                });
            }
            
        } catch (error: any) {
            console.error(`Error generating for field ${field}:`, error);
            const errorMessage = error.message || String(error);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                setApiError('You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">here</a>.');
            } else {
                setApiError('Failed to call the Gemini API. Please try again.');
            }
        } finally {
            setIsFieldLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(field);
                return newSet;
            });
        }
    }, [localLore, localStory, characterProfiles, setApiError]);
    
    const handleGenerateLocationField = async (locationId: string, field: 'location.name' | 'location.description') => {
        const location = localLore?.locations.find(l => l.id === locationId);
        if (!location || !localLore) return;
    
        const loadingKey = `${field}-${locationId}`;
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(loadingKey));
    
        try {
            const { text } = await generateNarrativeField(field, { lore: localLore, location });
            const richText = stringToRichText(text, 'ai');
    
            setLocalLore(current => {
                if (!current) return current;
                const newLocations = current.locations.map(l => {
                    if (l.id === locationId) {
                        const fieldToUpdate = field.split('.')[1] as 'name' | 'description';
                        return { ...l, [fieldToUpdate]: richText };
                    }
                    return l;
                });
                return { ...current, locations: newLocations };
            });
    
        } catch (error: any) {
            console.error(`Error generating for field ${field}:`, error);
            const errorMessage = error.message || String(error);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                setApiError('You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-condorito-red hover:underline font-semibold">here</a>.');
            } else {
                setApiError('Failed to call the Gemini API. Please try again.');
            }
        } finally {
            setIsFieldLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(loadingKey);
                return newSet;
            });
        }
    };

    // --- Location Handlers ---
    const handleAddLocation = () => {
        const newLocation: Location = {
            id: `loc-${Date.now()}`,
            name: stringToRichText('Nuevo Lugar', 'user'),
            description: [{text: '', source: 'user'}]
        };
        setLocalLore(current => {
            const currentLore = current || EMPTY_LORE;
            const newLocations = [...currentLore.locations, newLocation];
            return { ...currentLore, locations: newLocations };
        });
    };

    const handleDeleteLocation = (idToDelete: string) => {
        setLocalLore(current => {
            if (!current) return current;
            const newLocations = current.locations.filter(l => l.id !== idToDelete);
            return { ...current, locations: newLocations };
        });
    };

    const handleGenerateImageForLocation = async (locationId: string) => {
        const location = localLore?.locations.find(l => l.id === locationId);
        if (!location || !localLore) return;
    
        const loadingKey = `image-${locationId}`;
        setApiError(null);
        setIsImageLoading(prev => new Set(prev).add(loadingKey));
    
        try {
            const imageB64 = await generateLocationImage(richTextToString(location.name), richTextToString(location.description), richTextToString(localLore.genre));
            setLocalLore(current => {
                if (!current) return current;
                const newLocations = current.locations.map(l => 
                    l.id === locationId ? { ...l, imageB64 } : l
                );
                return { ...current, locations: newLocations };
            });
        } catch (error: any) {
            console.error(`Error generating image for location ${locationId}:`, error);
            setApiError('Failed to generate location image. Please try again.');
        } finally {
            setIsImageLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(loadingKey);
                return newSet;
            });
        }
    };
    
    const handleGenerateLocation = async (locationId: string) => {
        const loadingKeyText = `location-${locationId}`;
        const loadingKeyImage = `image-${locationId}`;
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(loadingKeyText));
        setIsImageLoading(prev => new Set(prev).add(loadingKeyImage));
        try {
            const genreStr = richTextToString(localLore?.genre) || 'fantasía';
            const { name, description } = await generateLocation(genreStr);
            const imageB64 = await generateLocationImage(name, description, genreStr);

            setLocalLore(current => {
                if (!current) return current;
                const newLocations = current.locations.map(l => 
                    l.id === locationId ? { ...l, name: stringToRichText(name, 'ai'), description: stringToRichText(description, 'ai'), imageB64 } : l
                );
                return { ...current, locations: newLocations };
            });
        } catch (error: any) {
            console.error(`Error generating location ${locationId}:`, error);
            setApiError('Failed to generate location details. Please try again.');
        } finally {
             setIsFieldLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(loadingKeyText);
                return newSet;
            });
            setIsImageLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(loadingKeyImage);
                return newSet;
            });
        }
    };
    
    const handleAddSeason = () => {
        setLocalStory(current => {
            const story = current || EMPTY_STORY;
            const newSeasonNumber = story.seasons.length > 0 ? Math.max(...story.seasons.map(s => s.seasonNumber)) + 1 : 1;
            const newSeason: Season = {
                id: `season-${Date.now()}`,
                seasonNumber: newSeasonNumber,
                title: stringToRichText(`Temporada ${newSeasonNumber}`, 'user'),
                storyArcs: [],
            };
            return { ...story, seasons: [...story.seasons, newSeason] };
        });
    };

    const handleDeleteSeason = (seasonId: string) => {
        setLocalStory(current => {
            if (!current) return null;
            return { ...current, seasons: current.seasons.filter(s => s.id !== seasonId) };
        });
    };

    const handleAddStoryArc = (seasonId: string) => {
        setLocalStory(current => {
            if (!current) return null;
            const newSeasons = current.seasons.map(s => {
                if (s.id === seasonId) {
                    const newArc: StoryArc = {
                        id: `arc-${Date.now()}`,
                        title: stringToRichText(`Capítulo ${s.storyArcs.length + 1}`, 'user'),
                        storyCircle: [],
                    };
                    return { ...s, storyArcs: [...s.storyArcs, newArc] };
                }
                return s;
            });
            return { ...current, seasons: newSeasons };
        });
    };
    
    const handleDeleteStoryArc = (seasonId: string, arcId: string) => {
        setLocalStory(current => {
            if (!current) return null;
            const newSeasons = current.seasons.map(s => {
                if (s.id === seasonId) {
                    return { ...s, storyArcs: s.storyArcs.filter(a => a.id !== arcId) };
                }
                return s;
            });
            return { ...current, seasons: newSeasons };
        });
    };


    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex border-b border-panel-header bg-panel-header/80">
                <MainTabButton tabName="lore" label="Universo" activeTab={activeTab} setActiveTab={setActiveTab} />
                <MainTabButton tabName="story" label="Historia" activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div className="p-3 flex-grow overflow-y-auto">
                {activeTab === 'lore' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-condorito-brown">Universo (Lore)</h3>
                            <button onClick={() => handleGenerate('lore', { genreSuggestion: richTextToString(localLore?.genre) })} disabled={!!isLoading} className="relative overflow-hidden px-3 py-1.5 text-xs font-semibold bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border transition">
                              <span className="relative z-10">{isLoading === 'lore' ? 'Generating...' : '🎲 Randomizar'}</span>
                              {isLoading === 'lore' && <div className="absolute inset-0 loading-bar-shimmer"></div>}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleInitiateSaveLorePreset} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-wood text-white rounded-md hover:brightness-95 transition-colors"> Guardar Universo </button>
                            <button onClick={() => { setShowLorePresets(s => !s); setIsNamingLorePreset(false); }} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-gray text-white rounded-md hover:brightness-95 transition-colors"> {showLorePresets ? 'Ocultar' : 'Cargar Universo'} </button>
                        </div>

                        {isNamingLorePreset && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Guardar nuevo universo</h4> <input type="text" value={lorePresetNameInput} onChange={e => setLorePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveLorePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95">Confirmar</button> <button onClick={() => setIsNamingLorePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}

                        {showLorePresets && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Universos Guardados</h4> {lorePresets.length === 0 ? ( <p className="text-xs text-center text-condorito-brown py-2">No hay universos guardados.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {lorePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-panel-header group"> <button onClick={() => handleLoadLorePreset(preset.lore)} className="text-left text-xs text-condorito-brown flex-grow hover:text-condorito-red">{preset.name}</button> <button onClick={() => handleDeleteLorePreset(preset.name)} className="text-condorito-red opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-condorito-red/20" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}
                        
                        <div className="flex gap-2 p-1 bg-panel-header rounded-lg">
                            <SubTabButton label="Núcleo" active={activeSubTabs.lore === 'core'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'core'}))} />
                            <SubTabButton label="Lugares" active={activeSubTabs.lore === 'locations'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'locations'}))} />
                        </div>
                        {activeSubTabs.lore === 'core' && <div className="space-y-3 p-3 bg-panel-back rounded-b-lg">
                            <RichTextEditor isSingleLine label="Género" value={localLore?.genre} onChange={v => setLocalLore(l => ({...(l || EMPTY_LORE), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.genre')} isGenerating={isFieldLoading.has('lore.genre')} />
                            <RichTextEditor label="Reglas del Mundo" value={localLore?.rules} onChange={v => setLocalLore(l => ({...(l || EMPTY_LORE), rules: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.rules')} isGenerating={isFieldLoading.has('lore.rules')} />
                            <RichTextEditor label="Historia del Mundo" value={localLore?.history} onChange={v => setLocalLore(l => ({...(l || EMPTY_LORE), history: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.history')} isGenerating={isFieldLoading.has('lore.history')} />
                        </div>}
                        {activeSubTabs.lore === 'locations' && (
                            <div className="p-3 bg-panel-back rounded-b-lg space-y-4">
                                {(localLore?.locations || []).map((loc, index) => {
                                    const isImgLoading = isImageLoading.has(`image-${loc.id}`);
                                    const isTextLoading = isFieldLoading.has(`location-${loc.id}`);
                                    const isNameLoading = isFieldLoading.has(`location.name-${loc.id}`);
                                    const isDescLoading = isFieldLoading.has(`location.description-${loc.id}`);

                                    return (
                                        <div key={loc.id} className="p-3 border border-panel-header rounded-lg bg-white">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-xs text-condorito-red">Lugar #{index + 1}</h4>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleGenerateLocation(loc.id)} disabled={isTextLoading || isImgLoading} className="p-1.5 bg-condorito-red/10 text-condorito-red rounded-full hover:bg-condorito-red/20 disabled:bg-panel-header disabled:text-panel-border disabled:cursor-wait transition-colors" title="Randomizar Lugar y Imagen">
                                                        <DiceIcon className={`w-4 h-4 ${isTextLoading || isImgLoading ? 'animate-spin' : ''}`} />
                                                    </button>
                                                    <button onClick={() => handleDeleteLocation(loc.id)} className="p-1.5 text-gray-400 hover:bg-condorito-red/10 hover:text-condorito-red rounded-full transition-colors" title="Eliminar Lugar">
                                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-start">
                                                <div className="w-1/3 flex-shrink-0">
                                                    <div className="aspect-video w-full bg-panel-header rounded-md flex items-center justify-center relative overflow-hidden">
                                                        {isImgLoading && (
                                                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                                                <DiceIcon className="w-8 h-8 text-condorito-red animate-spin" />
                                                            </div>
                                                        )}
                                                        {loc.imageB64 && !isImgLoading ? (
                                                            <img src={`data:image/png;base64,${loc.imageB64}`} alt={richTextToString(loc.name)} className="w-full h-full object-cover" />
                                                        ) : (
                                                            !isImgLoading && (
                                                                <div className="text-center text-condorito-brown p-2">
                                                                    <ImageIcon className="w-10 h-10 mx-auto opacity-50" />
                                                                    <button onClick={() => handleGenerateImageForLocation(loc.id)} className="mt-2 text-xs bg-condorito-red text-white font-semibold px-2 py-1 rounded-md hover:brightness-95 transition">
                                                                        Generar Imagen
                                                                    </button>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                    {loc.imageB64 && !isImgLoading && (
                                                        <button
                                                            onClick={() => handleGenerateImageForLocation(loc.id)}
                                                            disabled={isImgLoading}
                                                            className="w-full mt-2 flex items-center justify-center gap-2 text-xs bg-condorito-red/10 text-condorito-red font-semibold px-2 py-1 rounded-md hover:bg-condorito-red/20 transition disabled:bg-gray-200 disabled:text-gray-500"
                                                        >
                                                            <DiceIcon className={`w-3 h-3 ${isImgLoading ? 'animate-spin' : ''}`} />
                                                            Regenerar Imagen
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="w-2/3 space-y-3">
                                                    <RichTextEditor
                                                        isSingleLine
                                                        label="Nombre del Lugar" 
                                                        value={loc.name}
                                                        onChange={v => {
                                                            setLocalLore(current => {
                                                                if (!current) return current;
                                                                const newLocations = current.locations.map(l => l.id === loc.id ? { ...l, name: v } : l);
                                                                return { ...current, locations: newLocations };
                                                            });
                                                        }}
                                                        onBlur={syncStateToParent}
                                                        onGenerate={() => handleGenerateLocationField(loc.id, 'location.name')}
                                                        isGenerating={isNameLoading}
                                                    />
                                                    <RichTextEditor
                                                        label="Descripción del Lugar" 
                                                        value={loc.description}
                                                        rows={4}
                                                        onChange={v => {
                                                            setLocalLore(current => {
                                                                if (!current) return current;
                                                                const newLocations = current.locations.map(l => l.id === loc.id ? { ...l, description: v } : l);
                                                                return { ...current, locations: newLocations };
                                                            });
                                                        }}
                                                        onBlur={syncStateToParent}
                                                        onGenerate={() => handleGenerateLocationField(loc.id, 'location.description')}
                                                        isGenerating={isDescLoading}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                <button onClick={handleAddLocation} className="w-full py-2 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95 transition-colors">+ Añadir Nuevo Lugar</button>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'story' && (
                     <div className="space-y-4">
                        <h3 className="font-bold text-sm text-condorito-brown">Historia</h3>
                        <div className="flex gap-2 p-1 bg-panel-header rounded-lg">
                            <SubTabButton label="Premisa" active={activeSubTabs.story === 'premise'} onClick={() => setActiveSubTabs(s => ({...s, story: 'premise'}))} />
                            <SubTabButton label="Estructura" active={activeSubTabs.story === 'structure'} onClick={() => setActiveSubTabs(s => ({...s, story: 'structure'}))} disabled={!localStory} />
                        </div>

                        {activeSubTabs.story === 'premise' && <div className="space-y-4 p-3 bg-panel-back rounded-b-lg">
                            <RichTextEditor isSingleLine label="Género de la Historia" value={localStory?.genre} onChange={v => setLocalStory(s => ({...(s || EMPTY_STORY), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('story.genre')} isGenerating={isFieldLoading.has('story.genre')}/>
                            <RichTextEditor label="Qué está en juego (Stakes)" value={localStory?.stakes} onChange={v => setLocalStory(s => ({...(s || EMPTY_STORY), stakes: v}))} onBlur={syncStateToParent} rows={2} onGenerate={() => handleGenerateField('story.stakes')} isGenerating={isFieldLoading.has('story.stakes')}/>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs text-condorito-brown">Personajes en la Historia</h4>
                                {characterProfiles.length === 0 ? (
                                    <p className="text-xs text-condorito-brown">Crea personajes en el <button onClick={() => togglePanel('CharacterEditor')} className="text-condorito-red hover:underline">Editor de Personajes</button> para poder añadirlos a la historia.</p>
                                ): characterProfiles.map(c => (
                                    <div key={c.id} className="flex items-center gap-2"><input type="checkbox" id={`char-check-${c.id}`} checked={localStory?.characterProfileIds.includes(c.id) || false} onChange={e => {
                                        const ids = localStory?.characterProfileIds || [];
                                        const newIds = e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id);
                                        setLocalStory(s => ({...(s || EMPTY_STORY), characterProfileIds: newIds}));
                                    }} onBlur={syncStateToParent} className="h-4 w-4 rounded border-panel-header text-condorito-red focus:ring-condorito-red" /><label htmlFor={`char-check-${c.id}`} className="select-none text-xs">{richTextToString(c.name)}</label></div>
                                ))}
                            </div>
                            <button onClick={() => handleGenerate('story', { characterIds: localStory?.characterProfileIds, genre: localStory?.genre, stakes: localStory?.stakes })} disabled={!lore || (localStory?.characterProfileIds || []).length === 0 || !!isLoading} className="w-full relative overflow-hidden bg-condorito-red text-white font-semibold py-2 rounded-md hover:brightness-95 disabled:bg-panel-border disabled:cursor-not-allowed transition">
                              <span className="relative z-10">{isLoading === 'story' ? 'Generando...' : '🎲 Generar Primera Trama'}</span>
                              {isLoading === 'story' && <div className="absolute inset-0 loading-bar-shimmer"></div>}
                            </button>
                        </div>}

                        {activeSubTabs.story === 'structure' && localStory && <div className="p-3 bg-panel-back rounded-b-lg space-y-4">
                            {localStory.seasons.map((season) => (
                                <div key={season.id} className="p-3 border border-panel-header rounded-lg bg-white space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-condorito-brown">T.{season.seasonNumber}:</span>
                                        <input 
                                            type="text"
                                            value={richTextToString(season.title)}
                                            onChange={e => {
                                                const newTitle = stringToRichText(e.target.value, 'user');
                                                setLocalStory(s => s ? ({ ...s, seasons: s.seasons.map(se => se.id === season.id ? { ...se, title: newTitle } : se) }) : null);
                                            }}
                                            onBlur={syncStateToParent}
                                            className="flex-grow p-1 border-b border-transparent hover:border-panel-header rounded-sm text-xs focus:ring-0 focus:border-condorito-red transition"
                                        />
                                        <button onClick={() => handleDeleteSeason(season.id)} className="p-1.5 text-gray-400 hover:bg-condorito-red/10 hover:text-condorito-red rounded-full transition-colors" title="Eliminar Temporada">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>

                                    <div className="pl-4 border-l-2 border-condorito-red/20 space-y-3">
                                        {season.storyArcs.map((arc, arcIndex) => (
                                            <div key={arc.id} className="p-2 border border-panel-header rounded-lg bg-panel-header/50">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-condorito-brown/80">C.{arcIndex + 1}:</span>
                                                    <input
                                                        type="text"
                                                        value={richTextToString(arc.title)}
                                                        onChange={e => {
                                                            const newTitle = stringToRichText(e.target.value, 'user');
                                                            setLocalStory(s => s ? ({ ...s, seasons: s.seasons.map(se => se.id === season.id ? { ...se, storyArcs: se.storyArcs.map(a => a.id === arc.id ? {...a, title: newTitle} : a) } : se) }) : null);
                                                        }}
                                                        onBlur={syncStateToParent}
                                                        className="flex-grow p-1 bg-transparent border-b border-transparent hover:border-panel-border focus:border-condorito-red focus:ring-0 text-xs"
                                                    />
                                                     <button onClick={() => handleDeleteStoryArc(season.id, arc.id)} className="p-1.5 text-gray-400 hover:bg-condorito-red/10 hover:text-condorito-red rounded-full transition-colors" title="Eliminar Capítulo">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </div>

                                                <div className="pt-3 mt-3 border-t border-panel-border">
                                                    {(arc.storyCircle && arc.storyCircle.length > 0) ? (
                                                        <div className="space-y-3">{arc.storyCircle.sort((a, b) => a.step - b.step).map(s => <div key={s.step}><strong className="text-xs uppercase font-bold text-condorito-red">{s.step}. {s.title}</strong><p className="text-xs text-condorito-brown mt-1">{s.description}</p></div>)}</div>
                                                    ) : (
                                                        <button onClick={() => handleGenerate('story', { ...localStory, seasonId: season.id, storyArcId: arc.id })} disabled={!!isLoading} className="w-full relative overflow-hidden bg-condorito-red/80 text-white font-semibold py-1.5 text-xs rounded-md hover:bg-condorito-red disabled:bg-panel-border disabled:cursor-not-allowed transition">
                                                            <span className="relative z-10">{isLoading === 'story' ? 'Generando...' : '🎲 Generar Trama'}</span>
                                                            {isLoading === 'story' && <div className="absolute inset-0 loading-bar-shimmer"></div>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                         <button onClick={() => handleAddStoryArc(season.id)} className="w-full py-1.5 text-xs font-semibold bg-condorito-green/80 text-white rounded-md hover:bg-condorito-green transition-colors">+ Añadir Capítulo</button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddSeason} className="w-full py-2 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95 transition-colors mt-4">+ Añadir Temporada</button>
                        </div>}
                    </div>
                )}
            </div>
        </div>
    )
};

export default React.memo(LoreEditor);