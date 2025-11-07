import React from 'react';
import type { CharacterParams, BackgroundOptions, Lore, CharacterProfile, Story } from '../types';
import Slider from './Slider';
import ControlModule from './ControlModule';
import LoreEditor from './NarrativeEditor';
import CharacterEditor from './CharacterEditor';

interface ControlPanelProps {
  panels: Record<PanelKey, PanelState>;
  backgroundOptions: BackgroundOptions;
  onBackgroundOptionsChange: (options: Partial<BackgroundOptions>) => void;
  showBoundingBoxes: boolean;
  onShowBoundingBoxesChange: (enabled: boolean) => void;
  // Comic controls
  comicTheme: string;
  onComicThemeChange: (value: string) => void;
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
  isGeneratingComic: boolean;
  // Panel controls
  togglePanel: (key: PanelKey) => void;
  updatePanelPosition: (key: PanelKey, position: { x: number; y: number }) => void;
  bringToFront: (key: PanelKey) => void;
  // Narrative props
  lore: Lore | null;
  onLoreChange: (lore: Lore | null) => void;
  characterProfiles: CharacterProfile[];
  onCharacterProfilesChange: (profiles: CharacterProfile[]) => void;
  selectedCharId: string | null;
  onSelectedCharIdChange: (id: string | null) => void;
  onDeleteCharacter: (id: string) => void;
  story: Story | null;
  onStoryChange: (story: Story | null) => void;
  onGenerateNarrativeElement: (elementType: 'lore' | 'character' | 'story', context?: any) => Promise<any>;
  comicMode: 'simple' | 'custom';
  onComicModeChange: (mode: 'simple' | 'custom') => void;
  setApiError: (error: string | null) => void;
}

export type PanelKey = 'Options' | 'About' | 'Comic' | 'LoreEditor' | 'CharacterEditor';

export interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const { 
    panels, backgroundOptions, onBackgroundOptionsChange, showBoundingBoxes, onShowBoundingBoxesChange, comicTheme, onComicThemeChange, numComicPanels, onNumComicPanelsChange, comicAspectRatio, onComicAspectRatioChange, minComicFontSize, onMinComicFontSizeChange, maxComicFontSize, onMaxComicFontSizeChange, comicLanguage, onComicLanguageChange, onGenerateComic, isGeneratingComic, togglePanel, updatePanelPosition, bringToFront,
    // Narrative props
    lore, onLoreChange, characterProfiles, onCharacterProfilesChange, selectedCharId, onSelectedCharIdChange, onDeleteCharacter, story, onStoryChange, onGenerateNarrativeElement, comicMode, onComicModeChange,
    setApiError,
  } = props;
  
  const ShapeSelector = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (value: string) => void }) => (
    <div>
      <label className="font-medium text-[#8C5A3A] select-none text-sm mb-1 block">{label}</label>
      <div className="grid grid-cols-3 gap-1 w-full bg-[#FDEFE2] rounded-lg p-1">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${value === option ? 'bg-white text-red-600 shadow-sm' : 'text-[#8C5A3A] hover:bg-[#D6A27E]'}`}
          >
            {option.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {(Object.keys(panels) as PanelKey[]).map((key) => {
        const panelState = panels[key];
        if (!panelState.isOpen) return null;
        
        const isWidePanel = key === 'LoreEditor' || key === 'CharacterEditor';
        let title: string = key;
        if (key === 'LoreEditor') title = 'Editor de Universo';
        if (key === 'CharacterEditor') title = 'Editor de Personajes';


        let content: React.ReactNode = null;
        switch (key) {
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
              />
            );
            break;
          case 'Comic':
            content = (
              <div className="space-y-4">
                <div className="flex w-full bg-[#FDEFE2] rounded-lg p-1 mb-4">
                  <button onClick={() => onComicModeChange('simple')} className={`w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${comicMode === 'simple' ? 'bg-white text-red-600 shadow-sm' : 'text-[#8C5A3A] hover:bg-[#D6A27E]'}`}>Simple</button>
                  <button onClick={() => onComicModeChange('custom')} className={`w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${comicMode === 'custom' ? 'bg-white text-red-600 shadow-sm' : 'text-[#8C5A3A] hover:bg-[#D6A27E]'}`}>Custom</button>
                </div>
        
                {comicMode === 'simple' ? (
                  <>
                    <div> <label htmlFor="comic-theme" className="block text-sm font-medium text-[#8C5A3A] mb-1 select-none">Comic Theme</label> <textarea id="comic-theme" value={comicTheme} onChange={e => onComicThemeChange(e.target.value)} rows={3} className="w-full p-2 border border-[#FDEFE2] rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm bg-white text-[#593A2D]" placeholder="e.g., a robot discovers friendship" /> </div>
                    <Slider label="Panels" min={1} max={6} step={1} value={numComicPanels} onChange={e => onNumComicPanelsChange(Number(e.target.value))} />
                    <button onClick={() => onGenerateComic('simple')} disabled={isGeneratingComic} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-[#D6A27E] disabled:cursor-not-allowed flex items-center justify-center"> {isGeneratingComic ? 'Generating...' : 'Generate Comic'} </button>
                  </>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-[#8C5A3A] select-none">Build your comic from a deep narrative foundation.</p>
                    <button onClick={() => togglePanel('LoreEditor')} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"> Open Universe Editor </button>
                    <button onClick={() => onGenerateComic('custom')} disabled={isGeneratingComic || !story} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-[#D6A27E] disabled:cursor-not-allowed flex items-center justify-center"> {isGeneratingComic ? 'Generating...' : 'Generate From Story'} </button>
                  </div>
                )}
        
                <div className="pt-4 border-t border-[#FDEFE2] space-y-3">
                  <div> <label htmlFor="language-select" className="block text-sm font-medium text-[#8C5A3A] mb-1 select-none">Language</label> <select id="language-select" value={comicLanguage} onChange={(e) => onComicLanguageChange(e.target.value)} className="w-full p-2 border border-[#FDEFE2] rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm bg-white"> <option value="es">Español</option> <option value="en">Inglés</option> <option value="ja">Japonés</option> <option value="zh">Chino</option> <option value="ru">Ruso</option> <option value="hi">Hindi</option> </select> </div>
                  <ShapeSelector label="Aspect Ratio" value={comicAspectRatio} options={['1:1', '16:9', '9:16']} onChange={(v) => onComicAspectRatioChange(v as '1:1' | '16:9' | '9:16')} />
                  <Slider label="Min Font Size" min={10} max={24} step={1} value={minComicFontSize} onChange={e => onMinComicFontSizeChange(Number(e.target.value))} />
                  <Slider label="Max Font Size" min={10} max={24} step={1} value={maxComicFontSize} onChange={e => onMaxComicFontSizeChange(Number(e.target.value))} />
                </div>
              </div>
            );
            break;
          case 'Options':
            content = ( <div className="space-y-3">
               <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
                   <label htmlFor="showBoundingBoxes" className="font-medium text-[#8C5A3A] select-none">Bounding Boxes</label>
                   <input type="checkbox" id="showBoundingBoxes" checked={showBoundingBoxes} onChange={e => onShowBoundingBoxesChange(e.target.checked)} className="h-5 w-5 rounded-md border-[#FDEFE2] text-red-500 focus:ring-red-400 cursor-pointer" />
               </div>
               <div className="pt-3 mt-3 border-t border-[#FDEFE2]">
                   <h3 className="font-semibold text-[#593A2D] mb-2 select-none">Background</h3>
                   <div className="space-y-2">
                       <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
                           <label htmlFor="bgColor1" className="font-medium text-sm text-[#8C5A3A] select-none">Color 1</label>
                           <input type="color" id="bgColor1" value={backgroundOptions.color1} onChange={e => onBackgroundOptionsChange({ color1: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                       </div>
                       <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
                           <label htmlFor="bgColor2" className="font-medium text-sm text-[#8C5A3A] select-none">Color 2</label>
                           <input type="color" id="bgColor2" value={backgroundOptions.color2} onChange={e => onBackgroundOptionsChange({ color2: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                       </div>
                       <div className="flex items-center justify-between p-2 rounded-lg bg-[#FDEFE2]">
                           <label htmlFor="bgAnimation" className="font-medium text-[#8C5A3A] select-none">Animate</label>
                           <input type="checkbox" id="bgAnimation" checked={backgroundOptions.animation} onChange={e => onBackgroundOptionsChange({ animation: e.target.checked })} className="h-5 w-5 rounded-md border-[#FDEFE2] text-red-500 focus:ring-red-400 cursor-pointer" />
                       </div>
                   </div>
               </div>
            </div> );
            break;
          case 'About':
            content = ( <div className="text-sm text-[#8C5A3A] space-y-2 select-none"> <p className="font-bold text-base text-red-600">Plop!</p> <p>Developed by Compulsivo Studio - 2025</p> </div> );
            break;
        }

        return (
          <ControlModule
            key={key}
            title={title}
            initialPosition={panelState.position}
            zIndex={panelState.zIndex}
            onClose={() => togglePanel(key)}
            onPositionChange={(pos) => updatePanelPosition(key, pos)}
            onFocus={() => bringToFront(key)}
            wide={isWidePanel}
          >
            {content}
          </ControlModule>
        );
      })}
    </div>
  );
};

export default ControlPanel;