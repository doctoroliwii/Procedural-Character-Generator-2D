import React, { useState, useCallback } from 'react';
import type { CharacterParams, CharacterParamKey, ColorParamKey, BackgroundOptions } from '../types';
import { PARAM_CONFIGS } from '../constants';
import Slider from './Slider';
import MenuBar from './MenuBar';
import ControlModule from './ControlModule';
import { RefreshIcon } from './icons';

interface ControlPanelProps {
  params: CharacterParams;
  onParamChange: (param: CharacterParamKey | ColorParamKey, value: number | boolean | string) => void;
  onRandomize: () => void;
  backgroundOptions: BackgroundOptions;
  onBackgroundOptionsChange: (options: Partial<BackgroundOptions>) => void;
  limbSymmetry: boolean;
  onLimbSymmetryChange: (enabled: boolean) => void;
}

export type PanelKey = 'Head' | 'Eyes' | 'Eyebrows' | 'Mouth' | 'Body' | 'Limbs' | 'Color' | 'Options' | 'About';

interface PanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onParamChange, onRandomize, backgroundOptions, onBackgroundOptionsChange, limbSymmetry, onLimbSymmetryChange }) => {
  const [panels, setPanels] = useState<Record<PanelKey, PanelState>>({
    Head: { isOpen: true, position: { x: 20, y: 20 }, zIndex: 10 },
    Eyes: { isOpen: false, position: { x: 30, y: 30 }, zIndex: 1 },
    Eyebrows: { isOpen: false, position: { x: 40, y: 40 }, zIndex: 1 },
    Mouth: { isOpen: false, position: { x: 50, y: 50 }, zIndex: 1 },
    Body: { isOpen: false, position: { x: 60, y: 60 }, zIndex: 1 },
    Limbs: { isOpen: true, position: { x: 20, y: 220 }, zIndex: 9 },
    Color: { isOpen: true, position: { x: 230, y: 80 }, zIndex: 8 },
    Options: { isOpen: false, position: { x: 80, y: 80 }, zIndex: 1 },
    About: { isOpen: false, position: { x: 90, y: 90 }, zIndex: 1 },
  });

  const bringToFront = (key: PanelKey) => {
    setPanels(prev => {
      const maxZ = Math.max(...Object.values(prev).map((p: PanelState) => p.zIndex));
      if (prev[key].zIndex === maxZ) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], zIndex: maxZ + 1 },
      };
    });
  };

  const togglePanel = useCallback((key: PanelKey) => {
    setPanels(prev => ({
      ...prev,
      [key]: { ...prev[key], isOpen: !prev[key].isOpen },
    }));
    if (!panels[key].isOpen) {
      bringToFront(key);
    }
  }, [panels]);

  const updatePanelPosition = useCallback((key: PanelKey, position: { x: number; y: number }) => {
    setPanels(prev => ({
      ...prev,
      [key]: { ...prev[key], position },
    }));
  }, []);
  
  const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
        <label className="font-medium text-gray-700 select-none">{label}</label>
        <input type="color" value={value} onChange={onChange} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
    </div>
  );

  const ShapeSelector = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (value: string) => void }) => (
    <div>
      <label className="font-medium text-gray-700 select-none text-sm mb-1 block">{label}</label>
      <div className="grid grid-cols-2 gap-1 w-full bg-gray-100 rounded-lg p-1">
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
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
          <label htmlFor="mouthIsFlipped" className="font-medium text-gray-700 select-none">Flip Mouth</label>
          <input type="checkbox" id="mouthIsFlipped" checked={params.mouthIsFlipped} onChange={e => onParamChange('mouthIsFlipped', e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
        </div>
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
          <ShapeSelector label="Pelvis Shape" value={params.pelvisShape} options={['rectangle', 'inverted-triangle', 'horizontal-oval']} onChange={(v) => onParamChange('pelvisShape', v)} />
        </div>
      </div>
    ),
    Limbs: (
      <div className="space-y-4">
        {['armLength', 'legLength'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        <div className="pt-4 border-t border-gray-300 space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100">
              <label htmlFor="limbSymmetry" className="font-medium text-gray-700 select-none">Symmetry</label>
              <input type="checkbox" id="limbSymmetry" checked={limbSymmetry} onChange={e => onLimbSymmetryChange(e.target.checked)} className="h-5 w-5 rounded-md border-gray-300 text-sky-500 focus:ring-sky-400 cursor-pointer" />
            </div>
        </div>
        <div className="pt-4 border-t border-gray-300 space-y-4">
           {['lArmWidth', 'rArmWidth', 'lHandSize', 'rHandSize', 'lArmAngle', 'lArmBend', 'rArmAngle', 'rArmBend'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        </div>
        <div className="pt-4 border-t border-gray-300 space-y-4">
           {['lLegWidth', 'rLegWidth', 'lFootSize', 'rFootSize', 'lLegAngle', 'lLegBend', 'rLegAngle', 'rLegBend'].map(k => <Slider key={k} {...PARAM_CONFIGS[k as CharacterParamKey]} value={params[k as CharacterParamKey] as number} onChange={(e) => onParamChange(k as CharacterParamKey, Number(e.target.value))} />)}
        </div>
      </div>
    ),
    Color: (
       <div className="space-y-3">
          <ColorInput label="Body" value={params.bodyColor} onChange={e => onParamChange('bodyColor', e.target.value)} />
          <ColorInput label="Outline" value={params.outlineColor} onChange={e => onParamChange('outlineColor', e.target.value)} />
          <ColorInput label="Pupil" value={params.pupilColor} onChange={e => onParamChange('pupilColor', e.target.value)} />
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
    <div className="flex flex-col h-full bg-gray-200">
      <MenuBar onRandomize={onRandomize} onMenuItemClick={togglePanel} />
      <div className="relative flex-1 w-full h-full overflow-hidden">
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
    </div>
  );
};

export default ControlPanel;