import React, { useState, useEffect, useCallback } from 'react';
import type { Lore, CharacterProfile, Story, Location } from '../types';
import { DiceIcon } from './icons';
import { generateNarrativeField, generateLocation } from '../services/geminiService';
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

type MainTab = 'lore' | 'story';
type LoreSubTab = 'core' | 'locations';
type StorySubTab = 'premise' | 'plot';

const LORE_PRESETS_STORAGE_KEY = 'universe-lore-presets';

interface LorePreset {
    name: string;
    lore: Lore;
}


// --- UI Components ---

const MainTabButton = ({ tabName, label, activeTab, setActiveTab }: { tabName: MainTab, label: string, activeTab: MainTab, setActiveTab: (tab: MainTab) => void}) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-[#8C5A3A] hover:bg-[#FDEFE2]/50 hover:text-[#593A2D]'}`}
    >{label}</button>
);

const SubTabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-red-500 text-white shadow-sm' : 'bg-[#FDEFE2] text-[#8C5A3A] hover:bg-[#D6A27E]'}`}>
        {label}
    </button>
);

const TextArea = ({ label, value, onChange, onBlur, rows=3, onGenerate, isGenerating }: {
    label:string,
    value:string | undefined,
    onChange:(val:string)=>void,
    onBlur: React.FocusEventHandler<HTMLTextAreaElement>,
    rows?:number,
    onGenerate?: () => void;
    isGenerating?: boolean;
}) => (
    <div>
        <label className="block text-xs font-semibold text-[#8C5A3A] mb-1">{label}</label>
        <div className="relative">
            <textarea 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                onBlur={onBlur} 
                rows={rows} 
                className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-[#FFFBF7] focus:bg-white focus:ring-1 focus:ring-red-500 transition" 
                style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }}
            />
             {onGenerate && (
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-[#FDEFE2] disabled:text-[#D6A27E] disabled:cursor-wait transition-colors"
                    aria-label={`Generate ${label}`}
                    title={`Generate ${label}`}
                >
                    <DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    </div>
);

const TextInput = ({ label, value, onChange, onBlur, onGenerate, isGenerating }: {
    label:string, 
    value:string | undefined, 
    onChange:(val:string)=>void, 
    onBlur: React.FocusEventHandler<HTMLInputElement>,
    onGenerate?: () => void,
    isGenerating?: boolean
}) => (
     <div>
        <label className="block text-xs font-semibold text-[#8C5A3A] mb-1">{label}</label>
        <div className="relative">
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                onBlur={onBlur} 
                className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-[#FFFBF7] focus:bg-white focus:ring-1 focus:ring-red-500 transition" 
                style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }}
            />
            {onGenerate && (
                 <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-[#FDEFE2] disabled:text-[#D6A27E] disabled:cursor-wait transition-colors"
                    aria-label={`Generate ${label}`}
                    title={`Generate ${label}`}
                >
                    <DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    </div>
);


const LoreEditor: React.FC<LoreEditorProps> = ({ lore, onLoreChange, characterProfiles, story, onStoryChange, onGenerateNarrativeElement, togglePanel, setApiError }) => {
    const [activeTab, setActiveTab] = useState<MainTab>('lore');
    const [activeSubTabs, setActiveSubTabs] = useState({ lore: 'core' as LoreSubTab, story: 'premise' as StorySubTab });
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isFieldLoading, setIsFieldLoading] = useState<Set<string>>(new Set());

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

            if (mainKey === 'lore') {
                setLocalLore(current => ({ ...(current || { genre: '', rules: '', locations: [], history: '' }), [subKey]: text }));
            } else if (mainKey === 'story') {
                 // FIX: Corrected state update logic to ensure a full Story object is always created.
                 setLocalStory(current => {
                    const baseStory: Story = current ?? { genre: '', stakes: '', characterProfileIds:[], storyCircle:[] };
                    return { ...baseStory, [subKey]: text };
                });
            }
            
        } catch (error: any) {
            console.error(`Error generating for field ${field}:`, error);
            const errorMessage = error.message || String(error);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                setApiError('You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline font-semibold">here</a>.');
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
    
    // --- Location Handlers ---
    const handleAddLocation = () => {
        const newLocation: Location = {
            id: `loc-${Date.now()}`,
            name: 'Nuevo Lugar',
            description: ''
        };
        setLocalLore(current => {
            if (!current) {
                return {
                    genre: '',
                    rules: '',
                    history: '',
                    locations: [newLocation]
                };
            }
            const newLocations = [...current.locations, newLocation];
            return { ...current, locations: newLocations };
        });
    };

    const handleDeleteLocation = (idToDelete: string) => {
        if (!localLore) return;
        const newLocations = localLore.locations.filter(l => l.id !== idToDelete);
        setLocalLore(current => ({...current!, locations: newLocations}));
    };

    const handleGenerateLocation = async (locationId: string) => {
        const loadingKey = `location-${locationId}`;
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(loadingKey));
        try {
            const result = await generateLocation(localLore?.genre || 'fantasía');
            setLocalLore(current => {
                if (!current) return current;
                const newLocations = current.locations.map(l => 
                    l.id === locationId ? { ...l, name: result.name, description: result.description } : l
                );
                return { ...current, locations: newLocations };
            });
        } catch (error: any) {
            console.error(`Error generating location ${locationId}:`, error);
            setApiError('Failed to generate location details. Please try again.');
        } finally {
            setIsFieldLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(loadingKey);
                return newSet;
            });
        }
    };


    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex border-b border-[#FDEFE2] bg-[#FDEFE2]/80">
                <MainTabButton tabName="lore" label="Universo" activeTab={activeTab} setActiveTab={setActiveTab} />
                <MainTabButton tabName="story" label="Historia" activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div className="p-3 flex-grow overflow-y-auto">
                {activeTab === 'lore' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-[#593A2D]">Universo (Lore)</h3>
                            <button onClick={() => handleGenerate('lore', { genreSuggestion: localLore?.genre })} disabled={!!isLoading} className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-[#D6A27E] transition">{isLoading === 'lore' ? '...' : '🎲 Randomizar'}</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleInitiateSaveLorePreset} className="w-full px-3 py-2 text-sm font-semibold bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"> Guardar Universo </button>
                            <button onClick={() => { setShowLorePresets(s => !s); setIsNamingLorePreset(false); }} className="w-full px-3 py-2 text-sm font-semibold bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"> {showLorePresets ? 'Ocultar' : 'Cargar Universo'} </button>
                        </div>

                        {isNamingLorePreset && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Guardar nuevo universo</h4> <input type="text" value={lorePresetNameInput} onChange={e => setLorePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-white focus:ring-1 focus:ring-red-500" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveLorePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-md hover:bg-green-600">Confirmar</button> <button onClick={() => setIsNamingLorePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}

                        {showLorePresets && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Universos Guardados</h4> {lorePresets.length === 0 ? ( <p className="text-xs text-center text-[#8C5A3A] py-2">No hay universos guardados.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {lorePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#FDEFE2] group"> <button onClick={() => handleLoadLorePreset(preset.lore)} className="text-left text-sm text-[#593A2D] flex-grow hover:text-red-600">{preset.name}</button> <button onClick={() => handleDeleteLorePreset(preset.name)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}
                        
                        <div className="flex gap-2 p-1 bg-[#FDEFE2] rounded-lg">
                            <SubTabButton label="Núcleo" active={activeSubTabs.lore === 'core'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'core'}))} />
                            <SubTabButton label="Lugares" active={activeSubTabs.lore === 'locations'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'locations'}))} />
                        </div>
                        {activeSubTabs.lore === 'core' && <div className="space-y-3 p-3 bg-[#FFFBF7] rounded-b-lg">
                            <TextInput label="Género" value={localLore?.genre} onChange={v => setLocalLore(l => ({...(l!), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.genre')} isGenerating={isFieldLoading.has('lore.genre')} />
                            <TextArea label="Reglas del Mundo" value={localLore?.rules} onChange={v => setLocalLore(l => ({...(l!), rules: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.rules')} isGenerating={isFieldLoading.has('lore.rules')} />
                            <TextArea label="Historia del Mundo" value={localLore?.history} onChange={v => setLocalLore(l => ({...(l!), history: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.history')} isGenerating={isFieldLoading.has('lore.history')} />
                        </div>}
                        {activeSubTabs.lore === 'locations' && (
                            <div className="p-3 bg-[#FFFBF7] rounded-b-lg space-y-4">
                                {(localLore?.locations || []).map((loc, index) => (
                                    <div key={loc.id} className="p-3 border border-[#FDEFE2] rounded-lg space-y-3 bg-white">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-sm text-red-700">Lugar #{index + 1}</h4>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleGenerateLocation(loc.id)} disabled={isFieldLoading.has(`location-${loc.id}`)} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-[#FDEFE2] disabled:text-[#D6A27E] disabled:cursor-wait transition-colors" title="Randomizar Lugar">
                                                    <DiceIcon className={`w-4 h-4 ${isFieldLoading.has(`location-${loc.id}`) ? 'animate-spin' : ''}`} />
                                                </button>
                                                <button onClick={() => handleDeleteLocation(loc.id)} className="p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors" title="Eliminar Lugar">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <TextInput 
                                            label="Nombre del Lugar" 
                                            value={loc.name}
                                            onChange={v => {
                                                if (!localLore) return;
                                                const newLocations = localLore.locations.map(l => l.id === loc.id ? { ...l, name: v } : l);
                                                setLocalLore(current => ({ ...current!, locations: newLocations }));
                                            }}
                                            onBlur={syncStateToParent}
                                        />
                                        <TextArea 
                                            label="Descripción del Lugar" 
                                            value={loc.description}
                                            rows={2}
                                            onChange={v => {
                                                if (!localLore) return;
                                                const newLocations = localLore.locations.map(l => l.id === loc.id ? { ...l, description: v } : l);
                                                setLocalLore(current => ({ ...current!, locations: newLocations }));
                                            }}
                                            onBlur={syncStateToParent}
                                        />
                                    </div>
                                ))}
                                <button onClick={handleAddLocation} className="w-full py-2 text-sm font-semibold bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">+ Añadir Nuevo Lugar</button>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'story' && (
                     <div className="space-y-4">
                        <h3 className="font-bold text-lg text-[#593A2D]">Historia</h3>
                        <div className="flex gap-2 p-1 bg-[#FDEFE2] rounded-lg">
                            <SubTabButton label="Premisa" active={activeSubTabs.story === 'premise'} onClick={() => setActiveSubTabs(s => ({...s, story: 'premise'}))} />
                            <SubTabButton label="Trama" active={activeSubTabs.story === 'plot'} onClick={() => setActiveSubTabs(s => ({...s, story: 'plot'}))} />
                        </div>

                        {activeSubTabs.story === 'premise' && <div className="space-y-4 p-3 bg-[#FFFBF7] rounded-b-lg">
                            {/* FIX: Corrected default object in setLocalStory to include all required properties of the Story type. */}
                            <TextInput label="Género de la Historia" value={localStory?.genre} onChange={v => setLocalStory(s => ({...(s || { genre: '', stakes: '', characterProfileIds:[], storyCircle:[] }), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('story.genre')} isGenerating={isFieldLoading.has('story.genre')}/>
                            {/* FIX: Corrected default object in setLocalStory to include all required properties of the Story type. */}
                            <TextArea label="Qué está en juego (Stakes)" value={localStory?.stakes} onChange={v => setLocalStory(s => ({...(s || { genre: '', stakes: '', characterProfileIds:[], storyCircle:[] }), stakes: v}))} onBlur={syncStateToParent} rows={2} onGenerate={() => handleGenerateField('story.stakes')} isGenerating={isFieldLoading.has('story.stakes')}/>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs text-[#8C5A3A]">Personajes en la Historia</h4>
                                {characterProfiles.length === 0 ? (
                                    <p className="text-xs text-[#8C5A3A]">Crea personajes en el <button onClick={() => togglePanel('CharacterEditor')} className="text-red-600 hover:underline">Editor de Personajes</button> para poder añadirlos a la historia.</p>
                                ): characterProfiles.map(c => (
                                    <div key={c.id} className="flex items-center gap-2"><input type="checkbox" id={`char-check-${c.id}`} checked={localStory?.characterProfileIds.includes(c.id) || false} onChange={e => {
                                        const ids = localStory?.characterProfileIds || [];
                                        const newIds = e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id);
                                        setLocalStory(s => ({...(s || { genre: '', stakes: '', storyCircle: [] }), characterProfileIds: newIds}));
                                    }} onBlur={syncStateToParent} className="h-4 w-4 rounded border-[#FDEFE2] text-red-600 focus:ring-red-500" /><label htmlFor={`char-check-${c.id}`} className="select-none text-sm">{c.name}</label></div>
                                ))}
                            </div>
                            <button onClick={() => handleGenerate('story', { characterIds: localStory?.characterProfileIds, genre: localStory?.genre, stakes: localStory?.stakes })} disabled={!lore || (localStory?.characterProfileIds || []).length === 0 || !!isLoading} className="w-full bg-red-500 text-white font-semibold py-2 rounded-md hover:bg-red-600 disabled:bg-[#D6A27E] disabled:cursor-not-allowed transition">{isLoading === 'story' ? 'Generando...' : '🎲 Generar Trama'}</button>
                        </div>}

                        {activeSubTabs.story === 'plot' && <div className="p-3 bg-[#FFFBF7] rounded-b-lg">
                            {story?.storyCircle ? <div className="space-y-3">
                                {story.storyCircle.sort((a,b) => a.step - b.step).map(s => <div key={s.step}><strong className="text-xs uppercase font-bold text-red-700">{s.step}. {s.title}</strong><p className="text-sm text-[#8C5A3A] mt-1">{s.description}</p></div>)}
                            </div> : <p className="text-sm text-center text-[#8C5A3A] py-4">Genere una premisa para ver la trama aquí.</p>}
                        </div>}
                    </div>
                )}
            </div>
        </div>
    )
};

export default React.memo(LoreEditor);