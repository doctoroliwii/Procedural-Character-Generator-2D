import React, { useState, useMemo } from 'react';
import type { ProceduralBackground, SkyParams, GroundParams } from '../types';
import { DiceIcon } from './icons';
import ProceduralBackgroundRenderer from './ProceduralBackgroundRenderer';
import { generateRandomSky } from '../services/backgroundGenerationService';

interface BackgroundEditorProps {
  backgrounds: ProceduralBackground[];
  onBackgroundsChange: (updater: (prev: ProceduralBackground[]) => ProceduralBackground[]) => void;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  setApiError: (error: string | null) => void;
}

const BackgroundEditor: React.FC<BackgroundEditorProps> = ({
  backgrounds,
  onBackgroundsChange,
  selectedId,
  onSelectedIdChange,
  setApiError
}) => {
  const selectedBg = useMemo(() => backgrounds.find(bg => bg.id === selectedId), [backgrounds, selectedId]);

  const [activeTab, setActiveTab] = useState<'exterior' | 'interior'>('exterior');

  const updateSelectedBg = (updater: (bg: ProceduralBackground) => ProceduralBackground) => {
    if (!selectedId) return;
    onBackgroundsChange(prev =>
      prev.map(bg => (bg.id === selectedId ? updater(bg) : bg))
    );
  };

  const handleParamChange = (
    section: 'sky' | 'ground',
    param: keyof SkyParams | keyof GroundParams,
    value: any
  ) => {
    updateSelectedBg(bg => {
      const newBg = { ...bg };
      (newBg[section] as any)[param] = value;
      return newBg;
    });
  };

  const handleRandomizeSky = () => {
    const newSky = generateRandomSky();
    updateSelectedBg(bg => ({ ...bg, sky: { ...bg.sky, ...newSky } }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-shrink-0 flex gap-2 p-3 border-b border-panel-header">
        <select
          value={selectedId || ''}
          onChange={e => onSelectedIdChange(e.target.value)}
          className="flex-grow p-2 border border-panel-header rounded-md text-xs bg-white focus:ring-1 focus:ring-condorito-red"
        >
          {backgrounds.length === 0 && <option value="" disabled>-- Create a background --</option>}
          {backgrounds.map(bg => (
            <option key={bg.id} value={bg.id}>{bg.name}</option>
          ))}
        </select>
        <button onClick={() => {}} className="w-10 bg-condorito-green text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Add new background">+</button>
        <button onClick={() => {}} disabled={!selectedId} className="w-10 bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Delete selected background">-</button>
      </div>

      {selectedBg ? (
        <div className="flex-grow flex overflow-hidden">
          <div className="w-1/2 h-full overflow-y-auto border-r border-panel-header p-3 space-y-3">
            <div className="flex gap-1 p-1 bg-panel-header rounded-lg">
              <button
                onClick={() => updateSelectedBg(bg => ({ ...bg, type: 'exterior' }))}
                className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedBg.type === 'exterior' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
              >
                Exterior
              </button>
              <button
                onClick={() => updateSelectedBg(bg => ({ ...bg, type: 'interior' }))}
                className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedBg.type === 'interior' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
              >
                Interior
              </button>
            </div>

            {selectedBg.type === 'exterior' && (
              <div className="space-y-4">
                <div className="p-3 bg-panel-back rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-condorito-brown text-sm">Cielo</h3>
                    <button onClick={handleRandomizeSky} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors" title="Randomize Sky">
                        <DiceIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-condorito-brown">Color Superior</label>
                      <input type="color" value={selectedBg.sky.topColor} onChange={e => handleParamChange('sky', 'topColor', e.target.value)} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-condorito-brown">Color Inferior</label>
                      <input type="color" value={selectedBg.sky.bottomColor} onChange={e => handleParamChange('sky', 'bottomColor', e.target.value)} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                  </div>
                </div>
                 <div className="p-3 bg-panel-back rounded-lg">
                  <h3 className="font-bold text-condorito-brown text-sm mb-2">Suelo</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-condorito-brown">Color</label>
                      <input type="color" value={selectedBg.ground.color} onChange={e => handleParamChange('ground', 'color', e.target.value)} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedBg.type === 'interior' && (
               <div className="p-3 bg-panel-back rounded-lg">
                  <h3 className="font-bold text-condorito-brown text-sm mb-2">Habitación</h3>
                   <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-condorito-brown">Color de Pared</label>
                      <input type="color" value={selectedBg.room.wallColor} onChange={e => {
                        updateSelectedBg(bg => ({...bg, room: {...bg.room, wallColor: e.target.value}}))
                      }} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                    </div>
                  </div>
               </div>
            )}
          </div>
          <div className="w-1/2 h-full relative bg-condorito-pink p-4 flex items-center justify-center">
            <div className="w-full h-full shadow-lg rounded-lg overflow-hidden">
                <ProceduralBackgroundRenderer background={selectedBg} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-condorito-brown p-8 bg-panel-back rounded-lg flex-grow">
          <p>No hay fondo seleccionado.</p>
          <p className="mt-2">Añada un nuevo fondo para comenzar.</p>
        </div>
      )}
    </div>
  );
};

export default BackgroundEditor;
