import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CharacterProfile, CharacterParams, CharacterParamKey, ColorParamKey } from '../types';
import { DiceIcon } from './icons';
import { generateNarrativeField, generateFullCharacterProfile } from '../services/geminiService';
import { PARAM_CONFIGS } from '../constants';
import Slider from './Slider';
import { generateRandomAppearanceParams, getRandomParamValue } from '../services/characterGenerationService';

interface CharacterEditorProps {
  lore: any;
  characterProfiles: CharacterProfile[];
  onCharacterProfilesChange: (profiles: CharacterProfile[] | ((prevProfiles: CharacterProfile[]) => CharacterProfile[])) => void;
  selectedCharId: string | null;
  onSelectedCharIdChange: (id: string | null) => void;
  onDeleteCharacter: (id: string) => void;
  onGenerateNarrativeElement: (elementType: 'character', context?: any) => Promise<any>;
  setApiError: (error: string | null) => void;
}

const APPEARANCE_PRESETS_STORAGE_KEY = 'character-appearance-presets';
const NARRATIVE_PRESETS_STORAGE_KEY = 'character-narrative-presets';

interface AppearancePreset {
  name: string;
  params: CharacterParams;
}

interface NarrativePreset {
  name: string;
  narrative: Omit<CharacterProfile, 'id' | 'characterParams'>;
}


