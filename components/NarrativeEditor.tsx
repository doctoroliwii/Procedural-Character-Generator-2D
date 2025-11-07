import React, { useState, useEffect, useCallback } from 'react';
import type { Lore, CharacterProfile, Story, Location } from '../types';
import { DiceIcon } from './icons';
import { generateNarrativeField } from '../services/geminiService';
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

// --- UI Components ---

const MainTabButton = ({ tabName, label, activeTab, setActiveTab }: { tabName: MainTab, label: string, activeTab: MainTab, setActiveTab: (tab: MainTab) => void}) => (
    <button
        onClick={() => setActiveTab(tabName)}
        className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-200 focus:outline-none ${activeTab === tabName ? 'border-sky-500 text-sky-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}
    >{label}</button>
);

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


const LoreEditor: React.FC<LoreEditorProps> = ({ lore, onLoreChange, characterProfiles, story, onStoryChange, onGenerateNarrativeElement, togglePanel, setApiError }) => {
    const [activeTab, setActiveTab] = useState<MainTab>('lore');
    const [activeSubTabs, setActiveSubTabs] = useState({ lore: 'core' as LoreSubTab, story: 'premise' as StorySubTab });
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isFieldLoading, setIsFieldLoading] = useState<Set<string>>(new Set());

    // Local state for forms
    const [localLore, setLocalLore] = useState(lore);
    const [localStory, setLocalStory] = useState(story);

    // Sync props to local state
    useEffect(() => { setLocalLore(lore); }, [lore]);
    useEffect(() => { setLocalStory(story); }, [story]);

    // Handlers to sync local state back to parent on blur or action
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
                 setLocalStory(current => ({ ...(current || { genre: '', stakes: '', characterProfileIds:[], storyCircle:[] }), [subKey]: text }));
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
    }, [localLore, localStory, characterProfiles, setApiError]);

    // --- RENDER LOGIC ---
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex border-b border-gray-300 bg-gray-100/80">
                <MainTabButton tabName="lore" label="Universo" activeTab={activeTab} setActiveTab={setActiveTab} />
                <MainTabButton tabName="story" label="Historia" activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div className="p-3 flex-grow overflow-y-auto">
                {activeTab === 'lore' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-800">Universo (Lore)</h3>
                            <button onClick={() => handleGenerate('lore', { genreSuggestion: localLore?.genre })} disabled={!!isLoading} className="px-3 py-1.5 text-xs font-semibold bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:bg-gray-400 transition">{isLoading === 'lore' ? '...' : '🎲 Randomizar'}</button>
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <SubTabButton label="Núcleo" active={activeSubTabs.lore === 'core'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'core'}))} />
                            <SubTabButton label="Lugares" active={activeSubTabs.lore === 'locations'} onClick={() => setActiveSubTabs(s => ({...s, lore: 'locations'}))} />
                        </div>
                        {activeSubTabs.lore === 'core' && <div className="space-y-3 p-3 bg-gray-50 rounded-b-lg">
                            <TextInput label="Género" value={localLore?.genre} onChange={v => setLocalLore(l => ({...(l!), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.genre')} isGenerating={isFieldLoading.has('lore.genre')} />
                            <TextArea label="Reglas del Mundo" value={localLore?.rules} onChange={v => setLocalLore(l => ({...(l!), rules: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.rules')} isGenerating={isFieldLoading.has('lore.rules')} />
                            <TextArea label="Historia del Mundo" value={localLore?.history} onChange={v => setLocalLore(l => ({...(l!), history: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('lore.history')} isGenerating={isFieldLoading.has('lore.history')} />
                        </div>}
                        {activeSubTabs.lore === 'locations' && <div className="p-3 bg-gray-50 rounded-b-lg text-sm text-gray-500">Próximamente: Editor de lugares.</div>}
                    </div>
                )}
                
                {activeTab === 'story' && (
                     <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-800">Historia</h3>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <SubTabButton label="Premisa" active={activeSubTabs.story === 'premise'} onClick={() => setActiveSubTabs(s => ({...s, story: 'premise'}))} />
                            <SubTabButton label="Trama" active={activeSubTabs.story === 'plot'} onClick={() => setActiveSubTabs(s => ({...s, story: 'plot'}))} />
                        </div>

                        {activeSubTabs.story === 'premise' && <div className="space-y-4 p-3 bg-gray-50 rounded-b-lg">
                            <TextInput label="Género de la Historia" value={localStory?.genre} onChange={v => setLocalStory(s => ({...(s || { characterProfileIds:[], storyCircle:[] }), genre: v}))} onBlur={syncStateToParent} onGenerate={() => handleGenerateField('story.genre')} isGenerating={isFieldLoading.has('story.genre')}/>
                            <TextArea label="Qué está en juego (Stakes)" value={localStory?.stakes} onChange={v => setLocalStory(s => ({...(s || { characterProfileIds:[], storyCircle:[] }), stakes: v}))} onBlur={syncStateToParent} rows={2} onGenerate={() => handleGenerateField('story.stakes')} isGenerating={isFieldLoading.has('story.stakes')}/>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-xs text-gray-600">Personajes en la Historia</h4>
                                {characterProfiles.length === 0 ? (
                                    <p className="text-xs text-gray-500">Crea personajes en el <button onClick={() => togglePanel('CharacterEditor')} className="text-sky-600 hover:underline">Editor de Personajes</button> para poder añadirlos a la historia.</p>
                                ): characterProfiles.map(c => (
                                    <div key={c.id} className="flex items-center gap-2"><input type="checkbox" id={`char-check-${c.id}`} checked={localStory?.characterProfileIds.includes(c.id) || false} onChange={e => {
                                        const ids = localStory?.characterProfileIds || [];
                                        const newIds = e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id);
                                        setLocalStory(s => ({...(s || { genre: '', stakes: '', storyCircle: [] }), characterProfileIds: newIds}));
                                    }} onBlur={syncStateToParent} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" /><label htmlFor={`char-check-${c.id}`} className="select-none text-sm">{c.name}</label></div>
                                ))}
                            </div>
                            <button onClick={() => handleGenerate('story', { characterIds: localStory?.characterProfileIds, genre: localStory?.genre, stakes: localStory?.stakes })} disabled={!lore || (localStory?.characterProfileIds || []).length === 0 || !!isLoading} className="w-full bg-sky-500 text-white font-semibold py-2 rounded-md hover:bg-sky-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition">{isLoading === 'story' ? 'Generando...' : '🎲 Generar Trama'}</button>
                        </div>}

                        {activeSubTabs.story === 'plot' && <div className="p-3 bg-gray-50 rounded-b-lg">
                            {story?.storyCircle ? <div className="space-y-3">
                                {story.storyCircle.sort((a,b) => a.step - b.step).map(s => <div key={s.step}><strong className="text-xs uppercase font-bold text-sky-700">{s.step}. {s.title}</strong><p className="text-sm text-gray-700 mt-1">{s.description}</p></div>)}
                            </div> : <p className="text-sm text-center text-gray-500 py-4">Genere una premisa para ver la trama aquí.</p>}
                        </div>}
                    </div>
                )}
            </div>
        </div>
    )
};

export default React.memo(LoreEditor);