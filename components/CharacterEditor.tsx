import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CharacterProfile, CharacterParams, CharacterParamKey, ColorParamKey, RichText, Segment, BackgroundOptions, CharacterInstance } from '../types';
import { DiceIcon } from './icons';
import { generateNarrativeField, generateFullCharacterProfile } from '../services/geminiService';
import { PARAM_CONFIGS } from '../constants';
import Slider from './Slider';
import { generateRandomAppearanceParams, getRandomParamValue } from '../services/characterGenerationService';
import CharacterCanvas from './CharacterCanvas';

interface CharacterEditorProps {
  lore: any;
  characterProfiles: CharacterProfile[];
  onCharacterProfilesChange: (profiles: CharacterProfile[] | ((prevProfiles: CharacterProfile[]) => CharacterProfile[])) => void;
  selectedCharId: string | null;
  onSelectedCharIdChange: (id: string | null) => void;
  onDeleteCharacter: (id: string) => void;
  onGenerateNarrativeElement: (elementType: 'character', context?: any) => Promise<any>;
  setApiError: (error: string | null) => void;
  activeMainTab: 'narrative' | 'appearance';
  onActiveMainTabChange: (tab: 'narrative' | 'appearance') => void;
}

// --- UTILS ---
const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
const stringToRichText = (text: string, source: 'user' | 'ai'): RichText => [{ text, source }];

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
type AppearanceMacroTab = 'cuerpo' | 'vestuario' | 'vistas';
type AppearanceSubTab = 'head' | 'hair' | 'eyes' | 'body' | 'arms' | 'legs' | 'color';

const MainTabButton = ({ tabName, label, activeTab, setActiveTab }: { tabName: MainTab, label: string, activeTab: MainTab, setActiveTab: (tab: MainTab) => void}) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`select-none flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'border-condorito-red text-condorito-red bg-white' : 'border-transparent text-condorito-brown hover:bg-panel-header/50 hover:text-condorito-brown'}`}
    >{label}</button>
);

const SubTabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`select-none px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-condorito-red text-white shadow-sm' : 'bg-panel-header text-condorito-brown hover:bg-panel-border'}`}>
        {label}
    </button>
);

