
import React, { useState } from 'react';
// FIX: Add missing import for BackgroundOptions
import type { CharacterParams, CharacterProfile, ComicPanelData, Lore, RichText, Story, BackgroundOptions, NarrativeScript, DialogueData, ProceduralBackground } from '../types';
import { COMPULSIVO_LOGO_BASE64, DiceIcon } from './icons';
import Slider from './Slider';
import ControlModule from './ControlModule';
import LoreEditor from './NarrativeEditor';
import CharacterEditor from './CharacterEditor';
import TrendingThemePanel from './TrendingThemePanel';
import { generateRandomAppearanceParams, getRandomParamValue } from '../services/characterGenerationService';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import BackgroundEditor from './BackgroundEditor';

interface ControlPanelProps {
  panels: Record<PanelKey, PanelState>;
  fullScreenPanelKey: PanelKey | null;
  backgroundOptions: BackgroundOptions;
  onBackgroundOptionsChange: (options: Partial<BackgroundOptions>) => void;
  showBoundingBoxes: boolean;
  onShowBoundingBoxesChange: (enabled: boolean) => void;
  uiScale: number;
  onUiScaleChange: (value: number) => void;
  comicFontFamily: string;
  onComicFontFamilyChange: (font: string) => void;
  // Comic controls
  comicTheme: string;
  onComicThemeChange: (value: string) => void;
  comicScene: string;
  onComicSceneChange: (value: string) => void;
  onRandomizeComicScene: () => void;
  isRandomizingScene: boolean;
  onAppendComicTheme: (theme: string) => void;
  numComicPanels: number;
  onNumComicPanelsChange: (value: number) => void;
  numComicPages: number;
  onNumComicPagesChange: (value: number) => void;
  useNanoBananaOnly: boolean;
  onUseNanoBananaOnlyChange: (value: boolean) => void;
  useProceduralBackgrounds: boolean;
  onUseProceduralBackgroundsChange: (value: boolean) => void;
  comicAspectRatio: '1:1' | '16:9' | '9:16';
  onComicAspectRatioChange: (value: '1:1' | '16:9' | '9:16') => void;
  minComicFontSize: number;
  onMinComicFontSizeChange: (value: number) => void;
  maxComicFontSize: number;
  onMaxComicFontSizeChange: (value: number) => void;
  comicLanguage: string;
  onComicLanguageChange: (value: string) => void;
  onGenerateComic: (mode: 'simple' | 'custom') => void;
  onGenerateAllAndComic: () => void;
  isGeneratingComic: boolean;
  onRandomizeComic: () => void;
  isRandomizingComic: boolean;
  comicPanels: ComicPanelData[] | null;
  onRandomizeComicCharacters: () => void;
  // Panel controls
  togglePanel: (key: PanelKey, openerKey?: PanelKey) => void;
  updatePanelPosition: (key: PanelKey, position: { x: number; y: number }) => void;
  bringToFront: (key: PanelKey) => void;
  // Narrative props
  lore: Lore | null;
  onLoreChange: (lore: Lore | null) => void;
  characterProfiles: CharacterProfile[];
  onCharacterProfilesChange: (updater: (prev: CharacterProfile[]) => CharacterProfile[]) => void;
  selectedCharId: string | null;
  onSelectedCharIdChange: (id: string | null) => void;
  onDeleteCharacter: (id: string) => void;
  story: Story | null;
  onStoryChange: (story: Story | null) => void;
  onGenerateNarrativeElement: (elementType: 'lore' | 'character' | 'story', context?: any) => Promise<any>;
  onGenerateSimpleCharacters: (count: number) => Promise<void>;
  isGeneratingSimpleCharacters: boolean;
  onRegenerateCharacterName: (characterId: string) => void;
  onRandomizeCharacterAppearance: (characterId: string) => void;
  comicMode: 'simple' | 'custom';
  onComicModeChange: (mode: 'simple' | 'custom') => void;
  characterEditorTab: 'narrative' | 'appearance';
  onCharacterEditorTabChange: (tab: 'narrative' | 'appearance') => void;
  setApiError: (error: string | null) => void;
  onGenerateProject: (settings: { name: RichText; genre: RichText; seasons: number; episodes: number; }) => Promise<void>;
  // Script Editor props
  narrativeScript: NarrativeScript | null;
  onNarrativeScriptChange: (script: NarrativeScript | null) => void;
  selectedPageIndex: number;
  onSelectedPageIndexChange: (index: number) => void;
  selectedPanelIndex: number;
  onSelectedPanelIndexChange: (index: number) => void;
  // Background Editor Props
  proceduralBackgrounds: ProceduralBackground[];
  onProceduralBackgroundsChange: (updater: (prev: ProceduralBackground[]) => ProceduralBackground[]) => void;
  selectedBackgroundId: string | null;
  onSelectedBackgroundIdChange: (id: string | null) => void;
}

