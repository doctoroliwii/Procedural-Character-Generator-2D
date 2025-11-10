import React, { useMemo } from 'react';
import type { ProceduralBackground, SkyParams, GroundParams, HorizonParams, RoomParams } from '../types';
import { DiceIcon } from './icons';
import ProceduralBackgroundRenderer from './ProceduralBackgroundRenderer';
import { generateRandomSky } from '../services/backgroundGenerationService';
import { INITIAL_BACKGROUND } from '../constants/backgroundDefaults';
import Slider from './Slider';

interface BackgroundEditorProps {
  backgrounds: ProceduralBackground[];
  onBackgroundsChange: (updater: (prev: ProceduralBackground[]) => ProceduralBackground[]) => void;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  setApiError: (error: string | null) => void;
}

const CheckboxControl = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
        <label htmlFor={label} className="font-medium text-condorito-brown select-none text-xs">{label}</label>
        <input type="checkbox" id={label} checked={checked} onChange={onChange} className="h-5 w-5 rounded-md border-panel-header text-condorito-red focus:ring-condorito-red/80 cursor-pointer" />
    </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-panel-header">
        <label className="font-medium text-condorito-brown select-none text-xs">{label}</label>
        <input type="color" value={value} onChange={onChange} className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent" />
    </div>
);


