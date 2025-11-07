import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Lore, CharacterProfile } from '../types';
import { DiceIcon } from './icons';
import { generateNarrativeField, generateFullCharacterProfile } from '../services/geminiService';


interface CharacterEditorProps {
  lore: Lore | null;
  characterProfiles: CharacterProfile[];
  onCharacterProfilesChange: (profiles: CharacterProfile[]) => void;
  onGenerateNarrativeElement: (elementType: 'character', context?: any) => Promise<any>;
  setApiError: (error: string | null) => void;
}

type CharSubTab = 'profile' | 'psychology' | 'backstory' | 'skills';

const SubTabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-sky-500 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
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
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        <div className="relative">
            <textarea 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                onBlur={onBlur} 
                rows={rows} 
                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-sky-500 transition" 
                style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }}
            />
             {onGenerate && (
                <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="absolute top-1.5 right-1.5 p-1 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-wait transition-colors"
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
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        <div className="relative">
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                onBlur={onBlur} 
                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-sky-500 transition" 
                style={{ paddingRight: onGenerate ? '2.5rem' : '0.5rem' }}
            />
            {onGenerate && (
                 <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-wait transition-colors"
                    aria-label={`Generate ${label}`}
                    title={`Generate ${label}`}
                >
                    <DiceIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    </div>
);

const CharacterEditor: React.FC<CharacterEditorProps> = ({ lore, characterProfiles, onCharacterProfilesChange, onGenerateNarrativeElement, setApiError }) => {
    const [activeSubTab, setActiveSubTab] = useState<CharSubTab>('profile');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFieldLoading, setIsFieldLoading] = useState<Set<string>>(new Set());
    const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);

    const [selectedCharId, setSelectedCharId] = useState<string | null>(characterProfiles[0]?.id || null);
    const selectedChar = useMemo(() => characterProfiles.find(c => c.id === selectedCharId), [characterProfiles, selectedCharId]);
    const [localChar, setLocalChar] = useState(selectedChar);

    useEffect(() => { setLocalChar(selectedChar); }, [selectedChar]);

    useEffect(() => {
        if (characterProfiles.length > 0) {
            const currentSelectionExists = characterProfiles.some(c => c.id === selectedCharId);
            if (!selectedCharId || !currentSelectionExists) {
                setSelectedCharId(characterProfiles[characterProfiles.length - 1].id);
            }
        } else {
            setSelectedCharId(null);
        }
    }, [characterProfiles, selectedCharId]);

    const syncCharToParent = useCallback(() => {
        if (localChar) {
            const parentChar = characterProfiles.find(c => c.id === localChar.id);
            if (JSON.stringify(localChar) !== JSON.stringify(parentChar)) {
                onCharacterProfilesChange(characterProfiles.map(c => c.id === localChar.id ? localChar : c));
            }
        }
    }, [localChar, characterProfiles, onCharacterProfilesChange]);

    const handleGenerateCharacter = async () => {
        syncCharToParent();
        setIsLoading(true);
        try {
            await onGenerateNarrativeElement('character');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteCharacter = () => {
        if (!selectedCharId) return;
        if (window.confirm(`Are you sure you want to delete ${selectedChar?.name || 'this character'}?`)) {
            onCharacterProfilesChange(characterProfiles.filter(c => c.id !== selectedCharId));
        }
    }

    const handleGenerateField = useCallback(async (field: string) => {
        const charToUpdate = localChar;
        if (!charToUpdate) return;
        
        setApiError(null);
        setIsFieldLoading(prev => new Set(prev).add(field));
        
        try {
            const context = { lore, character: charToUpdate };
            const { text } = await generateNarrativeField(field, context);
            const [mainKey, subKey, ...rest] = field.split('.');

            if (mainKey === 'character') {
                const updatedChar = JSON.parse(JSON.stringify(charToUpdate)); // Deep copy
                if (rest.length > 0) {
                    updatedChar[subKey][rest[0]] = text;
                } else {
                    updatedChar[subKey] = text;
                }
                onCharacterProfilesChange(
                    characterProfiles.map(p => p.id === charToUpdate.id ? updatedChar : p)
                );
            }
        } catch (error: any) {
            console.error(`Error generating for field ${field}:`, error);
            const errorMessage = error.message || String(error);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                setApiError('You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">here</a>.');
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
    }, [lore, localChar, characterProfiles, onCharacterProfilesChange, setApiError]);

    const handleGenerateAllFields = async () => {
        if (!localChar) return;
        const charToUpdate = localChar;
        
        syncCharToParent();
        setIsGeneratingAll(true);
        setApiError(null);
        try {
            const narrativeProfile = await generateFullCharacterProfile(charToUpdate, lore);
            // The result from the API doesn't include visual parameters.
            // We must merge the new narrative data with the existing character,
            // preserving any visual parameters (`characterParams`) that might already exist.
            const fullProfile = {
                ...charToUpdate,
                ...narrativeProfile,
            };
            onCharacterProfilesChange(
                characterProfiles.map(p => p.id === charToUpdate.id ? fullProfile : p)
            );
        } catch (error: any) {
            console.error("Error generating full character profile:", error);
            const errorMessage = error.message || String(error);
            if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                setApiError('You have exceeded your API quota. Please <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">check your plan and billing details</a>. You can monitor your usage <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" class="text-sky-600 hover:underline font-semibold">here</a>.');
            } else {
                setApiError('Failed to call the Gemini API. Please try again.');
            }
        } finally {
            setIsGeneratingAll(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white space-y-4">
            <div className="flex gap-2">
               <select value={selectedCharId || ''} onChange={e => { syncCharToParent(); setSelectedCharId(e.target.value); }} className="flex-grow p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-1 focus:ring-sky-500">
                   {characterProfiles.length === 0 && <option value="" disabled>-- Cree un personaje --</option>}
                   {characterProfiles.map(c => <option key={c.id} value={c.id}>{c.name || 'Personaje sin nombre'}</option>)}
               </select>
               <button onClick={handleGenerateCharacter} disabled={isLoading} className="w-10 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 text-xl font-bold flex items-center justify-center transition" title="Añadir nuevo personaje">+</button>
               <button onClick={handleDeleteCharacter} disabled={!selectedCharId} className="w-10 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 text-xl font-bold flex items-center justify-center transition" title="Eliminar personaje seleccionado">-</button>
            </div>
            {localChar ? (
                <>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                       <SubTabButton label="Perfil" active={activeSubTab === 'profile'} onClick={() => setActiveSubTab('profile')} />
                       <SubTabButton label="Psicología" active={activeSubTab === 'psychology'} onClick={() => setActiveSubTab('psychology')} />
                       <SubTabButton label="Trasfondo" active={activeSubTab === 'backstory'} onClick={() => setActiveSubTab('backstory')} />
                       <SubTabButton label="Habilidades" active={activeSubTab === 'skills'} onClick={() => setActiveSubTab('skills')} />
                    </div>

                    <button
                        onClick={handleGenerateAllFields}
                        disabled={isGeneratingAll || isFieldLoading.size > 0}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:bg-gray-400 transition"
                    >
                        <DiceIcon className={`w-4 h-4 ${isGeneratingAll ? 'animate-spin' : ''}`} />
                        {isGeneratingAll ? 'Generando...' : 'Randomizar'}
                    </button>

                    <div className="space-y-3 p-3 bg-gray-50 rounded-b-lg flex-grow overflow-y-auto">
                        {activeSubTab === 'profile' && <>
                            <TextInput label="Nombre" value={localChar.name} onChange={v => setLocalChar(c => ({...c!, name: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.name')} isGenerating={isFieldLoading.has('character.name')} />
                            <TextInput label="Edad" value={localChar.age} onChange={v => setLocalChar(c => ({...c!, age: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.age')} isGenerating={isFieldLoading.has('character.age')} />
                            <TextInput label="Especie" value={localChar.species} onChange={v => setLocalChar(c => ({...c!, species: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.species')} isGenerating={isFieldLoading.has('character.species')} />
                            <TextInput label="Ocupación" value={localChar.occupation} onChange={v => setLocalChar(c => ({...c!, occupation: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.occupation')} isGenerating={isFieldLoading.has('character.occupation')} />
                        </>}
                        {activeSubTab === 'psychology' && <>
                            <TextInput label="Arquetipo" value={localChar.psychology.archetype} onChange={v => setLocalChar(c => ({...c!, psychology: {...c!.psychology, archetype: v}}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.psychology.archetype')} isGenerating={isFieldLoading.has('character.psychology.archetype')} />
                            <TextArea label="Motivación" value={localChar.psychology.motivation} onChange={v => setLocalChar(c => ({...c!, psychology: {...c!.psychology, motivation: v}}))} onBlur={syncCharToParent} rows={2} onGenerate={() => handleGenerateField('character.psychology.motivation')} isGenerating={isFieldLoading.has('character.psychology.motivation')} />
                            <TextArea label="Miedo" value={localChar.psychology.fear} onChange={v => setLocalChar(c => ({...c!, psychology: {...c!.psychology, fear: v}}))} onBlur={syncCharToParent} rows={2} onGenerate={() => handleGenerateField('character.psychology.fear')} isGenerating={isFieldLoading.has('character.psychology.fear')} />
                            <TextArea label="Virtudes" value={localChar.psychology.virtues} onChange={v => setLocalChar(c => ({...c!, psychology: {...c!.psychology, virtues: v}}))} onBlur={syncCharToParent} rows={2} onGenerate={() => handleGenerateField('character.psychology.virtues')} isGenerating={isFieldLoading.has('character.psychology.virtues')} />
                            <TextArea label="Defectos" value={localChar.psychology.flaws} onChange={v => setLocalChar(c => ({...c!, psychology: {...c!.psychology, flaws: v}}))} onBlur={syncCharToParent} rows={2} onGenerate={() => handleGenerateField('character.psychology.flaws')} isGenerating={isFieldLoading.has('character.psychology.flaws')} />
                        </>}
                        {activeSubTab === 'backstory' && <>
                            <TextArea label="Origen" value={localChar.backstory.origin} onChange={v => setLocalChar(c => ({...c!, backstory: {...c!.backstory, origin: v}}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.backstory.origin')} isGenerating={isFieldLoading.has('character.backstory.origin')}/>
                            <TextArea label="Herida (Trauma)" value={localChar.backstory.wound} onChange={v => setLocalChar(c => ({...c!, backstory: {...c!.backstory, wound: v}}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.backstory.wound')} isGenerating={isFieldLoading.has('character.backstory.wound')}/>
                            <TextArea label="Camino / Viaje" value={localChar.backstory.journey} onChange={v => setLocalChar(c => ({...c!, backstory: {...c!.backstory, journey: v}}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.backstory.journey')} isGenerating={isFieldLoading.has('character.backstory.journey')}/>
                            <TextArea label="Estado Inicial" value={localChar.backstory.initialState} onChange={v => setLocalChar(c => ({...c!, backstory: {...c!.backstory, initialState: v}}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.backstory.initialState')} isGenerating={isFieldLoading.has('character.backstory.initialState')}/>
                        </>}
                        {activeSubTab === 'skills' && <>
                            <TextArea label="Habilidades y Talentos" value={localChar.skills} onChange={v => setLocalChar(c => ({...c!, skills: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.skills')} isGenerating={isFieldLoading.has('character.skills')}/>
                            <TextArea label="Limitaciones y Debilidades" value={localChar.limitations} onChange={v => setLocalChar(c => ({...c!, limitations: v}))} onBlur={syncCharToParent} onGenerate={() => handleGenerateField('character.limitations')} isGenerating={isFieldLoading.has('character.limitations')}/>
                        </>}
                    </div>
                </>
            ) : (
                <div className="text-center text-sm text-gray-500 p-8 bg-gray-50 rounded-lg">
                    <p>No hay personajes seleccionados.</p>
                    <p className="mt-2">Añada un nuevo personaje para comenzar.</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(CharacterEditor);