type MainTab = 'narrative' | 'appearance';
type NarrativeSubTab = 'profile' | 'psychology' | 'backstory' | 'skills';
type AppearanceSubTab = 'head' | 'hair' | 'eyes' | 'body' | 'arms' | 'legs' | 'color';

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
    label:string, value:string | undefined, onChange:(val:string)=>void, onBlur: React.FocusEventHandler<HTMLTextAreaElement>, rows?:number, onGenerate?: () => void; isGenerating?: boolean;
}) => (
    <div>
        <label className="block text-xs font-semibold text-[#8C5A3A] mb-1">{label}</label>
        <div className="relative">
            <textarea value={value || ''} onChange={e => onChange(e.target.value)} onBlur={onBlur} rows={rows} className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-[#FFFBF7] focus:bg-white focus:ring-1 focus:ring-red-500 transition" style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }} />
             {onGenerate && (<button onClick={onGenerate} disabled={isGenerating} className="absolute top-1.5 right-1.5 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-[#FDEFE2] disabled:text-[#D6A27E] disabled:cursor-wait transition-colors" aria-label={`Generate ${label}`} title={`Generate ${label}`}><DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /></button>)}
        </div>
    </div>
);

const TextInput = ({ label, value, onChange, onBlur, onGenerate, isGenerating }: {
    label:string, value:string | undefined, onChange:(val:string)=>void, onBlur: React.FocusEventHandler<HTMLInputElement>, onGenerate?: () => void, isGenerating?: boolean
}) => (
     <div>
        <label className="block text-xs font-semibold text-[#8C5A3A] mb-1">{label}</label>
        <div className="relative">
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} onBlur={onBlur} className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-[#FFFBF7] focus:bg-white focus:ring-1 focus:ring-red-500 transition" style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }}/>
            {onGenerate && (<button onClick={onGenerate} disabled={isGenerating} className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-[#FDEFE2] disabled:text-[#D6A27E] disabled:cursor-wait transition-colors" aria-label={`Generate ${label}`} title={`Generate ${label}`}><DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /></button>)}
        </div>
    </div>
);

const ColorInput = ({ label, value, onChange, onRandomize }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRandomize: () => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
        <label className="font-medium text-[#8C5A3A] select-none">{label}</label>
        <div className="flex items-center gap-2">
            <input type="color" value={value} onChange={onChange} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
            <button
                onClick={onRandomize}
                className="p-1 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const ShapeSelector = ({ label, value, options, onChange, onRandomize }: { label: string, value: string, options: string[], onChange: (value: string) => void, onRandomize: () => void }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="font-medium text-[#8C5A3A] select-none text-sm">{label}</label>
            <button
                onClick={onRandomize}
                className="p-1 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
        </div>
      <div className="grid grid-cols-3 gap-1 w-full bg-[#FDEFE2] rounded-lg p-1">
        {options.map(option => (
          <button key={option} onClick={() => onChange(option)} className={`w-full py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${value === option ? 'bg-white text-red-600 shadow-sm' : 'text-[#8C5A3A] hover:bg-[#D6A27E]'}`}>
            {option.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
);

const CheckboxControl = ({ label, checked, onChange, onRandomize }: { label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRandomize: () => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
        <label htmlFor={label} className="font-medium text-[#8C5A3A] select-none">{label}</label>
        <div className="flex items-center gap-2">
            <input type="checkbox" id={label} checked={checked} onChange={onChange} className="h-5 w-5 rounded-md border-[#FDEFE2] text-red-500 focus:ring-red-400 cursor-pointer" />
            <button
                onClick={onRandomize}
                className="p-1 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);


const CharacterEditor: React.FC<CharacterEditorProps> = ({ lore, characterProfiles, onCharacterProfilesChange, selectedCharId, onSelectedCharIdChange, onDeleteCharacter, onGenerateNarrativeElement, setApiError }) => {
    const [activeMainTab, setActiveMainTab] = useState<MainTab>('narrative');
    const [activeNarrativeSubTab, setActiveNarrativeSubTab] = useState<NarrativeSubTab>('profile');
    const [activeAppearanceSubTab, setActiveAppearanceSubTab] = useState<AppearanceSubTab>('head');

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFieldLoading, setIsFieldLoading] = useState<Set<string>>(new Set());
    const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
    const [limbSymmetry, setLimbSymmetry] = useState(true);

    // --- Appearance Presets State ---
    const [appearancePresets, setAppearancePresets] = useState<AppearancePreset[]>([]);
    const [showAppearancePresets, setShowAppearancePresets] = useState(false);
    const [isNamingAppearancePreset, setIsNamingAppearancePreset] = useState(false);
    const [appearancePresetNameInput, setAppearancePresetNameInput] = useState('');

    // --- Narrative Presets State ---
    const [narrativePresets, setNarrativePresets] = useState<NarrativePreset[]>([]);
    const [showNarrativePresets, setShowNarrativePresets] = useState(false);
    const [isNamingNarrativePreset, setIsNamingNarrativePreset] = useState(false);
    const [narrativePresetNameInput, setNarrativePresetNameInput] = useState('');

    const selectedChar = useMemo(() => characterProfiles.find(c => c.id === selectedCharId), [characterProfiles, selectedCharId]);
    
    useEffect(() => {
        if (characterProfiles.length > 0) {
            const currentSelectionExists = characterProfiles.some(c => c.id === selectedCharId);
            if (!selectedCharId || !currentSelectionExists) {
                onSelectedCharIdChange(characterProfiles[characterProfiles.length - 1].id);
            }
        } else {
            onSelectedCharIdChange(null);
        }
    }, [characterProfiles, selectedCharId, onSelectedCharIdChange]);

    useEffect(() => {
      try {
        const stored = localStorage.getItem(APPEARANCE_PRESETS_STORAGE_KEY);
        if (stored) setAppearancePresets(JSON.parse(stored));
      } catch (error) { console.error("Failed to load appearance presets", error); }
      
      try {
        const stored = localStorage.getItem(NARRATIVE_PRESETS_STORAGE_KEY);
        if (stored) setNarrativePresets(JSON.parse(stored));
      } catch (error) { console.error("Failed to load narrative presets", error); }
    }, []);

    const updateCurrentChar = useCallback((updater: (char: CharacterProfile) => CharacterProfile) => {
        if (!selectedCharId) return;
        onCharacterProfilesChange(prevProfiles => 
            prevProfiles.map(c => c.id === selectedCharId ? updater(c) : c)
        );
    }, [selectedCharId, onCharacterProfilesChange]);


    const handleParamChange = (param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => {
        updateCurrentChar(char => {
            if (!char.characterParams) return char;
            const newParams = { ...char.characterParams };
            if (limbSymmetry) {
                if (param === 'lArmWidth') newParams.rArmWidth = value as number; else if (param === 'rArmWidth') newParams.lArmWidth = value as number;
                else if (param === 'lHandSize') newParams.rHandSize = value as number; else if (param === 'rHandSize') newParams.lHandSize = value as number;
                else if (param === 'lLegWidth') newParams.rLegWidth = value as number; else if (param === 'rLegWidth') newParams.lLegWidth = value as number;
                else if (param === 'lFootSize') newParams.rFootSize = value as number; else if (param === 'rFootSize') newParams.lFootSize = value as number;
                else if (param === 'lArmAngle') newParams.rArmAngle = value as number; else if (param === 'rArmAngle') newParams.lArmAngle = value as number;
                else if (param === 'lArmBend') newParams.rArmBend = -(value as number); else if (param === 'rArmBend') newParams.lArmBend = -(value as number);
                else if (param === 'lLegAngle') newParams.rLegAngle = value as number; else if (param === 'rLegAngle') newParams.lLegAngle = value as number;
                else if (param === 'lLegBend') newParams.rLegBend = -(value as number); else if (param === 'rLegBend') newParams.lLegBend = -(value as number);
            }
            (newParams as any)[param] = value;
            return { ...char, characterParams: newParams };
        });
    };
    
    const handleRandomizeParam = (param: CharacterParamKey | ColorParamKey) => {
        const newValue = getRandomParamValue(param, selectedChar?.characterParams);
        handleParamChange(param, newValue);
    };

    const handleRandomizeAppearance = () => {
        updateCurrentChar(char => ({ ...char, characterParams: generateRandomAppearanceParams(char.characterParams) }));
    };

    // --- Appearance Preset Handlers ---
    const handleInitiateSaveAppearancePreset = () => {
        if (!selectedChar || !selectedChar.characterParams) return;
        setIsNamingAppearancePreset(true);
        setAppearancePresetNameInput('');
        setShowAppearancePresets(false);
    };

    const handleConfirmSaveAppearancePreset = useCallback(() => {
        if (!appearancePresetNameInput.trim() || !selectedChar || !selectedChar.characterParams) return;
        const presetName = appearancePresetNameInput.trim();
        const newPreset: AppearancePreset = { name: presetName, params: selectedChar.characterParams };
        setAppearancePresets(prev => {
            const existingIndex = prev.findIndex(p => p.name.toLowerCase() === presetName.toLowerCase());
            const newPresets = [...prev];
            if (existingIndex > -1) { newPresets[existingIndex] = newPreset; } else { newPresets.push(newPreset); }
            try {
                const sorted = newPresets.sort((a, b) => a.name.localeCompare(b.name));
                localStorage.setItem(APPEARANCE_PRESETS_STORAGE_KEY, JSON.stringify(sorted));
                return sorted;
            } catch (error) { console.error("Failed to save appearance preset", error); return prev; }
        });
        setIsNamingAppearancePreset(false);
    }, [appearancePresetNameInput, selectedChar]);

    const handleLoadAppearancePreset = useCallback((presetParams: CharacterParams) => {
        updateCurrentChar(char => ({ ...char, characterParams: { ...presetParams } }));
        setShowAppearancePresets(false);
    }, [updateCurrentChar]);

    const handleDeleteAppearancePreset = useCallback((presetName: string) => {
        if (!confirm(`Delete appearance preset "${presetName}"?`)) return;
        setAppearancePresets(prev => {
            const newPresets = prev.filter(p => p.name !== presetName);
            try { localStorage.setItem(APPEARANCE_PRESETS_STORAGE_KEY, JSON.stringify(newPresets)); } catch (error) { console.error("Failed to delete appearance preset", error); }
            return newPresets;
        });
    }, []);

    // --- Narrative Preset Handlers ---
    const handleInitiateSaveNarrativePreset = () => {
        if (!selectedChar) return;
        setIsNamingNarrativePreset(true);
        setNarrativePresetNameInput('');
        setShowNarrativePresets(false);
    };

    const handleConfirmSaveNarrativePreset = useCallback(() => {
        if (!narrativePresetNameInput.trim() || !selectedChar) return;
        const presetName = narrativePresetNameInput.trim();
        const { id, characterParams, ...narrativeData } = selectedChar;
        const newPreset: NarrativePreset = { name: presetName, narrative: narrativeData };
        setNarrativePresets(prev => {
            const existingIndex = prev.findIndex(p => p.name.toLowerCase() === presetName.toLowerCase());
            const newPresets = [...prev];
            if (existingIndex > -1) { newPresets[existingIndex] = newPreset; } else { newPresets.push(newPreset); }
            try {
                const sorted = newPresets.sort((a,b) => a.name.localeCompare(b.name));
                localStorage.setItem(NARRATIVE_PRESETS_STORAGE_KEY, JSON.stringify(sorted));
                return sorted;
            } catch(e) { console.error("Failed to save narrative presets", e); return prev; }
        });
        setIsNamingNarrativePreset(false);
    }, [narrativePresetNameInput, selectedChar]);

    const handleLoadNarrativePreset = useCallback((narrative: Omit<CharacterProfile, 'id' | 'characterParams'>) => {
        updateCurrentChar(char => ({ ...char, ...narrative }));
        setShowNarrativePresets(false);
    }, [updateCurrentChar]);
    
    const handleDeleteNarrativePreset = useCallback((presetName: string) => {
        if (!confirm(`Delete narrative preset "${presetName}"?`)) return;
        setNarrativePresets(prev => {
            const newPresets = prev.filter(p => p.name !== presetName);
            try { localStorage.setItem(NARRATIVE_PRESETS_STORAGE_KEY, JSON.stringify(newPresets)); } catch(e) { console.error("Failed to delete narrative preset", e); }
            return newPresets;
        });
    }, []);

    const handleGenerateCharacter = async () => {
        setIsLoading(true);
        try { await onGenerateNarrativeElement('character'); } finally { setIsLoading(false); }
    };
    
    const handleDeleteClick = () => {
        if (!selectedCharId) return;
        if (window.confirm(`Are you sure you want to delete ${selectedChar?.name || 'this character'}?`)) {
            onDeleteCharacter(selectedCharId);
        }
    }

    const handleGenerateField = useCallback(async (field: string) => {
        const charToUpdate = selectedChar;
        if (!charToUpdate) return;
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(field));
        try {
            const { text } = await generateNarrativeField(field, { lore, character: charToUpdate });
            const [mainKey, subKey, ...rest] = field.split('.');

            if (mainKey === 'character') {
                updateCurrentChar(char => {
                    const updatedChar = JSON.parse(JSON.stringify(char));
                    if (rest.length > 0) { updatedChar[subKey][rest[0]] = text; } else { updatedChar[subKey] = text; }
                    return updatedChar;
                });
            }
        } catch (error: any) {
            console.error(`Error generating for field ${field}:`, error);
            setApiError(`Failed to generate ${field}: ${error.message}`);
        } finally {
            setIsFieldLoading(prev => { const newSet = new Set(prev); newSet.delete(field); return newSet; });
        }
    }, [lore, selectedChar, setApiError, updateCurrentChar]);

    const handleGenerateAllFields = async () => {
        const charToUpdate = selectedChar;
        if (!charToUpdate) return;
        setIsGeneratingAll(true);
        setApiError(null);
        try {
            const narrativeProfile = await generateFullCharacterProfile(charToUpdate, lore);
            const fullProfile = { ...charToUpdate, ...narrativeProfile };
            onCharacterProfilesChange(characterProfiles.map(p => p.id === charToUpdate.id ? fullProfile : p));
        } catch (error: any) {
            console.error("Error generating full character profile:", error);
            setApiError(`Failed to randomize profile: ${error.message}`);
        } finally {
            setIsGeneratingAll(false);
        }
    };
    
    const currentParams = selectedChar?.characterParams;
    const maxMouthBend = currentParams ? 380 - 4 * currentParams.mouthWidthRatio : 100;
    const maxFringeHeightRatio = (() => { if (!currentParams) return 100; const { headHeight, eyeSizeRatio } = currentParams; const margin = 5; const headTopY = 120 - headHeight / 2; const eyeTopY = 120 - (headHeight * (eyeSizeRatio / 100)); const maxFringeHeightPx = eyeTopY - headTopY - margin; const maxRatio = Math.max(0, (maxFringeHeightPx / headHeight) * 100); return isNaN(maxRatio) ? 100 : maxRatio; })();


    return (
        <div className="flex flex-col h-full bg-white space-y-2">
            <div className="flex gap-2 p-1">
               <select value={selectedCharId || ''} onChange={e => onSelectedCharIdChange(e.target.value) } className="flex-grow p-2 border border-[#FDEFE2] rounded-md text-sm bg-white focus:ring-1 focus:ring-red-500">
                   {characterProfiles.length === 0 && <option value="" disabled>-- Cree un personaje --</option>}
                   {characterProfiles.map(c => <option key={c.id} value={c.id}>{c.name || 'Personaje sin nombre'}</option>)}
               </select>
               <button onClick={handleGenerateCharacter} disabled={isLoading} className="w-10 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-[#D6A27E] text-xl font-bold flex items-center justify-center transition" title="Añadir nuevo personaje">+</button>
               <button onClick={handleDeleteClick} disabled={!selectedCharId} className="w-10 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-[#D6A27E] text-xl font-bold flex items-center justify-center transition" title="Eliminar personaje seleccionado">-</button>
            </div>
            {selectedChar ? (
                <>
                <div className="flex border-b border-[#FDEFE2] bg-[#FDEFE2]/80">
                    <MainTabButton tabName="narrative" label="Narrativa" activeTab={activeMainTab} setActiveTab={setActiveMainTab} />
                    <MainTabButton tabName="appearance" label="Apariencia" activeTab={activeMainTab} setActiveTab={setActiveMainTab} />
                </div>
                
                {activeMainTab === 'narrative' && <div className="space-y-3 p-1">
                    <div className="flex gap-2 p-1 bg-[#FDEFE2] rounded-lg">
                       <SubTabButton label="Perfil" active={activeNarrativeSubTab === 'profile'} onClick={() => setActiveNarrativeSubTab('profile')} />
                       <SubTabButton label="Psicología" active={activeNarrativeSubTab === 'psychology'} onClick={() => setActiveNarrativeSubTab('psychology')} />
                       <SubTabButton label="Trasfondo" active={activeNarrativeSubTab === 'backstory'} onClick={() => setActiveNarrativeSubTab('backstory')} />
                       <SubTabButton label="Habilidades" active={activeNarrativeSubTab === 'skills'} onClick={() => setActiveNarrativeSubTab('skills')} />
                    </div>
                    <button onClick={handleGenerateAllFields} disabled={isGeneratingAll || isFieldLoading.size > 0} className="w-full relative overflow-hidden flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-[#D6A27E] transition">
                        <span className={`${isGeneratingAll ? 'opacity-0' : 'opacity-100'} transition-opacity flex items-center justify-center gap-2`}>
                            <DiceIcon className="w-4 h-4" />
                            Randomizar Perfil
                        </span>
                        {isGeneratingAll && <div className="absolute inset-0 bg-white/30 loading-bar-animation"></div>}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleInitiateSaveNarrativePreset} className="w-full px-3 py-2 text-sm font-semibold bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"> Guardar Narrativa </button>
                        <button onClick={() => { setShowNarrativePresets(s => !s); setIsNamingNarrativePreset(false); }} className="w-full px-3 py-2 text-sm font-semibold bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"> {showNarrativePresets ? 'Ocultar' : 'Cargar Narrativa'} </button>
                    </div>

                    {isNamingNarrativePreset && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Guardar nueva narrativa</h4> <input type="text" value={narrativePresetNameInput} onChange={e => setNarrativePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-white focus:ring-1 focus:ring-red-500" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveNarrativePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-md hover:bg-green-600">Confirmar</button> <button onClick={() => setIsNamingNarrativePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}
                    {showNarrativePresets && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Narrativas Guardadas</h4> {narrativePresets.length === 0 ? ( <p className="text-xs text-center text-[#8C5A3A] py-2">No hay narrativas guardadas.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {narrativePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#FDEFE2] group"> <button onClick={() => handleLoadNarrativePreset(preset.narrative)} className="text-left text-sm text-[#593A2D] flex-grow hover:text-red-600">{preset.name}</button> <button onClick={() => handleDeleteNarrativePreset(preset.name)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}

                    <div className="space-y-3 p-3 bg-[#FFFBF7] rounded-b-lg flex-grow overflow-y-auto">
                        {activeNarrativeSubTab === 'profile' && <>
                            <TextInput label="Nombre" value={selectedChar.name} onChange={v => updateCurrentChar(c => ({...c, name: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.name')} isGenerating={isFieldLoading.has('character.name')} />
                            <TextInput label="Edad" value={selectedChar.age} onChange={v => updateCurrentChar(c => ({...c, age: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.age')} isGenerating={isFieldLoading.has('character.age')} />
                            <TextInput label="Especie" value={selectedChar.species} onChange={v => updateCurrentChar(c => ({...c, species: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.species')} isGenerating={isFieldLoading.has('character.species')} />
                            <TextInput label="Ocupación" value={selectedChar.occupation} onChange={v => updateCurrentChar(c => ({...c, occupation: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.occupation')} isGenerating={isFieldLoading.has('character.occupation')} />
                        </>}
                        {activeNarrativeSubTab === 'psychology' && <>
                            <TextInput label="Arquetipo" value={selectedChar.psychology.archetype} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, archetype: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.psychology.archetype')} isGenerating={isFieldLoading.has('character.psychology.archetype')} />
                            <TextArea label="Motivación" value={selectedChar.psychology.motivation} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, motivation: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.motivation')} isGenerating={isFieldLoading.has('character.psychology.motivation')} />
                            <TextArea label="Miedo" value={selectedChar.psychology.fear} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, fear: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.fear')} isGenerating={isFieldLoading.has('character.psychology.fear')} />
                            <TextArea label="Virtudes" value={selectedChar.psychology.virtues} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, virtues: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.virtues')} isGenerating={isFieldLoading.has('character.psychology.virtues')} />
                            <TextArea label="Defectos" value={selectedChar.psychology.flaws} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, flaws: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.flaws')} isGenerating={isFieldLoading.has('character.psychology.flaws')} />
                        </>}
                        {activeNarrativeSubTab === 'backstory' && <>
                            <TextArea label="Origen" value={selectedChar.backstory.origin} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, origin: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.origin')} isGenerating={isFieldLoading.has('character.backstory.origin')}/>
                            <TextArea label="Herida (Trauma)" value={selectedChar.backstory.wound} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, wound: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.wound')} isGenerating={isFieldLoading.has('character.backstory.wound')}/>
                            <TextArea label="Camino / Viaje" value={selectedChar.backstory.journey} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, journey: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.journey')} isGenerating={isFieldLoading.has('character.backstory.journey')}/>
                            <TextArea label="Estado Inicial" value={selectedChar.backstory.initialState} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, initialState: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.initialState')} isGenerating={isFieldLoading.has('character.backstory.initialState')}/>
                        </>}
                         {activeNarrativeSubTab === 'skills' && <>
                            <TextArea label="Habilidades y Talentos" value={selectedChar.skills} onChange={v => updateCurrentChar(c => ({...c, skills: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.skills')} isGenerating={isFieldLoading.has('character.skills')}/>
                            <TextArea label="Limitaciones y Debilidades" value={selectedChar.limitations} onChange={v => updateCurrentChar(c => ({...c, limitations: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.limitations')} isGenerating={isFieldLoading.has('character.limitations')}/>
                        </>}
                    </div>
                </div>}

                {activeMainTab === 'appearance' && currentParams && <div className="space-y-3 p-1">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-[#FDEFE2] rounded-lg">
                        <SubTabButton label="Cabeza" active={activeAppearanceSubTab === 'head'} onClick={() => setActiveAppearanceSubTab('head')} />
                        <SubTabButton label="Pelo" active={activeAppearanceSubTab === 'hair'} onClick={() => setActiveAppearanceSubTab('hair')} />
                        <SubTabButton label="Ojos" active={activeAppearanceSubTab === 'eyes'} onClick={() => setActiveAppearanceSubTab('eyes')} />
                        <SubTabButton label="Cuerpo" active={activeAppearanceSubTab === 'body'} onClick={() => setActiveAppearanceSubTab('body')} />
                        <SubTabButton label="Brazos" active={activeAppearanceSubTab === 'arms'} onClick={() => setActiveAppearanceSubTab('arms')} />
                        <SubTabButton label="Piernas" active={activeAppearanceSubTab === 'legs'} onClick={() => setActiveAppearanceSubTab('legs')} />
                        <SubTabButton label="Color" active={activeAppearanceSubTab === 'color'} onClick={() => setActiveAppearanceSubTab('color')} />
                    </div>
                    <button onClick={handleRandomizeAppearance} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-[#D6A27E] transition">
                        <DiceIcon className="w-4 h-4" />
                        Randomize Apariencia
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleInitiateSaveAppearancePreset} className="w-full px-3 py-2 text-sm font-semibold bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"> Guardar Apariencia </button>
                        <button onClick={() => { setShowAppearancePresets(s => !s); setIsNamingAppearancePreset(false); }} className="w-full px-3 py-2 text-sm font-semibold bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"> {showAppearancePresets ? 'Ocultar' : 'Cargar Apariencia'} </button>
                    </div>

                    {isNamingAppearancePreset && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Guardar nueva apariencia</h4> <input type="text" value={appearancePresetNameInput} onChange={e => setAppearancePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-[#FDEFE2] rounded-md text-sm bg-white focus:ring-1 focus:ring-red-500" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveAppearancePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-md hover:bg-green-600">Confirmar</button> <button onClick={() => setIsNamingAppearancePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}
                    {showAppearancePresets && ( <div className="p-3 bg-[#FFFBF7] rounded-lg border border-[#FDEFE2] space-y-2"> <h4 className="font-semibold text-sm text-[#8C5A3A]">Apariencias Guardadas</h4> {appearancePresets.length === 0 ? ( <p className="text-xs text-center text-[#8C5A3A] py-2">No hay apariencias guardadas.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {appearancePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#FDEFE2] group"> <button onClick={() => handleLoadAppearancePreset(preset.params)} className="text-left text-sm text-[#593A2D] flex-grow hover:text-red-600">{preset.name}</button> <button onClick={() => handleDeleteAppearancePreset(preset.name)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}

                    <div className="space-y-3 p-3 bg-[#FFFBF7] rounded-b-lg flex-grow overflow-y-auto">
                      {activeAppearanceSubTab === 'head' && <div className="space-y-4"> {(['headWidth', 'headHeight', 'mouthWidthRatio', 'mouthYOffsetRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <Slider {...PARAM_CONFIGS.mouthBend} min={-Math.round(maxMouthBend)} max={Math.round(maxMouthBend)} value={currentParams.mouthBend} onChange={(e) => handleParamChange('mouthBend', Number(e.target.value))} onRandomize={() => handleRandomizeParam('mouthBend')} /> <div className="pt-4 border-t border-[#FDEFE2] space-y-3"> <ShapeSelector label="Head Shape" value={currentParams.headShape} options={['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => handleParamChange('headShape', v)} onRandomize={() => handleRandomizeParam('headShape')} /> {(currentParams.headShape === 'square') && ( <Slider {...PARAM_CONFIGS.headCornerRadius} value={currentParams.headCornerRadius} onChange={(e) => handleParamChange('headCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('headCornerRadius')} /> )} {(currentParams.headShape === 'triangle' || currentParams.headShape === 'inverted-triangle') && ( <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={currentParams.triangleCornerRadius} onChange={(e) => handleParamChange('triangleCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('triangleCornerRadius')} /> )} </div> </div>}
                      {activeAppearanceSubTab === 'hair' && <div className="space-y-4"> <CheckboxControl label="Enable Hair" checked={currentParams.hair} onChange={e => handleParamChange('hair', e.target.checked)} onRandomize={() => handleRandomizeParam('hair')} /> {currentParams.hair && ( <div className="pt-4 border-t border-[#FDEFE2] space-y-4"> {(['backHairWidthRatio', 'backHairHeightRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <Slider {...PARAM_CONFIGS.fringeHeightRatio} max={Math.floor(maxFringeHeightRatio)} value={currentParams.fringeHeightRatio} onChange={(e) => handleParamChange('fringeHeightRatio', Number(e.target.value))} onRandomize={() => handleRandomizeParam('fringeHeightRatio')} /> </div> )} </div>}
                      {activeAppearanceSubTab === 'eyes' && <div className="space-y-4"> {(['eyeSizeRatio', 'eyeSpacingRatio', 'pupilSizeRatio', 'upperEyelidCoverage', 'lowerEyelidCoverage', 'eyebrowWidthRatio', 'eyebrowHeightRatio', 'eyebrowYOffsetRatio', 'eyebrowAngle'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <div className="pt-4 border-t border-[#FDEFE2] space-y-3"> <CheckboxControl label="Eyelashes" checked={currentParams.eyelashes} onChange={e => handleParamChange('eyelashes', e.target.checked)} onRandomize={() => handleRandomizeParam('eyelashes')} /> {currentParams.eyelashes && ( <div className="pl-2 border-l-2 border-red-200 space-y-4"> {(['eyelashCount', 'eyelashLength', 'eyelashAngle'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> )} </div> </div>}
                      {activeAppearanceSubTab === 'body' && <div className="space-y-4"> {(['neckHeight', 'neckWidthRatio', 'torsoHeight', 'torsoWidth', 'pelvisHeight', 'pelvisWidthRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <div className="pt-4 border-t border-[#FDEFE2] space-y-3"> <ShapeSelector label="Torso Shape" value={currentParams.torsoShape} options={['rectangle', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => handleParamChange('torsoShape', v)} onRandomize={() => handleRandomizeParam('torsoShape')} /> {(currentParams.torsoShape === 'square' || currentParams.torsoShape === 'rectangle') && ( <Slider {...PARAM_CONFIGS.torsoCornerRadius} value={currentParams.torsoCornerRadius} onChange={(e) => handleParamChange('torsoCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('torsoCornerRadius')} /> )} {(currentParams.torsoShape === 'triangle' || currentParams.torsoShape === 'inverted-triangle') && ( <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={currentParams.triangleCornerRadius} onChange={(e) => handleParamChange('triangleCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('triangleCornerRadius')} /> )} </div> <div className="pt-4 border-t border-[#FDEFE2] space-y-3"> <ShapeSelector label="Pelvis Shape" value={currentParams.pelvisShape} options={['rectangle', 'horizontal-oval']} onChange={(v) => handleParamChange('pelvisShape', v)} onRandomize={() => handleRandomizeParam('pelvisShape')} /> </div> </div>}
                      {activeAppearanceSubTab === 'arms' && <div className="space-y-4"> <Slider {...PARAM_CONFIGS['armLength']} value={currentParams['armLength']} onChange={(e) => handleParamChange('armLength', Number(e.target.value))} onRandomize={() => handleRandomizeParam('armLength')} /> <div className="pt-4 border-t border-[#FDEFE2] space-y-3"> <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]"> <label htmlFor="limbSymmetry" className="font-medium text-[#8C5A3A] select-none">Symmetry</label> <input type="checkbox" id="limbSymmetry" checked={limbSymmetry} onChange={e => setLimbSymmetry(e.target.checked)} className="h-5 w-5 rounded-md border-[#FDEFE2] text-red-500 focus:ring-red-400 cursor-pointer" /> </div> </div> <div className="pt-4 border-t border-[#FDEFE2] space-y-4"> {(['lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize', 'lArmAngle', 'lArmBend', 'rArmAngle', 'rArmBend'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k] as number} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> </div>}
                      {activeAppearanceSubTab === 'legs' && <div className="space-y-4"> <Slider {...PARAM_CONFIGS['legLength']} value={currentParams['legLength']} onChange={(e) => handleParamChange('legLength', Number(e.target.value))} onRandomize={() => handleRandomizeParam('legLength')} /> <div className="pt-4 border-t border-[#FDEFE2] space-y-4"> {(['lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize', 'lLegAngle', 'lLegBend', 'rLegAngle', 'rLegBend'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k] as number} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> </div>}
                      {activeAppearanceSubTab === 'color' && <div className="space-y-3">
                        <CheckboxControl label="Body Outlines" checked={currentParams.bodyOutlines} onChange={e => handleParamChange('bodyOutlines', e.target.checked)} onRandomize={() => handleRandomizeParam('bodyOutlines')} />
                        <CheckboxControl label="Eye Outlines" checked={currentParams.eyeOutlines} onChange={e => handleParamChange('eyeOutlines', e.target.checked)} onRandomize={() => handleRandomizeParam('eyeOutlines')} />
                        <div className="pt-2 border-t border-[#FDEFE2]" />
                        <ColorInput label="Body" value={currentParams.bodyColor} onChange={e => handleParamChange('bodyColor', e.target.value)} onRandomize={() => handleRandomizeParam('bodyColor')} />
                        <ColorInput label="Hair" value={currentParams.hairColor} onChange={e => handleParamChange('hairColor', e.target.value)} onRandomize={() => handleRandomizeParam('hairColor')} />
                        <ColorInput label="Outline" value={currentParams.outlineColor} onChange={e => handleParamChange('outlineColor', e.target.value)} onRandomize={() => handleRandomizeParam('outlineColor')} />
                        <ColorInput label="Pupil" value={currentParams.pupilColor} onChange={e => handleParamChange('pupilColor', e.target.value)} onRandomize={() => handleRandomizeParam('pupilColor')} />
                        <ColorInput label="Iris" value={currentParams.irisColor} onChange={e => handleParamChange('irisColor', e.target.value)} onRandomize={() => handleRandomizeParam('irisColor')} />
                      </div>}
                    </div>
                </div>}
                </>
            ) : (
                <div className="text-center text-sm text-[#8C5A3A] p-8 bg-[#FFFBF7] rounded-lg">
                    <p>No hay personajes seleccionados.</p>
                    <p className="mt-2">Añada un nuevo personaje para comenzar.</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(CharacterEditor);