const ColorInput = ({ label, value, onChange, onRandomize }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRandomize: () => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
        <label className="font-medium text-condorito-brown select-none text-xs">{label}</label>
        <div className="flex items-center gap-2">
            <input type="color" value={value} onChange={onChange} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
            <button
                onClick={onRandomize}
                className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors"
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
            <label className="font-medium text-condorito-brown select-none text-xs">{label}</label>
            <button
                onClick={onRandomize}
                className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
        </div>
      <div className="grid grid-cols-3 gap-1 w-full bg-panel-header rounded-lg p-1">
        {options.map(option => (
          <button key={option} onClick={() => onChange(option)} className={`select-none w-full py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${value === option ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}>
            {option.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
);

const CheckboxControl = ({ label, checked, onChange, onRandomize }: { label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRandomize: () => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
        <label htmlFor={label} className="font-medium text-condorito-brown select-none text-xs">{label}</label>
        <div className="flex items-center gap-2">
            <input type="checkbox" id={label} checked={checked} onChange={onChange} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red cursor-pointer" />
            <button
                onClick={onRandomize}
                className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const ZoomControls = ({ onZoomIn, onZoomOut, zoomPercentage }: { onZoomIn: () => void, onZoomOut: () => void, zoomPercentage: number }) => (
    <div className="absolute bottom-4 right-4 bg-panel-back/90 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl pointer-events-auto p-2 flex items-center gap-2 z-50">
      <button onClick={onZoomOut} className="w-8 h-8 flex items-center justify-center font-bold text-xl bg-panel-header text-condorito-brown rounded-md hover:bg-panel-border transition">-</button>
      <div className="text-xs font-mono w-12 text-center">{zoomPercentage.toFixed(0)}%</div>
      <button onClick={onZoomIn} className="w-8 h-8 flex items-center justify-center font-bold text-xl bg-panel-header text-condorito-brown rounded-md hover:bg-panel-border transition">+</button>
    </div>
);


const CharacterEditor: React.FC<CharacterEditorProps> = ({ lore, characterProfiles, onCharacterProfilesChange, selectedCharId, onSelectedCharIdChange, onDeleteCharacter, onGenerateNarrativeElement, setApiError, activeMainTab, onActiveMainTabChange }) => {
    const [activeNarrativeSubTab, setActiveNarrativeSubTab] = useState<NarrativeSubTab>('profile');
    const [activeMacroAppearanceTab, setActiveMacroAppearanceTab] = useState<AppearanceMacroTab>('cuerpo');
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

    const [viewBox, setViewBox] = useState(() => {
      const initialZoom = 0.33;
      const baseWidth = 400;
      const baseHeight = 700;
      const newWidth = baseWidth / initialZoom;
      const newHeight = baseHeight / initialZoom;
      return {
          x: (baseWidth - newWidth) / 2 + (baseWidth * (1/3)), // Center on right two-thirds
          y: (baseHeight - newHeight) / 2,
          width: newWidth,
          height: newHeight,
      };
    });
    const [backgroundOptions] = useState<BackgroundOptions>({ color1: '#FEFDFB', color2: '#FDEFE2', animation: false });

    const handleZoom = useCallback((factor: number) => {
        setViewBox(prev => {
            const newWidth = prev.width / factor;
            const newHeight = prev.height / factor;
            const centerX = prev.x + prev.width / 2;
            const centerY = prev.y + prev.height / 2;
            const newX = centerX - newWidth / 2;
            const newY = centerY - newHeight / 2;
            return { x: newX, y: newY, width: newWidth, height: newHeight };
        });
    }, []);

    const selectedChar = useMemo(() => characterProfiles.find(c => c.id === selectedCharId), [characterProfiles, selectedCharId]);
    
    const characterToRender = useMemo((): CharacterInstance[] => {
        if (!selectedChar || !selectedChar.characterParams) return [];
        return [{
          params: selectedChar.characterParams,
          x: 0,
          y: 0,
          scale: 1,
          zIndex: 1
        }];
    }, [selectedChar]);

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
        if (window.confirm(`Are you sure you want to delete ${richTextToString(selectedChar?.name) || 'this character'}?`)) {
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
            const richText = stringToRichText(text, 'ai');
            const [mainKey, subKey, ...rest] = field.split('.');

            if (mainKey === 'character') {
                updateCurrentChar(char => {
                    const updatedChar = JSON.parse(JSON.stringify(char));
                    if (rest.length > 0) { updatedChar[subKey][rest[0]] = richText; } else { updatedChar[subKey] = richText; }
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
            const narrativeResult = await generateFullCharacterProfile(charToUpdate, lore);
            const fullProfile = { ...charToUpdate, ...narrativeResult };
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
    const showEyelidControls = currentParams && ['realistic', 'blocky', 'circle'].includes(currentParams.eyeStyle);


    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex-shrink-0 flex gap-2 p-3 border-b border-panel-header">
               <select value={selectedCharId || ''} onChange={e => onSelectedCharIdChange(e.target.value) } className="flex-grow p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red">
                   {characterProfiles.length === 0 && <option value="" disabled>-- Cree un personaje --</option>}
                   {characterProfiles.map(c => <option key={c.id} value={c.id}>{richTextToString(c.name) || 'Personaje sin nombre'}</option>)}
               </select>
               <button onClick={handleGenerateCharacter} disabled={isLoading} className="w-10 bg-condorito-green text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Añadir nuevo personaje">+</button>
               <button onClick={handleDeleteClick} disabled={!selectedCharId} className="w-10 bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Eliminar personaje seleccionado">-</button>
            </div>
            {selectedChar ? (
                <>
                <div className="flex-shrink-0 flex border-b border-panel-header bg-panel-header/80">
                    <MainTabButton tabName="narrative" label="Narrativa" activeTab={activeMainTab} setActiveTab={onActiveMainTabChange} />
                    <MainTabButton tabName="appearance" label="Apariencia" activeTab={activeMainTab} setActiveTab={onActiveMainTabChange} />
                </div>
                
                {activeMainTab === 'narrative' && <div className="space-y-3 p-3 flex-grow overflow-y-auto">
                    <div className="flex gap-2 p-1 bg-panel-header rounded-lg">
                       <SubTabButton label="Perfil" active={activeNarrativeSubTab === 'profile'} onClick={() => setActiveNarrativeSubTab('profile')} />
                       <SubTabButton label="Psicología" active={activeNarrativeSubTab === 'psychology'} onClick={() => setActiveNarrativeSubTab('psychology')} />
                       <SubTabButton label="Trasfondo" active={activeNarrativeSubTab === 'backstory'} onClick={() => setActiveNarrativeSubTab('backstory')} />
                       <SubTabButton label="Habilidades" active={activeNarrativeSubTab === 'skills'} onClick={() => setActiveNarrativeSubTab('skills')} />
                    </div>
                    <button onClick={handleGenerateAllFields} disabled={isGeneratingAll || isFieldLoading.size > 0} className="w-full relative overflow-hidden flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border transition">
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {isGeneratingAll ? 'Generating...' : (
                            <>
                              <DiceIcon className="w-4 h-4" />
                              Randomizar Perfil
                            </>
                          )}
                        </span>
                        {isGeneratingAll && <div className="absolute inset-0 loading-bar-shimmer"></div>}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleInitiateSaveNarrativePreset} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-wood text-white rounded-md hover:brightness-95 transition-colors"> Guardar Narrativa </button>
                        <button onClick={() => { setShowNarrativePresets(s => !s); setIsNamingNarrativePreset(false); }} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-gray text-white rounded-md hover:brightness-95 transition-colors"> {showNarrativePresets ? 'Ocultar' : 'Cargar Narrativa'} </button>
                    </div>

                    {isNamingNarrativePreset && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Guardar nueva narrativa</h4> <input type="text" value={narrativePresetNameInput} onChange={e => setNarrativePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveNarrativePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95">Confirmar</button> <button onClick={() => setIsNamingNarrativePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}
                    {showNarrativePresets && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Narrativas Guardadas</h4> {narrativePresets.length === 0 ? ( <p className="text-xs text-center text-condorito-brown py-2">No hay narrativas guardadas.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {narrativePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-panel-header group"> <button onClick={() => handleLoadNarrativePreset(preset.narrative)} className="text-left text-xs text-condorito-brown flex-grow hover:text-condorito-red">{preset.name}</button> <button onClick={() => handleDeleteNarrativePreset(preset.name)} className="text-condorito-red opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-condorito-red/20" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}

                    <div className="space-y-3 p-3 bg-panel-back rounded-b-lg flex-grow">
                        {activeNarrativeSubTab === 'profile' && <>
                            <RichTextEditor isSingleLine label="Nombre" value={selectedChar.name} onChange={v => updateCurrentChar(c => ({...c, name: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.name')} isGenerating={isFieldLoading.has('character.name')} />
                            <RichTextEditor isSingleLine label="Edad" value={selectedChar.age} onChange={v => updateCurrentChar(c => ({...c, age: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.age')} isGenerating={isFieldLoading.has('character.age')} />
                            <RichTextEditor isSingleLine label="Especie" value={selectedChar.species} onChange={v => updateCurrentChar(c => ({...c, species: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.species')} isGenerating={isFieldLoading.has('character.species')} />
                            <RichTextEditor isSingleLine label="Ocupación" value={selectedChar.occupation} onChange={v => updateCurrentChar(c => ({...c, occupation: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.occupation')} isGenerating={isFieldLoading.has('character.occupation')} />
                        </>}
                        {activeNarrativeSubTab === 'psychology' && <>
                            <RichTextEditor isSingleLine label="Arquetipo" value={selectedChar.psychology.archetype} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, archetype: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.psychology.archetype')} isGenerating={isFieldLoading.has('character.psychology.archetype')} />
                            <RichTextEditor label="Motivación" value={selectedChar.psychology.motivation} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, motivation: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.motivation')} isGenerating={isFieldLoading.has('character.psychology.motivation')} />
                            <RichTextEditor label="Miedo" value={selectedChar.psychology.fear} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, fear: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.fear')} isGenerating={isFieldLoading.has('character.psychology.fear')} />
                            <RichTextEditor label="Virtudes" value={selectedChar.psychology.virtues} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, virtues: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.virtues')} isGenerating={isFieldLoading.has('character.psychology.virtues')} />
                            <RichTextEditor label="Defectos" value={selectedChar.psychology.flaws} onChange={v => updateCurrentChar(c => ({...c, psychology: {...c.psychology, flaws: v}}))} onBlur={()=>{}} rows={2} onGenerate={() => handleGenerateField('character.psychology.flaws')} isGenerating={isFieldLoading.has('character.psychology.flaws')} />
                        </>}
                        {activeNarrativeSubTab === 'backstory' && <>
                            <RichTextEditor label="Origen" value={selectedChar.backstory.origin} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, origin: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.origin')} isGenerating={isFieldLoading.has('character.backstory.origin')}/>
                            <RichTextEditor label="Herida (Trauma)" value={selectedChar.backstory.wound} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, wound: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.wound')} isGenerating={isFieldLoading.has('character.backstory.wound')}/>
                            <RichTextEditor label="Camino / Viaje" value={selectedChar.backstory.journey} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, journey: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.journey')} isGenerating={isFieldLoading.has('character.backstory.journey')}/>
                            <RichTextEditor label="Estado Inicial" value={selectedChar.backstory.initialState} onChange={v => updateCurrentChar(c => ({...c, backstory: {...c.backstory, initialState: v}}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.backstory.initialState')} isGenerating={isFieldLoading.has('character.backstory.initialState')}/>
                        </>}
                         {activeNarrativeSubTab === 'skills' && <>
                            <RichTextEditor label="Habilidades y Talentos" value={selectedChar.skills} onChange={v => updateCurrentChar(c => ({...c, skills: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.skills')} isGenerating={isFieldLoading.has('character.skills')}/>
                            <RichTextEditor label="Limitaciones y Debilidades" value={selectedChar.limitations} onChange={v => updateCurrentChar(c => ({...c, limitations: v}))} onBlur={()=>{}} onGenerate={() => handleGenerateField('character.limitations')} isGenerating={isFieldLoading.has('character.limitations')}/>
                        </>}
                    </div>
                </div>}

                {activeMainTab === 'appearance' && currentParams && (
                    <div className="flex-grow flex overflow-hidden">
                        <div className="w-1/3 h-full overflow-y-auto border-r border-panel-header p-3 space-y-3">
                            <div className="flex-shrink-0 flex gap-2 p-1 bg-panel-header rounded-lg">
                               <SubTabButton label="Cuerpo" active={activeMacroAppearanceTab === 'cuerpo'} onClick={() => setActiveMacroAppearanceTab('cuerpo')} />
                               <SubTabButton label="Vestuario" active={activeMacroAppearanceTab === 'vestuario'} onClick={() => setActiveMacroAppearanceTab('vestuario')} />
                               <SubTabButton label="Vistas" active={activeMacroAppearanceTab === 'vistas'} onClick={() => setActiveMacroAppearanceTab('vistas')} />
                            </div>

                            <div className="flex-grow">
                              {activeMacroAppearanceTab === 'cuerpo' && (
                                  <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-panel-header rounded-lg">
                                        <SubTabButton label="Cabeza" active={activeAppearanceSubTab === 'head'} onClick={() => setActiveAppearanceSubTab('head')} />
                                        <SubTabButton label="Pelo" active={activeAppearanceSubTab === 'hair'} onClick={() => setActiveAppearanceSubTab('hair')} />
                                        <SubTabButton label="Ojos" active={activeAppearanceSubTab === 'eyes'} onClick={() => setActiveAppearanceSubTab('eyes')} />
                                        <SubTabButton label="Cuerpo" active={activeAppearanceSubTab === 'body'} onClick={() => setActiveAppearanceSubTab('body')} />
                                        <SubTabButton label="Brazos" active={activeAppearanceSubTab === 'arms'} onClick={() => setActiveAppearanceSubTab('arms')} />
                                        <SubTabButton label="Piernas" active={activeAppearanceSubTab === 'legs'} onClick={() => setActiveAppearanceSubTab('legs')} />
                                        <SubTabButton label="Color" active={activeAppearanceSubTab === 'color'} onClick={() => setActiveAppearanceSubTab('color')} />
                                    </div>
                                    <button onClick={handleRandomizeAppearance} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border transition">
                                        <DiceIcon className="w-4 h-4" />
                                        Randomize Apariencia
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleInitiateSaveAppearancePreset} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-wood text-white rounded-md hover:brightness-95 transition-colors"> Guardar Apariencia </button>
                                        <button onClick={() => { setShowAppearancePresets(s => !s); setIsNamingAppearancePreset(false); }} className="w-full px-3 py-2 text-xs font-semibold bg-condorito-gray text-white rounded-md hover:brightness-95 transition-colors"> {showAppearancePresets ? 'Ocultar' : 'Cargar Apariencia'} </button>
                                    </div>

                                    {isNamingAppearancePreset && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Guardar nueva apariencia</h4> <input type="text" value={appearancePresetNameInput} onChange={e => setAppearancePresetNameInput(e.target.value)} placeholder="Nombre del preset..." className="w-full p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red" autoFocus /> <div className="flex gap-2"> <button onClick={handleConfirmSaveAppearancePreset} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95">Confirmar</button> <button onClick={() => setIsNamingAppearancePreset(false)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button> </div> </div> )}
                                    {showAppearancePresets && ( <div className="p-3 bg-panel-back rounded-lg border border-panel-header space-y-2"> <h4 className="font-semibold text-xs text-condorito-brown">Apariencias Guardadas</h4> {appearancePresets.length === 0 ? ( <p className="text-xs text-center text-condorito-brown py-2">No hay apariencias guardadas.</p> ) : ( <div className="max-h-32 overflow-y-auto space-y-1 pr-1"> {appearancePresets.map(preset => ( <div key={preset.name} className="flex items-center justify-between p-1.5 rounded-lg bg-panel-header group"> <button onClick={() => handleLoadAppearancePreset(preset.params)} className="text-left text-xs text-condorito-brown flex-grow hover:text-condorito-red">{preset.name}</button> <button onClick={() => handleDeleteAppearancePreset(preset.name)} className="text-condorito-red opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-condorito-red/20" title={`Eliminar ${preset.name}`}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg> </button> </div> ))} </div> )} </div> )}
                                    <div className="space-y-3 p-3 bg-panel-back rounded-b-lg">
                                      {activeAppearanceSubTab === 'head' && <div className="space-y-4"> {(['headWidth', 'headHeight', 'mouthWidthRatio', 'mouthYOffsetRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <Slider {...PARAM_CONFIGS.mouthBend} min={-Math.round(maxMouthBend)} max={Math.round(maxMouthBend)} value={currentParams.mouthBend} onChange={(e) => handleParamChange('mouthBend', Number(e.target.value))} onRandomize={() => handleRandomizeParam('mouthBend')} /> <div className="pt-4 border-t border-panel-header space-y-3"> <ShapeSelector label="Head Shape" value={currentParams.headShape} options={['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => handleParamChange('headShape', v)} onRandomize={() => handleRandomizeParam('headShape')} /> {(currentParams.headShape === 'square') && ( <Slider {...PARAM_CONFIGS.headCornerRadius} value={currentParams.headCornerRadius} onChange={(e) => handleParamChange('headCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('headCornerRadius')} /> )} {(currentParams.headShape === 'triangle' || currentParams.headShape === 'inverted-triangle') && ( <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={currentParams.triangleCornerRadius} onChange={(e) => handleParamChange('triangleCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('triangleCornerRadius')} /> )} </div> </div>}
                                      {activeAppearanceSubTab === 'hair' && <div className="space-y-4"> <CheckboxControl label="Enable Hair" checked={currentParams.hair} onChange={e => handleParamChange('hair', e.target.checked)} onRandomize={() => handleRandomizeParam('hair')} /> {currentParams.hair && ( <div className="pt-4 border-t border-panel-header space-y-4"> <ShapeSelector label="Back Hair Shape" value={currentParams.backHairShape} options={['smooth', 'afro', 'square', 'triangle', 'oval']} onChange={(v) => handleParamChange('backHairShape', v)} onRandomize={() => handleRandomizeParam('backHairShape')} /> {(['backHairWidthRatio', 'backHairHeightRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <Slider {...PARAM_CONFIGS.fringeHeightRatio} max={Math.floor(maxFringeHeightRatio)} value={currentParams.fringeHeightRatio} onChange={(e) => handleParamChange('fringeHeightRatio', Number(e.target.value))} onRandomize={() => handleRandomizeParam('fringeHeightRatio')} /> <div className="pt-4 border-t border-panel-header space-y-4"> {(['hairCurliness', 'hairCurlFrequency', 'hairCurlAmplitude'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> </div> )} </div>}
                                      {activeAppearanceSubTab === 'eyes' && <div className="space-y-4">
                                        <ShapeSelector label="Eye Style" value={currentParams.eyeStyle} options={['realistic', 'blocky', 'circle', 'dot', 'square', 'triangle']} onChange={(v) => handleParamChange('eyeStyle', v)} onRandomize={() => handleRandomizeParam('eyeStyle')} />
                                        <div className="pt-4 border-t border-panel-header space-y-4">
                                            {(['eyeSizeRatio', 'eyeSpacingRatio', 'pupilSizeRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)}
                                            {showEyelidControls && (<>
                                                <Slider {...PARAM_CONFIGS['upperEyelidCoverage']} value={currentParams['upperEyelidCoverage']} onChange={(e) => handleParamChange('upperEyelidCoverage', Number(e.target.value))} onRandomize={() => handleRandomizeParam('upperEyelidCoverage')} />
                                                <Slider {...PARAM_CONFIGS['lowerEyelidCoverage']} value={currentParams['lowerEyelidCoverage']} onChange={(e) => handleParamChange('lowerEyelidCoverage', Number(e.target.value))} onRandomize={() => handleRandomizeParam('lowerEyelidCoverage')} />
                                            </>)}
                                        </div>
                                        <div className="pt-4 border-t border-panel-header space-y-3">
                                            <CheckboxControl label="Glint" checked={currentParams.glint} onChange={e => handleParamChange('glint', e.target.checked)} onRandomize={() => handleRandomizeParam('glint')} />
                                            {currentParams.glint && (
                                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-4">
                                                    {(['glintSizeRatio', 'glintXOffsetRatio', 'glintYOffsetRatio', 'glintOpacity'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t border-panel-header space-y-3">
                                            <CheckboxControl label="Eyebrows" checked={currentParams.eyebrows} onChange={e => handleParamChange('eyebrows', e.target.checked)} onRandomize={() => handleRandomizeParam('eyebrows')} />
                                            {currentParams.eyebrows && (
                                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-4">
                                                    {(['eyebrowWidthRatio', 'eyebrowHeightRatio', 'eyebrowYOffsetRatio', 'eyebrowAngle'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t border-panel-header space-y-3">
                                            <CheckboxControl label="Eyelashes" checked={currentParams.eyelashes} onChange={e => handleParamChange('eyelashes', e.target.checked)} onRandomize={() => handleRandomizeParam('eyelashes')} />
                                            {currentParams.eyelashes && (
                                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-4">
                                                    {(['eyelashCount', 'eyelashLength', 'eyelashAngle'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)}
                                                </div>
                                            )}
                                        </div>
                                      </div>}
                                      {activeAppearanceSubTab === 'body' && <div className="space-y-4"> {(['neckHeight', 'neckWidthRatio', 'torsoHeight', 'torsoWidth', 'pelvisHeight', 'pelvisWidthRatio'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k]} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} <div className="pt-4 border-t border-panel-header space-y-3"> <ShapeSelector label="Torso Shape" value={currentParams.torsoShape} options={['rectangle', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => handleParamChange('torsoShape', v)} onRandomize={() => handleRandomizeParam('torsoShape')} /> {(currentParams.torsoShape === 'square' || currentParams.torsoShape === 'rectangle') && ( <Slider {...PARAM_CONFIGS.torsoCornerRadius} value={currentParams.torsoCornerRadius} onChange={(e) => handleParamChange('torsoCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('torsoCornerRadius')} /> )} {(currentParams.torsoShape === 'triangle' || currentParams.torsoShape === 'inverted-triangle') && ( <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={currentParams.triangleCornerRadius} onChange={(e) => handleParamChange('triangleCornerRadius', Number(e.target.value))} onRandomize={() => handleRandomizeParam('triangleCornerRadius')} /> )} </div> <div className="pt-4 border-t border-panel-header space-y-3"> <ShapeSelector label="Pelvis Shape" value={currentParams.pelvisShape} options={['rectangle', 'horizontal-oval']} onChange={(v) => handleParamChange('pelvisShape', v)} onRandomize={() => handleRandomizeParam('pelvisShape')} /> </div> </div>}
                                      {activeAppearanceSubTab === 'arms' && <div className="space-y-4"> <Slider {...PARAM_CONFIGS['armLength']} value={currentParams['armLength']} onChange={(e) => handleParamChange('armLength', Number(e.target.value))} onRandomize={() => handleRandomizeParam('armLength')} /> <div className="pt-4 border-t border-panel-header space-y-3"> <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header"> <label htmlFor="limbSymmetry" className="font-medium text-condorito-brown select-none text-xs">Symmetry</label> <input type="checkbox" id="limbSymmetry" checked={limbSymmetry} onChange={e => setLimbSymmetry(e.target.checked)} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red cursor-pointer" /> </div> </div> <div className="pt-4 border-t border-panel-header space-y-4"> {(['lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize', 'lArmAngle', 'lArmBend', 'rArmAngle', 'rArmBend'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k] as number} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> </div>}
                                      {activeAppearanceSubTab === 'legs' && <div className="space-y-4"> <Slider {...PARAM_CONFIGS['legLength']} value={currentParams['legLength']} onChange={(e) => handleParamChange('legLength', Number(e.target.value))} onRandomize={() => handleRandomizeParam('legLength')} /> <div className="pt-4 border-t border-panel-header space-y-4"> {(['lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize', 'lLegAngle', 'lLegBend', 'rLegAngle', 'rLegBend'] as const).map(k => <Slider key={k} {...PARAM_CONFIGS[k]} value={currentParams[k] as number} onChange={(e) => handleParamChange(k, Number(e.target.value))} onRandomize={() => handleRandomizeParam(k)} />)} </div> </div>}
                                      {activeAppearanceSubTab === 'color' && <div className="space-y-3">
                                        <CheckboxControl label="Body Outlines" checked={currentParams.bodyOutlines} onChange={e => handleParamChange('bodyOutlines', e.target.checked)} onRandomize={() => handleRandomizeParam('bodyOutlines')} />
                                        <CheckboxControl label="Eye Outlines" checked={currentParams.eyeOutlines} onChange={e => handleParamChange('eyeOutlines', e.target.checked)} onRandomize={() => handleRandomizeParam('eyeOutlines')} />
                                        <div className="pt-2 border-t border-panel-header" />
                                        <ColorInput label="Body" value={currentParams.bodyColor} onChange={e => handleParamChange('bodyColor', e.target.value)} onRandomize={() => handleRandomizeParam('bodyColor')} />
                                        <ColorInput label="Hair" value={currentParams.hairColor} onChange={e => handleParamChange('hairColor', e.target.value)} onRandomize={() => handleRandomizeParam('hairColor')} />
                                        <ColorInput label="Outline" value={currentParams.outlineColor} onChange={e => handleParamChange('outlineColor', e.target.value)} onRandomize={() => handleRandomizeParam('outlineColor')} />
                                        <ColorInput label="Pupil" value={currentParams.pupilColor} onChange={e => handleParamChange('pupilColor', e.target.value)} onRandomize={() => handleRandomizeParam('pupilColor')} />
                                        <ColorInput label="Iris" value={currentParams.irisColor} onChange={e => handleParamChange('irisColor', e.target.value)} onRandomize={() => handleRandomizeParam('irisColor')} />
                                      </div>}
                                    </div>
                                  </div>
                                )}
                                {activeMacroAppearanceTab === 'vestuario' && (
                                    <div className="text-center text-xs text-condorito-brown p-8 bg-panel-back rounded-lg h-full flex flex-col justify-center items-center">
                                        <p className="font-bold text-lg mb-2">🚧</p>
                                        <p className="font-semibold">Editor de Vestuario</p>
                                        <p className="mt-2">Próximamente: ¡Define el estilo de tu personaje con ropa y accesorios!</p>
                                    </div>
                                )}
                                {activeMacroAppearanceTab === 'vistas' && (
                                    <div className="space-y-4 p-3 bg-panel-back rounded-b-lg">
                                        <Slider
                                            {...PARAM_CONFIGS.viewAngle}
                                            value={currentParams.viewAngle}
                                            onChange={(e) => handleParamChange('viewAngle', Number(e.target.value))}
                                            onRandomize={() => handleRandomizeParam('viewAngle')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-2/3 h-full relative bg-condorito-pink">
                           <CharacterCanvas
                                panMode="direct"
                                characters={characterToRender}
                                comicPanels={null}
                                backgroundOptions={backgroundOptions}
                                showBoundingBoxes={false}
                                comicAspectRatio="1:1"
                                minComicFontSize={12} maxComicFontSize={18} comicLanguage="es" comicFontFamily="Comic Neue" comicTheme=""
                                comicPanelCornerRadius={10}
                                canvasResetToken={0}
                                viewBox={viewBox}
                                onViewBoxChange={setViewBox}
                            />
                            <ZoomControls
                                onZoomIn={() => handleZoom(1.2)}
                                onZoomOut={() => handleZoom(1 / 1.2)}
                                zoomPercentage={(400 / viewBox.width) * 100}
                            />
                        </div>
                    </div>
                )}
                </>
            ) : (
                <div className="text-center text-xs text-condorito-brown p-8 bg-panel-back rounded-lg flex-grow">
                    <p>No hay personajes seleccionados.</p>
                    <p className="mt-2">Añada un nuevo personaje para comenzar.</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(CharacterEditor);