const BackgroundEditor: React.FC<BackgroundEditorProps> = ({
  backgrounds,
  onBackgroundsChange,
  selectedId,
  onSelectedIdChange,
  setApiError
}) => {
  const selectedBg = useMemo(() => backgrounds.find(bg => bg.id === selectedId), [backgrounds, selectedId]);
  
  const updateSelectedBg = (updater: (bg: ProceduralBackground) => ProceduralBackground) => {
    if (!selectedId) return;
    onBackgroundsChange(prev =>
      prev.map(bg => (bg.id === selectedId ? updater(bg) : bg))
    );
  };

  const handleNewBackground = () => {
    const newBg: ProceduralBackground = {
      ...INITIAL_BACKGROUND,
      id: `bg-${Date.now()}`,
      name: `New Background ${backgrounds.length + 1}`,
    };
    onBackgroundsChange(prev => [...prev, newBg]);
    onSelectedIdChange(newBg.id);
  };

  const handleDeleteBackground = () => {
    if (!selectedId) return;
    if (window.confirm(`Are you sure you want to delete "${selectedBg?.name}"?`)) {
      onBackgroundsChange(prev => {
        const newBgs = prev.filter(bg => bg.id !== selectedId);
        const currentIndex = prev.findIndex(bg => bg.id === selectedId);
        if (newBgs.length > 0) {
          const newIndex = Math.max(0, currentIndex - 1);
          onSelectedIdChange(newBgs[newIndex].id);
        } else {
          onSelectedIdChange(null);
        }
        return newBgs;
      });
    }
  };


  const handleParamChange = (
    section: 'sky' | 'ground' | 'horizon' | 'room' | 'root',
    param: keyof ProceduralBackground | keyof SkyParams | keyof GroundParams | keyof HorizonParams | keyof RoomParams,
    value: any
  ) => {
    updateSelectedBg(bg => {
      const newBg = { ...bg };
      if (section === 'root') {
        (newBg as any)[param] = value;
        return newBg;
      }

      (newBg as any)[section] = { ...(newBg as any)[section], [param]: value };
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
        <button onClick={handleNewBackground} className="w-10 bg-condorito-green text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Add new background">+</button>
        <button onClick={handleDeleteBackground} disabled={!selectedId} className="w-10 bg-condorito-red text-white rounded-md hover:brightness-95 disabled:bg-panel-border text-base font-bold flex items-center justify-center transition" title="Delete selected background">-</button>
      </div>

      {selectedBg ? (
        <div className="flex-grow flex overflow-hidden">
          <div className="w-1/2 h-full overflow-y-auto border-r border-panel-header p-3 space-y-3">
            <input
              type="text"
              value={selectedBg.name}
              onChange={e => handleParamChange('root', 'name', e.target.value)}
              className="w-full p-2 border border-panel-header rounded-md text-sm font-semibold bg-white focus:ring-1 focus:ring-condorito-red"
            />
            <div className="flex gap-1 p-1 bg-panel-header rounded-lg">
              <button
                onClick={() => handleParamChange('root', 'type', 'exterior')}
                className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedBg.type === 'exterior' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
              >
                Exterior
              </button>
              <button
                onClick={() => handleParamChange('root', 'type', 'interior')}
                className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedBg.type === 'interior' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
              >
                Interior
              </button>
            </div>
            
             <div className="p-3 bg-panel-back rounded-lg">
              <h3 className="font-bold text-condorito-brown text-sm mb-2">Horizonte y Perspectiva</h3>
               <div className="space-y-3">
                <Slider label="Posición del Horizonte" min={0} max={100} step={1} value={selectedBg.horizon.position} onChange={e => handleParamChange('horizon', 'position', Number(e.target.value))} />
                <Slider label="Punto de Fuga Horizontal" min={0} max={100} step={1} value={selectedBg.horizon.vanishingPointX} onChange={e => handleParamChange('horizon', 'vanishingPointX', Number(e.target.value))} />
                <CheckboxControl label="Mostrar Rejilla" checked={selectedBg.gridVisible} onChange={e => handleParamChange('root', 'gridVisible', e.target.checked)} />
                {selectedBg.gridVisible && (
                    <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                        <ColorInput label="Color de Rejilla" value={selectedBg.gridColor} onChange={e => handleParamChange('root', 'gridColor', e.target.value)} />
                        <Slider label="Densidad de Rejilla" min={1} max={15} step={1} value={selectedBg.gridDensity} onChange={e => handleParamChange('root', 'gridDensity', Number(e.target.value))} />
                        <Slider label="Grosor de Rejilla" min={0.1} max={5} step={0.1} value={selectedBg.gridStrokeWidth} onChange={e => handleParamChange('root', 'gridStrokeWidth', Number(e.target.value))} />
                        <Slider label="Desvanecimiento Horizonte Rejilla" min={0} max={100} step={1} value={selectedBg.gridHorizonFade} onChange={e => handleParamChange('root', 'gridHorizonFade', Number(e.target.value))} />
                    </div>
                )}
              </div>
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
                    <ColorInput label="Color Superior" value={selectedBg.sky.topColor} onChange={e => handleParamChange('sky', 'topColor', e.target.value)} />
                    <ColorInput label="Color Inferior" value={selectedBg.sky.bottomColor} onChange={e => handleParamChange('sky', 'bottomColor', e.target.value)} />
                     <div className="pt-2 border-t border-panel-header space-y-3">
                        <Slider label="Densidad de Nubes" min={0} max={100} step={1} value={selectedBg.sky.cloudDensity} onChange={e => handleParamChange('sky', 'cloudDensity', Number(e.target.value))} />
                        <ColorInput label="Color de Nubes" value={selectedBg.sky.cloudColor} onChange={e => handleParamChange('sky', 'cloudColor', e.target.value)} />
                    </div>
                  </div>
                </div>
                 <div className="p-3 bg-panel-back rounded-lg">
                  <h3 className="font-bold text-condorito-brown text-sm mb-2">Suelo</h3>
                  <div className="space-y-2">
                     <ColorInput label="Color" value={selectedBg.ground.color} onChange={e => handleParamChange('ground', 'color', e.target.value)} />
                  </div>
                </div>
                <div className="p-3 bg-panel-back rounded-lg">
                    <h3 className="font-bold text-condorito-brown text-sm mb-2">Montañas</h3>
                    <div className="space-y-3">
                         <CheckboxControl label="Mostrar Montañas" checked={selectedBg.horizon.mountainsVisible} onChange={e => handleParamChange('horizon', 'mountainsVisible', e.target.checked)} />
                         {selectedBg.horizon.mountainsVisible && (
                             <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                                <Slider label="Altura" min={10} max={80} step={1} value={selectedBg.horizon.mountainHeight} onChange={e => handleParamChange('horizon', 'mountainHeight', Number(e.target.value))} />
                                <Slider label="Capas" min={1} max={5} step={1} value={selectedBg.horizon.mountainLayers} onChange={e => handleParamChange('horizon', 'mountainLayers', Number(e.target.value))} />
                                <Slider label="Rugosidad" min={0} max={100} step={1} value={selectedBg.horizon.mountainRoughness} onChange={e => handleParamChange('horizon', 'mountainRoughness', Number(e.target.value))} />
                                <ColorInput label="Color" value={selectedBg.horizon.mountainColor} onChange={e => handleParamChange('horizon', 'mountainColor', e.target.value)} />
                             </div>
                         )}
                    </div>
                </div>
                <div className="p-3 bg-panel-back rounded-lg">
                    <h3 className="font-bold text-condorito-brown text-sm mb-2">Árboles</h3>
                    <div className="space-y-3">
                         <CheckboxControl label="Mostrar Árboles" checked={selectedBg.horizon.treesVisible} onChange={e => handleParamChange('horizon', 'treesVisible', e.target.checked)} />
                         {selectedBg.horizon.treesVisible && (
                             <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                                <Slider label="Cantidad" min={3} max={30} step={1} value={selectedBg.horizon.treeCount} onChange={e => handleParamChange('horizon', 'treeCount', Number(e.target.value))} />
                                <Slider label="Tamaño" min={20} max={150} step={1} value={selectedBg.horizon.treeSize} onChange={e => handleParamChange('horizon', 'treeSize', Number(e.target.value))} />
                                <Slider label="Variación" min={0} max={100} step={1} value={selectedBg.horizon.treeVariation} onChange={e => handleParamChange('horizon', 'treeVariation', Number(e.target.value))} />
                                <ColorInput label="Color" value={selectedBg.horizon.treeColor} onChange={e => handleParamChange('horizon', 'treeColor', e.target.value)} />
                             </div>
                         )}
                    </div>
                </div>
                 <div className="p-3 bg-panel-back rounded-lg">
                    <h3 className="font-bold text-condorito-brown text-sm mb-2">Casas</h3>
                    <div className="space-y-3">
                         <CheckboxControl label="Mostrar Casas" checked={selectedBg.horizon.housesVisible} onChange={e => handleParamChange('horizon', 'housesVisible', e.target.checked)} />
                         {selectedBg.horizon.housesVisible && (
                             <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                                <Slider label="Cantidad" min={1} max={15} step={1} value={selectedBg.horizon.houseCount} onChange={e => handleParamChange('horizon', 'houseCount', Number(e.target.value))} />
                                <Slider label="Tamaño" min={20} max={100} step={1} value={selectedBg.horizon.houseSize} onChange={e => handleParamChange('horizon', 'houseSize', Number(e.target.value))} />
                                <ColorInput label="Color" value={selectedBg.horizon.houseColor} onChange={e => handleParamChange('horizon', 'houseColor', e.target.value)} />
                                <Slider label="Variación de Color" min={0} max={100} step={1} value={selectedBg.horizon.houseColorVariation} onChange={e => handleParamChange('horizon', 'houseColorVariation', Number(e.target.value))} />
                             </div>
                         )}
                    </div>
                </div>
              </div>
            )}
            {selectedBg.type === 'interior' && (
               <div className="p-3 bg-panel-back rounded-lg">
                  <h3 className="font-bold text-condorito-brown text-sm mb-2">Habitación</h3>
                   <div className="space-y-2">
                    <ColorInput label="Color de Pared" value={selectedBg.room.wallColor} onChange={e => handleParamChange('room', 'wallColor', e.target.value)} />
                    <ColorInput label="Color de Suelo" value={selectedBg.room.floorColor} onChange={e => handleParamChange('room', 'floorColor', e.target.value)} />
                    <CheckboxControl label="Techo Visible" checked={selectedBg.room.ceilingVisible} onChange={e => handleParamChange('room', 'ceilingVisible', e.target.checked)} />
                    {selectedBg.room.ceilingVisible && (
                      <ColorInput label="Color de Techo" value={selectedBg.room.ceilingColor || '#FFFFFF'} onChange={e => handleParamChange('room', 'ceilingColor', e.target.value)} />
                    )}
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