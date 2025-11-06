import React from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions } from '../types';
import { PARAM_CONFIGS } from '../constants';
import Slider from './Slider';
import ControlModule from './ControlModule';

interface ControlPanelProps {
  panels: Record<PanelKey, PanelState>;
  params: CharacterParams;
  onParamChange: (param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => void;
  backgroundOptions: BackgroundOptions;
  onBackgroundOptionsChange: (options: Partial<BackgroundOptions>) => void;
  limbSymmetry: boolean;
  onLimbSymmetryChange: (enabled: boolean) => void;
  maxMouthBend: number;
  maxFringeHeightRatio: number;
  showBoundingBoxes: boolean;
  onShowBoundingBoxesChange: (enabled: boolean) => void;
  minGroupSize: number;
  onMinGroupSizeChange: (value: number) => void;
  maxGroupSize: number;
  onMaxGroupSizeChange: (value: number) => void;
  groupXSpread: number;
  onGroupXSpreadChange: (value: number) => void;
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
  onGenerateComic: () => void;
  isGeneratingComic: boolean;
  // Panel controls
  togglePanel: (key: PanelKey) => void;
  updatePanelPosition: (key: PanelKey, position: { x: number; y: number }) => void;
  bringToFront: (key: PanelKey) => void;
}

export type PanelKey = 'Head' | 'Hair' | 'Eyes' | 'Eyebrows' | 'Mouth' | 'Body' | 'Arms' | 'Legs' | 'Color' | 'GroupSettings' | 'Options' | 'About' | 'Comic';

export interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  panels, 
  params, 
  onParamChange, 
  backgroundOptions, 
  onBackgroundOptionsChange, 
  limbSymmetry, 
  onLimbSymmetryChange, 
  maxMouthBend, 
  maxFringeHeightRatio,
  showBoundingBoxes,
  onShowBoundingBoxesChange,
  minGroupSize,
  onMinGroupSizeChange,
  maxGroupSize,
  onMaxGroupSizeChange,
  groupXSpread,
  onGroupXSpreadChange,
  comicTheme,
  onComicThemeChange,
  numComicPanels,
  onNumComicPanelsChange,
  comicAspectRatio,
  onComicAspectRatioChange,
  minComicFontSize,
  onMinComicFontSizeChange,
  maxComicFontSize,
  onMaxComicFontSizeChange,
  comicLanguage,
  onComicLanguageChange,
  onGenerateComic,
  isGeneratingComic,
  togglePanel,
  updatePanelPosition,
  bringToFront
}) => {
  const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
        <label className="font-medium text-gray-700 select-none">{label}</label>
        <input type="color" value={value} onChange={onChange} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
    </div>
  );

  const ShapeSelector = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (value: string) => void }) => (
    <div>
      <label className="font-medium text-gray-700 select-none text-sm mb-1 block">{label}</label>
      <div className="grid grid-cols-3 gap-1 w-full bg-gray-100 rounded-lg p-1">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full py-1 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${value === option ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            {option.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );

  const panelContent: Record<PanelKey, React.ReactNode> = {
    Head: (
      <div className="space-y-4">
        {['headWidth', 'headHeight'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        <div className="pt-4 border-t border-gray-300 space-y-3">
          <ShapeSelector label="Head Shape" value={params.headShape} options={['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => onParamChange('headShape', v)} />
          {(params.headShape === 'square') && (
             <Slider {...PARAM_CONFIGS.headCornerRadius} value={params.headCornerRadius} onChange={(e) => onParamChange('headCornerRadius', Number(e.target.value))} />
          )}
          {(params.headShape === 'triangle' || params.headShape === 'inverted-triangle') && (
             <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={params.triangleCornerRadius} onChange={(e) => onParamChange('triangleCornerRadius', Number(e.target.value))} />
          )}
        </div>
      </div>
    ),
    Hair: (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="hair" className="font-medium text-gray-700 select-none">Enable Hair</label>
          <input type="checkbox" id="hair" checked={params.hair} onChange={e => onParamChange('hair', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
        {params.hair && (
            <div className="pt-4 border-t border-gray-300 space-y-4">
                 {['backHairWidthRatio', 'backHairHeightRatio'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
                 <Slider 
                    {...PARAM_CONFIGS.fringeHeightRatio} 
                    max={Math.floor(maxFringeHeightRatio)}
                    value={params.fringeHeightRatio}
                    onChange={(e) => onParamChange('fringeHeightRatio', Number(e.target.value))}
                 />
            </div>
        )}
      </div>
    ),
    Eyes: (
       <div className="space-y-4">
        {['eyeSizeRatio', 'eyeSpacingRatio', 'pupilSizeRatio', 'upperEyelidCoverage', 'lowerEyelidCoverage'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        <div className="pt-4 border-t border-gray-300 space-y-3">
          <div>
            <label className="font-medium text-gray-700 select-none text-sm mb-1 block">Eye Style</label>
            <div className="flex w-full bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onParamChange('eyeStyle', 'blocky')}
                className={`w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${params.eyeStyle === 'blocky' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                Blocky
              </button>
              <button
                onClick={() => onParamChange('eyeStyle', 'realistic')}
                className={`w-1/2 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${params.eyeStyle === 'realistic' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                Realistic
              </button>
            </div>
          </div>
          <ColorInput label="Iris Color" value={params.irisColor} onChange={e => onParamChange('irisColor', e.target.value)} />
        </div>
         <div className="pt-4 border-t border-gray-300 space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="eyelashes" className="font-medium text-gray-700 select-none">Eyelashes</label>
              <input type="checkbox" id="eyelashes" checked={params.eyelashes} onChange={e => onParamChange('eyelashes', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
            </div>
            {params.eyelashes && (
                <div className="pl-2 border-l-2 border-sky-200 space-y-4">
                     {['eyelashCount', 'eyelashLength', 'eyelashAngle'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
                </div>
            )}
        </div>
      </div>
    ),
    Eyebrows: (
       <div className="space-y-4">
        {['eyebrowWidthRatio', 'eyebrowHeightRatio', 'eyebrowYOffsetRatio', 'eyebrowAngle'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
      </div>
    ),
    Mouth: (
       <div className="space-y-4">
        {['mouthWidthRatio', 'mouthYOffsetRatio'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        <Slider 
          {...PARAM_CONFIGS.mouthBend}
          min={-Math.round(maxMouthBend)}
          max={Math.round(maxMouthBend)}
          value={params.mouthBend}
          onChange={(e) => onParamChange('mouthBend', Number(e.target.value))}
        />
      </div>
    ),
    Body: (
      <div className="space-y-4">
         {['neckHeight', 'neckWidthRatio', 'torsoHeight', 'torsoWidth', 'pelvisHeight', 'pelvisWidthRatio'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        <div className="pt-4 border-t border-gray-300 space-y-3">
          <ShapeSelector label="Torso Shape" value={params.torsoShape} options={['rectangle', 'circle', 'square', 'triangle', 'inverted-triangle']} onChange={(v) => onParamChange('torsoShape', v)} />
          {(params.torsoShape === 'square' || params.torsoShape === 'rectangle') && (
             <Slider {...PARAM_CONFIGS.torsoCornerRadius} value={params.torsoCornerRadius} onChange={(e) => onParamChange('torsoCornerRadius', Number(e.target.value))} />
          )}
           {(params.torsoShape === 'triangle' || params.torsoShape === 'inverted-triangle') && (
             <Slider {...PARAM_CONFIGS.triangleCornerRadius} value={params.triangleCornerRadius} onChange={(e) => onParamChange('triangleCornerRadius', Number(e.target.value))} />
          )}
        </div>
        <div className="pt-4 border-t border-gray-300 space-y-3">
          <ShapeSelector label="Pelvis Shape" value={params.pelvisShape} options={['rectangle', 'horizontal-oval']} onChange={(v) => onParamChange('pelvisShape', v)} />
        </div>
      </div>
    ),
    Arms: (
      <div className="space-y-4">
        <Slider {...PARAM_CONFIGS['armLength']} value={params['armLength']} onChange={(e) => onParamChange('armLength', Number(e.target.value))} />
        <div className="pt-4 border-t border-gray-300 space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="limbSymmetry" className="font-medium text-gray-700 select-none">Symmetry</label>
              <input type="checkbox" id="limbSymmetry" checked={limbSymmetry} onChange={e => onLimbSymmetryChange(e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
            </div>
        </div>
        <div className="pt-4 border-t border-gray-300 space-y-4">
           {['lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize', 'lArmAngle', 'lArmBend', 'rArmAngle', 'rArmBend'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        </div>
      </div>
    ),
    Legs: (
       <div className="space-y-4">
        <Slider {...PARAM_CONFIGS['legLength']} value={params['legLength']} onChange={(e) => onParamChange('legLength', Number(e.target.value))} />
        <div className="pt-4 border-t border-gray-300 space-y-4">
            {['lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize', 'lLegAngle', 'lLegBend', 'rLegAngle', 'rLegBend'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        </div>
      </div>
    ),
    Color: (
       <div className="space-y-3">
          <ColorInput label="Body" value={params.bodyColor} onChange={e => onParamChange('bodyColor', e.target.value)} />
          <ColorInput label="Hair" value={params.hairColor} onChange={e => onParamChange('hairColor', e.target.value)} />
          <ColorInput label="Outline" value={params.outlineColor} onChange={e => onParamChange('outlineColor', e.target.value)} />
          <ColorInput label="Pupil" value={params.pupilColor} onChange={e => onParamChange('pupilColor', e.target.value)} />
        </div>
    ),
    GroupSettings: (
      <div className="space-y-4">
          <Slider 
            label="Min Characters"
            min={2}
            max={99}
            step={1}
            value={minGroupSize}
            onChange={e => onMinGroupSizeChange(Number(e.target.value))}
          />
          <Slider 
            label="Max Characters"
            min={2}
            max={99}
            step={1}
            value={maxGroupSize}
            onChange={e => onMaxGroupSizeChange(Number(e.target.value))}
          />
        <div className="pt-4 border-t border-gray-300">
          <Slider 
            label="X Separation"
            min={100}
            max={1500}
            step={10}
            value={groupXSpread}
            onChange={e => onGroupXSpreadChange(Number(e.target.value))}
          />
        </div>
      </div>
    ),
    Comic: (
        <div className="space-y-4">
          <div>
            <label htmlFor="comic-theme" className="block text-sm font-medium text-gray-700 mb-1 select-none">Comic Theme</label>
            <textarea
              id="comic-theme"
              value={comicTheme}
              onChange={e => onComicThemeChange(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white text-gray-900"
              placeholder="e.g., a robot discovers friendship"
            />
          </div>
          <Slider
            label="Panels"
            min={1}
            max={6}
            step={1}
            value={numComicPanels}
            onChange={e => onNumComicPanelsChange(Number(e.target.value))}
          />
          <div className="pt-4 border-t border-gray-300 space-y-3">
            <div>
              <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-1 select-none">Language</label>
              <select
                id="language-select"
                value={comicLanguage}
                onChange={(e) => onComicLanguageChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-sm bg-white"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="ja">Japonés</option>
                <option value="zh">Chino</option>
                <option value="ru">Ruso</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            <ShapeSelector 
              label="Aspect Ratio" 
              value={comicAspectRatio} 
              options={['1:1', '16:9', '9:16']} 
              onChange={(v) => onComicAspectRatioChange(v as '1:1' | '16:9' | '9:16')} 
            />
            <Slider
              label="Min Font Size"
              min={10}
              max={24}
              step={1}
              value={minComicFontSize}
              onChange={e => onMinComicFontSizeChange(Number(e.target.value))}
            />
            <Slider
              label="Max Font Size"
              min={10}
              max={24}
              step={1}
              value={maxComicFontSize}
              onChange={e => onMaxComicFontSizeChange(Number(e.target.value))}
            />
          </div>
          <button
            onClick={onGenerateComic}
            disabled={isGeneratingComic}
            className="w-full bg-sky-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isGeneratingComic ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : 'Generate Comic'}
          </button>
        </div>
    ),
    Options: (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="eyeTracking" className="font-medium text-gray-700 select-none">Cursor Tracking</label>
          <input type="checkbox" id="eyeTracking" checked={params.eyeTracking} onChange={e => onParamChange('eyeTracking', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="bodyOutlines" className="font-medium text-gray-700 select-none">Body Outlines</label>
          <input type="checkbox" id="bodyOutlines" checked={params.bodyOutlines} onChange={e => onParamChange('bodyOutlines', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="eyeOutlines" className="font-medium text-gray-700 select-none">Eye Outlines</label>
          <input type="checkbox" id="eyeOutlines" checked={params.eyeOutlines} onChange={e => onParamChange('eyeOutlines', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="showBoundingBoxes" className="font-medium text-gray-700 select-none">Bounding Boxes</label>
          <input type="checkbox" id="showBoundingBoxes" checked={showBoundingBoxes} onChange={e => onShowBoundingBoxesChange(e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
        <div className="pt-3 mt-3 border-t border-gray-300">
          <h3 className="font-semibold text-gray-800 mb-2 select-none">Background</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="bgColor1" className="font-medium text-sm text-gray-700 select-none">Color 1</label>
              <input type="color" id="bgColor1" value={backgroundOptions.color1} onChange={e => onBackgroundOptionsChange({ color1: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="bgColor2" className="font-medium text-sm text-gray-700 select-none">Color 2</label>
              <input type="color" id="bgColor2" value={backgroundOptions.color2} onChange={e => onBackgroundOptionsChange({ color2: e.target.value })} className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="bgAnimation" className="font-medium text-gray-700 select-none">Animate</label>
              <input type="checkbox" id="bgAnimation" checked={backgroundOptions.animation} onChange={e => onBackgroundOptionsChange({ animation: e.target.checked })} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    ),
    About: (
      <div className="text-sm text-gray-700 space-y-2 select-none">
        <p className="font-bold text-base text-sky-600">Character Creator</p>
        <p>Version 1.2</p>
        <p>A procedural 2D character generator built with React and TypeScript.</p>
        <p>Create unique characters by adjusting a wide variety of parameters.</p>
      </div>
    )
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {(Object.keys(panels) as PanelKey[]).map((key) => {
        const panelState = panels[key];
        return (
          panelState.isOpen && (
            <ControlModule
              key={key}
              title={key}
              initialPosition={panelState.position}
              zIndex={panelState.zIndex}
              onClose={() => togglePanel(key)}
              onPositionChange={(pos) => updatePanelPosition(key, pos)}
              onFocus={() => bringToFront(key)}
            >
              {panelContent[key]}
            </ControlModule>
          )
        );
      })}
    </div>
  );
};

export default ControlPanel;