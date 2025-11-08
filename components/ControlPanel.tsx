import React from 'react';
// FIX: Add missing import for BackgroundOptions
import type { CharacterParams, CharacterProfile, ComicPanelData, Lore, RichText, Story, BackgroundOptions } from '../types';
import { CompulsivoLogo, DiceIcon } from './icons';
import Slider from './Slider';
import ControlModule from './ControlModule';
import LoreEditor from './NarrativeEditor';
import CharacterEditor from './CharacterEditor';
import TrendingThemePanel from './TrendingThemePanel';
import { generateRandomAppearanceParams, getRandomParamValue } from '../services/characterGenerationService';

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
  onAppendComicTheme: (theme: string) => void;
  numComicPanels: number;
  onNumComicPanelsChange: (value: number) => void;
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
  comicMode: 'simple' | 'custom';
  onComicModeChange: (mode: 'simple' | 'custom') => void;
  characterEditorTab: 'narrative' | 'appearance';
  onCharacterEditorTabChange: (tab: 'narrative' | 'appearance') => void;
  setApiError: (error: string | null) => void;
}

export type PanelKey = 'Options' | 'About' | 'Comic' | 'LoreEditor' | 'CharacterEditor' | 'TrendingTheme';

export interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
const stringToRichText = (text: string, source: 'user' | 'ai'): RichText => [{ text, source }];

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { 
    panels, fullScreenPanelKey, backgroundOptions, onBackgroundOptionsChange, showBoundingBoxes, onShowBoundingBoxesChange, uiScale, onUiScaleChange, comicFontFamily, onComicFontFamilyChange, comicTheme, onComicThemeChange, onAppendComicTheme, numComicPanels, onNumComicPanelsChange, comicAspectRatio, onComicAspectRatioChange, minComicFontSize, onMinComicFontSizeChange, maxComicFontSize, onMaxComicFontSizeChange, comicLanguage, onComicLanguageChange, onGenerateComic, onGenerateAllAndComic, isGeneratingComic, onRandomizeComic, isRandomizingComic, comicPanels, onRandomizeComicCharacters, togglePanel, updatePanelPosition, bringToFront,
    // Narrative props
    lore, onLoreChange, characterProfiles, onCharacterProfilesChange, selectedCharId, onSelectedCharIdChange, onDeleteCharacter, story, onStoryChange, onGenerateNarrativeElement, onGenerateSimpleCharacters, isGeneratingSimpleCharacters, onRegenerateCharacterName, comicMode, onComicModeChange, characterEditorTab, onCharacterEditorTabChange,
    setApiError,
  } = props;
  
  const [activeComicTab, setActiveComicTab] = React.useState<'main' | 'characters' | 'options'>('main');
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

  const handleRandomizeCharacterAppearance = (characterId: string) => {
    onCharacterProfilesChange(prev => prev.map(p => {
        if (p.id === characterId) {
            return {
                ...p,
                characterParams: generateRandomAppearanceParams(p.characterParams),
            };
        }
        return p;
    }));
  };


  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {panelsToRender.map((key) => {
        const panelState = panels[key];
        if (!panelState.isOpen) return null;
        
        const isFullScreen = key === fullScreenPanelKey;
        const isWidePanel = !isFullScreen && (key === 'LoreEditor' || key === 'CharacterEditor' || key === 'Comic');

        let title: string = key;
        if (key === 'LoreEditor') title = 'Editor de Universo';
        if (key === 'CharacterEditor') title = 'Editor de Personajes';
        if (key === 'TrendingTheme') title = 'Trending Theme';


        let content: React.ReactNode = null;
        switch (key) {
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
            const SubTabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
              <button onClick={onClick} className={`select-none flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${active ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown bg-panel-header/0 hover:bg-panel-border'}`}>
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
                      <SubTabButton label="Options" active={activeComicTab === 'options'} onClick={() => setActiveComicTab('options')} />
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
                            </>
                          ) : (
                            <div className="text-center space-y-3 p-2">
                                <p className="text-xs text-condorito-brown select-none">Build your comic from a deep narrative foundation.</p>
                                <button onClick={() => togglePanel('LoreEditor')} className="w-full bg-condorito-wood text-white font-bold py-2 px-4 rounded-lg hover:brightness-95 transition-colors"> Open Universe Editor </button>
                            </div>
                          )}
                           <div className="pt-4 mt-4 border-t border-panel-header space-y-3">
                             <div> <label htmlFor="language-select" className="block text-xs font-medium text-condorito-brown mb-1 select-none">Language</label> <select id="language-select" value={comicLanguage} onChange={(e) => onComicLanguageChange(e.target.value)} className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"> <option value="es">Español</option> <option value="en">Inglés</option> <option value="ja">Japonés</option> <option value="zh">Chino</option> <option value="ru">Ruso</option> <option value="hi">Hindi</option> </select> </div>
                             <Slider label="Min Font Size" min={10} max={27} step={1} value={minComicFontSize} onChange={e => onMinComicFontSizeChange(Number(e.target.value))} />
                             <Slider label="Max Font Size" min={10} max={27} step={1} value={maxComicFontSize} onChange={e => onMaxComicFontSizeChange(Number(e.target.value))} />
                           </div>
                        </div>
                      )}
                      {activeComicTab === 'characters' && (
                        <div className="space-y-3">
                          {comicMode === 'simple' ? (
                            <div className="space-y-4">
                              <Slider 
                                label="Cantidad de Personajes"
                                min={1}
                                max={4}
                                step={1}
                                value={numSimpleChars}
                                onChange={e => setNumSimpleChars(Number(e.target.value))}
                              />
                              <div className="space-y-2">
                                <button
                                  onClick={() => onGenerateSimpleCharacters(numSimpleChars)}
                                  disabled={isGeneratingSimpleCharacters}
                                  className="w-full relative overflow-hidden bg-condorito-red text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:brightness-95 transition-colors disabled:bg-panel-border disabled:cursor-not-allowed"
                                >
                                  <span className="relative z-10 flex items-center justify-center gap-2">
                                    <DiceIcon className={`w-4 h-4 ${isGeneratingSimpleCharacters ? 'animate-spin' : ''}`} />
                                    <span>{isGeneratingSimpleCharacters ? 'Generating...' : 'Generate Characters'}</span>
                                  </span>
                                  {isGeneratingSimpleCharacters && <div className="absolute inset-0 loading-bar-progress"></div>}
                                </button>
                                <button
                                  onClick={() => onGenerateNarrativeElement('character')}
                                  className="w-full bg-condorito-green text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:brightness-95 transition-colors"
                                >
                                  + Add Character
                                </button>
                              </div>

                              {characterProfiles.length > 0 ? (
                                <div className="space-y-2 pt-4 border-t border-panel-header">
                                  <p className="text-xs text-condorito-brown select-none">
                                    Personajes actuales.
                                  </p>
                                  {characterProfiles.map(profile => {
                                      const [name, setName] = React.useState(richTextToString(profile.name));
                                      React.useEffect(() => {
                                        setName(richTextToString(profile.name));
                                      }, [profile.name]);

                                      const handleNameBlur = () => {
                                        if (name !== richTextToString(profile.name)) {
                                          handleUpdateCharacterName(profile.id, name);
                                        }
                                      };

                                      if (!profile.characterParams) return null;

                                      return (
                                        <div key={profile.id} className="p-3 bg-panel-header rounded-lg space-y-3">
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
                                            <button onClick={() => onRegenerateCharacterName(profile.id)} className="p-1.5 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Regenerar nombre">
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
                                                onChange={e => handleUpdateCharacterParam(profile.id, 'bodyColor', e.target.value)}
                                                className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                                              />
                                              <button onClick={() => handleRandomizeCharacterColor(profile.id)} className="ml-auto p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Color aleatorio">
                                                <DiceIcon className="w-4 h-4" />
                                              </button>
                                            </div>
                                            <div className="flex items-center gap-2 p-1.5 bg-white border border-panel-border rounded-md">
                                              <button onClick={() => {
                                                onSelectedCharIdChange(profile.id);
                                                onCharacterEditorTabChange('appearance');
                                                togglePanel('CharacterEditor');
                                              }} className="flex-grow text-left font-semibold text-condorito-brown hover:text-condorito-red transition-colors">
                                                Apariencia
                                              </button>
                                              <button onClick={() => handleRandomizeCharacterAppearance(profile.id)} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Apariencia aleatoria">
                                                <DiceIcon className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ) : (
                                <p className="text-center text-xs text-condorito-brown select-none p-4">
                                  Usa los botones de arriba para crear personajes para tu cómic.
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
                      {activeComicTab === 'options' && (
                        <div className="space-y-4">
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
                <CompulsivoLogo className="w-32 h-auto text-condorito-wood" />
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
            isFullScreen={isFullScreen}
            initialPosition={panelState.position}
            zIndex={panelState.zIndex}
            onClose={() => togglePanel(key)}
            onPositionChange={(pos) => updatePanelPosition(key, pos)}
            onFocus={() => bringToFront(key)}
            wide={isWidePanel}
            fullHeight={key === 'Comic'}
          >
            {content}
          </ControlModule>
        );
      })}
    </div>
  );
};

export default ControlPanel;