export type PanelKey = 'Options' | 'About' | 'Comic' | 'LoreEditor' | 'CharacterEditor' | 'TrendingTheme' | 'ProjectSettings' | 'BackgroundEditor';

export interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
const stringToRichText = (text: string, source: 'user' | 'ai'): RichText => [{ text, source }];

// --- NEW SUB-COMPONENT ---
interface CharacterListItemProps {
  profile: CharacterProfile;
  onUpdateName: (characterId: string, newName: string) => void;
  onRegenerateName: (characterId: string) => void;
  onUpdateParam: (characterId: string, param: keyof CharacterParams, value: any) => void;
  onSelectForAppearance: (characterId: string) => void;
  onRandomizeAppearance: (characterId: string) => void;
  onRandomizeColor: (characterId: string) => void;
}

const CharacterListItem: React.FC<CharacterListItemProps> = ({
  profile,
  onUpdateName,
  onRegenerateName,
  onUpdateParam,
  onSelectForAppearance,
  onRandomizeAppearance,
  onRandomizeColor,
}) => {
  // This is the critical fix: return early before calling any hooks.
  if (!profile.characterParams) {
    return null;
  }

  // Hooks are now safe to call.
  const [name, setName] = React.useState(richTextToString(profile.name));
  React.useEffect(() => {
    setName(richTextToString(profile.name));
  }, [profile.name]);

  const handleNameBlur = () => {
    if (name !== richTextToString(profile.name)) {
      onUpdateName(profile.id, name);
    }
  };

  return (
    <div className="p-3 bg-panel-header rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-grow p-1.5 border border-panel-border rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red"
          aria-label="Character name"
        />
        <button onClick={() => onRegenerateName(profile.id)} className="p-1.5 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Regenerar nombre">
          <DiceIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 p-1.5 bg-white border border-panel-border rounded-md">
          <label htmlFor={`color-${profile.id}`} className="font-semibold text-condorito-brown">Color</label>
          <input
            type="color"
            id={`color-${profile.id}`}
            value={profile.characterParams.bodyColor}
            onChange={e => onUpdateParam(profile.id, 'bodyColor', e.target.value)}
            className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
          />
          <button onClick={() => onRandomizeColor(profile.id)} className="ml-auto p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Color aleatorio">
            <DiceIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-white border border-panel-border rounded-md">
          <button onClick={() => onSelectForAppearance(profile.id)} className="flex-grow text-left font-semibold text-condorito-brown hover:text-condorito-red transition-colors">
            Apariencia
          </button>
          <button onClick={() => onRandomizeAppearance(profile.id)} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Apariencia aleatoria">
            <DiceIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { 
    panels, fullScreenPanelKey, backgroundOptions, onBackgroundOptionsChange, showBoundingBoxes, onShowBoundingBoxesChange, uiScale, onUiScaleChange, comicFontFamily, onComicFontFamilyChange, comicTheme, onComicThemeChange, comicScene, onComicSceneChange, onRandomizeComicScene, isRandomizingScene, onAppendComicTheme, numComicPanels, onNumComicPanelsChange, numComicPages, onNumComicPagesChange, useNanoBananaOnly, onUseNanoBananaOnlyChange, useProceduralBackgrounds, onUseProceduralBackgroundsChange, comicAspectRatio, onComicAspectRatioChange, minComicFontSize, onMinComicFontSizeChange, maxComicFontSize, onMaxComicFontSizeChange, comicLanguage, onComicLanguageChange, onGenerateComic, onGenerateAllAndComic, isGeneratingComic, onRandomizeComic, isRandomizingComic, comicPanels, onRandomizeComicCharacters, togglePanel, updatePanelPosition, bringToFront,
    // Narrative props
    lore, onLoreChange, characterProfiles, onCharacterProfilesChange, selectedCharId, onSelectedCharIdChange, onDeleteCharacter, story, onStoryChange, onGenerateNarrativeElement, onGenerateSimpleCharacters, isGeneratingSimpleCharacters, onRegenerateCharacterName, onRandomizeCharacterAppearance, comicMode, onComicModeChange, characterEditorTab, onCharacterEditorTabChange,
    setApiError, onGenerateProject,
    // Script Editor props
    narrativeScript, onNarrativeScriptChange, selectedPageIndex, onSelectedPageIndexChange, selectedPanelIndex, onSelectedPanelIndexChange,
    // Background Editor props
    proceduralBackgrounds, onProceduralBackgroundsChange, selectedBackgroundId, onSelectedBackgroundIdChange,
  } = props;
  
  const [activeComicTab, setActiveComicTab] = React.useState<'main' | 'characters' | 'scene'>('main');
  const [sceneViewTab, setSceneViewTab] = useState<'setup' | 'page' | 'panel'>('setup');
  const [numSimpleChars, setNumSimpleChars] = React.useState(2);

  const panelsToRender = fullScreenPanelKey
    ? [fullScreenPanelKey]
    : (Object.keys(panels) as PanelKey[]);

    
  const handleUpdateCharacterName = (characterId: string, newName: string) => {
    onCharacterProfilesChange(prev => prev.map(p => 
        p.id === characterId ? {...p, name: stringToRichText(newName, 'user')} : p
    ));
  };
  
  const handleUpdateCharacterParam = (characterId: string, param: keyof CharacterParams, value: any) => {
    onCharacterProfilesChange(prev => prev.map(p => {
        if (p.id === characterId && p.characterParams) {
            return {
                ...p,
                characterParams: { ...p.characterParams, [param]: value }
            };
        }
        return p;
    }));
  };

  const handleRandomizeCharacterColor = (characterId: string) => {
    const newColor = getRandomParamValue('bodyColor');
    handleUpdateCharacterParam(characterId, 'bodyColor', newColor);
  };
  
  const handleScriptChange = (
      pageIndex: number, 
      panelIndex: number | null, 
      field: string, 
      value: any,
      dialogueIndex: number | null = null,
      dialogueField: 'characterId' | 'text' | null = null
  ) => {
    if (!narrativeScript) return;
    const newScript = structuredClone(narrativeScript);

    if (panelIndex === null) { // Page-level change
      (newScript.pages[pageIndex] as any)[field] = value;
    } else { // Panel-level change
      const panel = newScript.pages[pageIndex].panels[panelIndex];
      if (dialogueIndex !== null && dialogueField !== null) {
        panel.dialogues[dialogueIndex][dialogueField] = value;
      } else {
        (panel as any)[field] = value;
      }
    }
    onNarrativeScriptChange(newScript);
  };


  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {panelsToRender.map((key) => {
        const panelState = panels[key];
        if (!panelState.isOpen) return null;
        
        const isFullScreen = key === fullScreenPanelKey;
        const isWidePanel = !isFullScreen && (key === 'LoreEditor' || key === 'CharacterEditor' || key === 'Comic' || key === 'BackgroundEditor');

        let title: string = key;
        if (key === 'LoreEditor') title = 'Editor de Universo';
        if (key === 'CharacterEditor') title = 'Editor de Personajes';
        if (key === 'BackgroundEditor') title = 'Editor de Fondos';
        if (key === 'TrendingTheme') title = 'Trending Theme';
        if (key === 'ProjectSettings') title = 'Project Settings';


        let content: React.ReactNode = null;
        switch (key) {
          case 'BackgroundEditor':
            content = (
              <BackgroundEditor
                backgrounds={proceduralBackgrounds}
                onBackgroundsChange={onProceduralBackgroundsChange}
                selectedId={selectedBackgroundId}
                onSelectedIdChange={onSelectedBackgroundIdChange}
                setApiError={setApiError}
              />
            );
            break;
          case 'ProjectSettings': {
            content = (
              <ProjectSettingsPanel
                onGenerateProject={onGenerateProject}
                isGenerating={isGeneratingComic}
              />
            );
            break;
          }
          case 'TrendingTheme':
            content = (
              <TrendingThemePanel
                onAppendTheme={onAppendComicTheme}
                setApiError={setApiError}
              />
            );
            break;
          case 'LoreEditor':
            content = (
              <LoreEditor 
                lore={lore}
                onLoreChange={onLoreChange}
                characterProfiles={characterProfiles}
                story={story}
                onStoryChange={onStoryChange}
                onGenerateNarrativeElement={onGenerateNarrativeElement}
                togglePanel={togglePanel}
                setApiError={setApiError}
              />
            );
            break;
          case 'CharacterEditor':
             content = (
              <CharacterEditor
                lore={lore}
                characterProfiles={characterProfiles}
                onCharacterProfilesChange={onCharacterProfilesChange}
                selectedCharId={selectedCharId}
                onSelectedCharIdChange={onSelectedCharIdChange}
                onDeleteCharacter={onDeleteCharacter}
                onGenerateNarrativeElement={onGenerateNarrativeElement}
                setApiError={setApiError}
                activeMainTab={characterEditorTab}
                onActiveMainTabChange={onCharacterEditorTabChange}
              />
            );
            break;
          case 'Comic':
            const fontOptions = ['Comic Neue', 'Bangers', 'Luckiest Guy', 'Fredoka'];
            const SubTabButton = ({ label, active, onClick, disabled }: { label: string, active: boolean, onClick: () => void, disabled?: boolean }) => (
              <button onClick={onClick} disabled={disabled} className={`select-none flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown bg-panel-header/0 hover:bg-panel-border'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {label}
              </button>
            );
             const ShapeSelector = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (value: string) => void }) => (
              <div>
                <label className="font-medium text-condorito-brown select-none text-xs mb-1 block">{label}</label>
                <div className="grid grid-cols-3 gap-1 w-full bg-panel-header rounded-lg p-1">
                  {options.map(option => (
                    <button
                      key={option}
                      onClick={() => onChange(option)}
                      className={`select-none w-full py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${value === option ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
                    >
                      {option.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            );
            content = (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex-grow space-y-3 overflow-y-auto pr-1 -mr-1">
                    <div className="flex w-full bg-panel-header rounded-lg p-1">
                      <button onClick={() => onComicModeChange('simple')} className={`select-none w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${comicMode === 'simple' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}>Simple</button>
                      <button onClick={() => onComicModeChange('custom')} className={`select-none w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${comicMode === 'custom' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}>Custom</button>
                    </div>
                    
                    <div className="flex gap-1 p-1 bg-panel-header rounded-lg">
                      <SubTabButton label="Main" active={activeComicTab === 'main'} onClick={() => setActiveComicTab('main')} />
                      <SubTabButton label="Characters" active={activeComicTab === 'characters'} onClick={() => setActiveComicTab('characters')} />
                      <SubTabButton label="Scene" active={activeComicTab === 'scene'} onClick={() => setActiveComicTab('scene')} />
                    </div>

                    <div className="pt-2">
                      {activeComicTab === 'main' && (
                        <div className="space-y-4">
                          {comicMode === 'simple' ? (
                            <>
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label htmlFor="comic-theme" className="block text-xs font-medium text-condorito-brown select-none">Comic Theme</label>
                                  <button onClick={onRandomizeComic} disabled={isRandomizingComic} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Randomize Theme" title="Randomize Theme">
                                      <DiceIcon className={`w-4 h-4 ${isRandomizingComic ? 'animate-spin' : ''}`} />
                                  </button>
                                </div>
                                <textarea id="comic-theme" value={comicTheme} onChange={e => onComicThemeChange(e.target.value)} rows={3} className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white text-condorito-brown" placeholder="e.g., a robot discovers friendship" />
                                <button onClick={() => togglePanel('TrendingTheme', 'Comic')} className="w-full mt-2 bg-condorito-green text-white font-bold py-1.5 px-4 rounded-lg text-xs hover:brightness-95 transition-colors">
                                    Trending Theme
                                </button>
                              </div>
                              <Slider label="Panels" min={1} max={6} step={1} value={numComicPanels} onChange={e => onNumComicPanelsChange(Number(e.target.value))} />
                              <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                                <label htmlFor="nano-banana-only" className="font-medium text-condorito-brown select-none text-xs">Only Nano Banana</label>
                                <input type="checkbox" id="nano-banana-only" checked={useNanoBananaOnly} onChange={e => onUseNanoBananaOnlyChange(e.target.checked)} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red/80 cursor-pointer" />
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                                <label htmlFor="procedural-bg-only" className="font-medium text-condorito-brown select-none text-xs">Only Procedural Background</label>
                                <input type="checkbox" id="procedural-bg-only" checked={useProceduralBackgrounds} onChange={e => onUseProceduralBackgroundsChange(e.target.checked)} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red/80 cursor-pointer" />
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-3 p-2">
                                <p className="text-xs text-condorito-brown select-none">Build your comic from a deep narrative foundation.</p>
                                <button onClick={() => togglePanel('LoreEditor')} className="w-full bg-condorito-wood text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors"> Open Universe Editor </button>
                            </div>
                          )}
                           <div className="pt-4 mt-4 border-t border-panel-header space-y-3">
                             <div> <label htmlFor="language-select" className="block text-xs font-medium text-condorito-brown mb-1 select-none">Language</label> <select id="language-select" value={comicLanguage} onChange={(e) => onComicLanguageChange(e.target.value)} className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"> <option value="es">Español</option> <option value="en">Inglés</option> <option value="ja">Japonés</option> <option value="zh">Chino</option> <option value="ru">Ruso</option> <option value="hi">Hindi</option> </select> </div>
                             <ShapeSelector label="Aspect Ratio" value={comicAspectRatio} options={['1:1', '16:9', '9:16']} onChange={(v) => onComicAspectRatioChange(v as '1:1' | '16:9' | '9:16')} />
                             <div>
                               <label htmlFor="font-select" className="block text-xs font-medium text-condorito-brown mb-1 select-none">Font Family</label>
                               <select 
                                 id="font-select" 
                                 value={comicFontFamily} 
                                 onChange={(e) => onComicFontFamilyChange(e.target.value)} 
                                 className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"
                               >
                                 {fontOptions.map(font => (
                                   <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                 ))}
                               </select>
                             </div>
                             <Slider label="Min Font Size" min={10} max={27} step={1} value={minComicFontSize} onChange={e => onMinComicFontSizeChange(Number(e.target.value))} />
                             <Slider label="Max Font Size" min={10} max={27} step={1} value={maxComicFontSize} onChange={e => onMaxComicFontSizeChange(Number(e.target.value))} />
                           </div>
                        </div>
                      )}
                      {activeComicTab === 'characters' && (
                        <div className="space-y-3">
                          {comicMode === 'simple' ? (
                            <div className="space-y-4">
                              <p className="text-xs text-center p-2 bg-panel-header rounded-lg text-condorito-brown">
                                Los personajes se generarán automáticamente a partir del guion del cómic.
                              </p>
                              {characterProfiles.length > 0 ? (
                                <div className="space-y-2 pt-4 border-t border-panel-header">
                                  <p className="text-xs text-condorito-brown select-none">
                                    Personajes actuales.
                                  </p>
                                  {characterProfiles.map(profile => (
                                      <CharacterListItem
                                          key={profile.id}
                                          profile={profile}
                                          onUpdateName={handleUpdateCharacterName}
                                          onRegenerateName={onRegenerateCharacterName}
                                          onUpdateParam={handleUpdateCharacterParam}
                                          onSelectForAppearance={(id) => {
                                              onSelectedCharIdChange(id);
                                              onCharacterEditorTabChange('appearance');
                                              togglePanel('CharacterEditor');
                                          }}
                                          onRandomizeAppearance={onRandomizeCharacterAppearance}
                                          onRandomizeColor={handleRandomizeCharacterColor}
                                      />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-center text-xs text-condorito-brown select-none p-4">
                                  Haga clic en "Generate Comic" para crear un guion y sus personajes.
                                </p>
                              )}
                            </div>
                          ) : (
                             <div className="text-center space-y-3 p-2">
                                <p className="text-xs text-condorito-brown select-none">Characters for your story are managed in their own dedicated editor.</p>
                                <button onClick={() => togglePanel('CharacterEditor')} className="w-full bg-condorito-wood text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors"> Open Character Editor </button>
                            </div>
                          )}
                        </div>
                      )}
                      {activeComicTab === 'scene' && (
                        <div className="space-y-4">
                            <div className="flex gap-1 p-1 bg-panel-header rounded-lg">
                                <SubTabButton label="Setup" active={sceneViewTab === 'setup'} onClick={() => setSceneViewTab('setup')} />
                                <SubTabButton label="Página" active={sceneViewTab === 'page'} onClick={() => setSceneViewTab('page')} disabled={!narrativeScript} />
                                <SubTabButton label="Viñeta" active={sceneViewTab === 'panel'} onClick={() => setSceneViewTab('panel')} disabled={!narrativeScript} />
                            </div>

                            {sceneViewTab === 'setup' && (
                                <div className="space-y-4 p-2 bg-panel-back rounded-lg">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="comic-scene" className="block text-xs font-medium text-condorito-brown select-none">Scene Description</label>
                                            <button onClick={onRandomizeComicScene} disabled={isRandomizingScene} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Randomize Scene" title="Randomize Scene">
                                                <DiceIcon className={`w-4 h-4 ${isRandomizingScene ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                        <textarea id="comic-scene" value={comicScene} onChange={e => onComicSceneChange(e.target.value)} rows={4} className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white text-condorito-brown" placeholder="e.g., Two friends in a park" />
                                    </div>
                                    {comicMode === 'simple' && (
                                        <Slider 
                                            label="Número de Páginas"
                                            min={1}
                                            max={20}
                                            step={1}
                                            value={numComicPages}
                                            onChange={e => onNumComicPagesChange(Number(e.target.value))}
                                        />
                                    )}
                                    <p className="text-xs text-condorito-brown/80 select-none">
                                        Describe el lugar y la situación donde se desarrolla toda la tira cómica para mantener la coherencia del fondo.
                                    </p>
                                </div>
                            )}
                            
                            {narrativeScript && sceneViewTab === 'page' && (
                                <div className="space-y-3 p-2 bg-panel-back rounded-lg">
                                  <label className="text-xs font-semibold text-condorito-brown select-none">Seleccionar Página</label>
                                  <div className="flex gap-1 p-1 bg-panel-header rounded-lg overflow-x-auto">
                                    {narrativeScript.pages.map((page, index) => (
                                      <button key={page.pageNumber} onClick={() => onSelectedPageIndexChange(index)} className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${selectedPageIndex === index ? 'bg-white text-condorito-red shadow-sm' : 'hover:bg-panel-border'}`}>
                                        P. {page.pageNumber}
                                      </button>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-condorito-brown select-none">Contexto de la Página</label>
                                    <textarea
                                      value={narrativeScript.pages[selectedPageIndex]?.context || ''}
                                      onChange={e => handleScriptChange(selectedPageIndex, null, 'context', e.target.value)}
                                      rows={4}
                                      className="mt-1 w-full p-2 border border-panel-header rounded-md text-xs bg-white"
                                    />
                                  </div>
                                </div>
                            )}

                            {narrativeScript && sceneViewTab === 'panel' && (
                                <div className="space-y-3 p-2 bg-panel-back rounded-lg">
                                  <label className="text-xs font-semibold text-condorito-brown select-none">Seleccionar Viñeta (P. {selectedPageIndex + 1})</label>
                                  <div className="flex gap-1 p-1 bg-panel-header rounded-lg overflow-x-auto">
                                    {narrativeScript.pages[selectedPageIndex]?.panels.map((panel, index) => (
                                      <button key={panel.panelNumber} onClick={() => onSelectedPanelIndexChange(index)} className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${selectedPanelIndex === index ? 'bg-white text-condorito-red shadow-sm' : 'hover:bg-panel-border'}`}>
                                        V. {panel.panelNumber}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {(() => {
                                    const panel = narrativeScript.pages[selectedPageIndex]?.panels[selectedPanelIndex];
                                    if (!panel) return <p className="text-xs text-center p-4">Seleccione una viñeta.</p>;

                                    const fields: (keyof typeof panel)[] = ['description', 'emotion', 'shotType', 'techNotes', 'dynamicAlt'];

                                    return (
                                        <div className="space-y-3">
                                            {fields.map(field => (
                                                <div key={field}>
                                                    <label className="text-xs font-semibold text-condorito-brown capitalize select-none">{String(field).replace(/([A-Z])/g, ' $1')}</label>
                                                    <textarea
                                                        value={panel[field] as string}
                                                        onChange={e => handleScriptChange(selectedPageIndex, selectedPanelIndex, String(field), e.target.value)}
                                                        rows={field === 'description' ? 3 : 2}
                                                        className="mt-1 w-full p-2 border border-panel-header rounded-md text-xs bg-white"
                                                    />
                                                </div>
                                            ))}

                                            {/* Dialogue Editor */}
                                            <div className="space-y-2 pt-2 border-t border-panel-header">
                                                <h4 className="text-xs font-semibold text-condorito-brown">Diálogos</h4>
                                                {panel.dialogues.map((dialogue, index) => (
                                                    <div key={index} className="p-2 bg-panel-header rounded-md space-y-2">
                                                        <div className="flex items-center gap-2">
                                                          <select
                                                              value={dialogue.characterId}
                                                              onChange={e => handleScriptChange(selectedPageIndex, selectedPanelIndex, 'dialogues', Number(e.target.value), index, 'characterId')}
                                                              className="flex-grow p-1 border border-panel-border rounded-md text-xs bg-white"
                                                          >
                                                            {characterProfiles.map((p, charIndex) => <option key={p.id} value={charIndex}>{richTextToString(p.name)}</option>)}
                                                          </select>
                                                          <button onClick={() => {
                                                              const newDialogues = panel.dialogues.filter((_, i) => i !== index);
                                                              handleScriptChange(selectedPageIndex, selectedPanelIndex, 'dialogues', newDialogues);
                                                          }} className="p-1 text-condorito-red rounded-full hover:bg-red-100">&times;</button>
                                                        </div>
                                                        <textarea
                                                            value={dialogue.text}
                                                            onChange={e => handleScriptChange(selectedPageIndex, selectedPanelIndex, 'dialogues', e.target.value, index, 'text')}
                                                            rows={2}
                                                            className="w-full p-1 border border-panel-border rounded-md text-xs bg-white"
                                                        />
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const newDialogue: DialogueData = { characterId: 0, text: '' };
                                                    const newDialogues = [...panel.dialogues, newDialogue];
                                                    handleScriptChange(selectedPageIndex, selectedPanelIndex, 'dialogues', newDialogues);
                                                }} className="w-full text-xs font-semibold text-condorito-green py-1 rounded-md hover:bg-green-100">+ Añadir Diálogo</button>
                                            </div>
                                            
                                            {/* Characters in Panel Editor */}
                                            <div className="space-y-1 pt-2 border-t border-panel-header">
                                              <h4 className="text-xs font-semibold text-condorito-brown">Personajes en Viñeta</h4>
                                              {characterProfiles.map((p, charIndex) => (
                                                  <div key={p.id} className="flex items-center gap-2">
                                                      <input
                                                          type="checkbox"
                                                          id={`char-in-panel-${p.id}`}
                                                          checked={panel.charactersInPanel.includes(charIndex)}
                                                          onChange={e => {
                                                              const newChars = e.target.checked
                                                                  ? [...panel.charactersInPanel, charIndex]
                                                                  : panel.charactersInPanel.filter(id => id !== charIndex);
                                                              handleScriptChange(selectedPageIndex, selectedPanelIndex, 'charactersInPanel', newChars.sort((a, b) => a - b));
                                                          }}
                                                          className="h-4 w-4 rounded border-panel-header text-condorito-red focus:ring-condorito-red"
                                                      />
                                                      <label htmlFor={`char-in-panel-${p.id}`} className="text-xs select-none">{richTextToString(p.name)}</label>
                                                  </div>
                                              ))}
                                            </div>
                                        </div>
                                    );
                                  })()}
                                </div>
                            )}
                        </div>
                      )}
                    </div>
                </div>
                <div className="flex-shrink-0 pt-3 mt-auto border-t border-panel-header">
                  {comicMode === 'simple' ? (
                     <button onClick={() => onGenerateComic('simple')} disabled={isGeneratingComic} className="w-full relative overflow-hidden bg-condorito-red text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors disabled:bg-panel-border disabled:cursor-not-allowed flex items-center justify-center">
                        <span className="relative z-10">{isGeneratingComic ? 'Generating...' : 'Generate Comic'}</span>
                        {isGeneratingComic && <div className="absolute inset-0 loading-bar-progress"></div>}
                      </button>
                  ) : (
                    <div className="space-y-2">
                       {!lore && !story && characterProfiles.length === 0 &&
                          <button onClick={onGenerateAllAndComic} disabled={isGeneratingComic} className="w-full relative overflow-hidden bg-condorito-green text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors disabled:bg-panel-border disabled:cursor-not-allowed flex items-center justify-center">
                              <span className="relative z-10">{isGeneratingComic ? 'Generating...' : 'Generate All & Create Comic'}</span>
                              {isGeneratingComic && <div className="absolute inset-0 loading-bar-progress"></div>}
                          </button>
                        }
                        <button onClick={() => onGenerateComic('custom')} disabled={isGeneratingComic || !story} className="w-full relative overflow-hidden bg-condorito-red text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors disabled:bg-panel-border disabled:cursor-not-allowed flex items-center justify-center">
                          <span className="relative z-10">{isGeneratingComic ? 'Generating...' : 'Generate From Story'}</span>
                          {isGeneratingComic && <div className="absolute inset-0 loading-bar-progress"></div>}
                        </button>
                    </div>
                  )}
                </div>
              </div>
            );
            break;
          case 'Options':
            content = ( <div className="space-y-3">
               <Slider
                 label="Scale"
                 min={25}
                 max={200}
                 step={1}
                 value={uiScale}
                 onChange={e => onUiScaleChange(Number(e.target.value))}
               />
               <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                   <label htmlFor="showBoundingBoxes" className="font-medium text-condorito-brown select-none text-xs">Bounding Boxes</label>
                   <input type="checkbox" id="showBoundingBoxes" checked={showBoundingBoxes} onChange={e => onShowBoundingBoxesChange(e.target.checked)} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red/80 cursor-pointer" />
               </div>
               
               <div className="pt-3 mt-3 border-t border-panel-header">
                   <h3 className="font-semibold text-condorito-brown mb-2 select-none">Background</h3>
                   <div className="space-y-2">
                       <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                           <label htmlFor="bgColor1" className="font-medium text-xs text-condorito-brown select-none">Color 1</label>
                           <input type="color" id="bgColor1" value={backgroundOptions.color1} onChange={e => onBackgroundOptionsChange({ color1: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                       </div>
                       <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                           <label htmlFor="bgColor2" className="font-medium text-xs text-condorito-brown select-none">Color 2</label>
                           <input type="color" id="bgColor2" value={backgroundOptions.color2} onChange={e => onBackgroundOptionsChange({ color2: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                       </div>
                       <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
                           <label htmlFor="bgAnimation" className="font-medium text-condorito-brown select-none text-xs">Animate</label>
                           <input type="checkbox" id="bgAnimation" checked={backgroundOptions.animation} onChange={e => onBackgroundOptionsChange({ animation: e.target.checked })} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red/80 cursor-pointer" />
                       </div>
                   </div>
               </div>
            </div> );
            break;
          case 'About':
            content = (
              <div className="text-xs text-condorito-brown space-y-3 select-none flex flex-col items-center">
                <img src={COMPULSIVO_LOGO_BASE64} alt="Compulsivo Studio Logo" className="w-32 h-auto" />
                <p className="font-bold text-sm text-condorito-red pt-2">Plop!</p>
                <p>Developed by Compulsivo Studio - 2025</p>
              </div>
            );
            break;
        }

        return (
          <ControlModule
            key={key}
            title={title}
            isFullScreen={key === 'CharacterEditor' || isFullScreen}
            initialPosition={panelState.position}
            zIndex={panelState.zIndex}
            onClose={() => togglePanel(key)}
            onPositionChange={(pos) => updatePanelPosition(key, pos)}
            onFocus={() => bringToFront(key)}
            wide={isWidePanel}
            fullHeight={key === 'Comic' || (key === 'CharacterEditor' && characterEditorTab === 'appearance')}
          >
            {content}
          </ControlModule>
        );
      })}
    </div>
  );
};

export default ControlPanel;
