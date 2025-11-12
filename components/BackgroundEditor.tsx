import React, { useMemo, useState, useCallback } from 'react';
import type { ProceduralBackground, SkyParams, GroundParams, HorizonParams, RoomParams, WallParams } from '../types';
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
  const [activeTab, setActiveTab] = useState<'main' | 'elements' | 'vistas'>('main');
  const selectedBg = useMemo(() => backgrounds.find(bg => bg.id === selectedId), [backgrounds, selectedId]);
  
  const [viewBox, setViewBox] = useState({
      x: 0,
      y: 0,
      width: INITIAL_BACKGROUND.canvasWidth,
      height: INITIAL_BACKGROUND.canvasHeight
  });

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
  
  const handleGridParamChange = (
    gridType: 'gridPerspective' | 'gridHorizontal' | 'gridVerticals',
    param: 'strokeWidth' | 'horizonFade' | 'visible',
    value: number | boolean
  ) => {
      updateSelectedBg(bg => ({
          ...bg,
          [gridType]: { ...bg[gridType], [param]: value }
      }));
  };

  const handleRandomizeSky = () => {
    const newSky = generateRandomSky();
    updateSelectedBg(bg => ({ ...bg, sky: { ...bg.sky, ...newSky } }));
  };
  
  const handleAddWall = () => {
    const newWall: WallParams = {
      id: `wall-${Date.now()}`,
      visible: true,
      start: { x: -5, z: 8 },
      end: { x: 5, z: 8 },
      height: 40,
      strokeWidth: 1,
      color: '#A0522D',
      opacity: 100,
      shadow: true,
      shadowOpacity: 30,
    };
    updateSelectedBg(bg => ({
        ...bg,
        walls: [...bg.walls, newWall]
    }));
  };

  const handleDeleteWall = (id: string) => {
      updateSelectedBg(bg => ({
          ...bg,
          walls: bg.walls.filter(w => w.id !== id)
      }));
  };

  const handleWallParamChange = (id: string, param: keyof WallParams | 'start.x' | 'start.z' | 'end.x' | 'end.z', value: any) => {
      updateSelectedBg(bg => ({
          ...bg,
          walls: bg.walls.map(w => {
              if (w.id === id) {
                  const newWall = { ...w };
                  if (param.includes('.')) {
                      const [key, subkey] = param.split('.') as ['start'|'end', 'x'|'z'];
                      newWall[key] = { ...newWall[key], [subkey]: value };
                  } else {
                      (newWall as any)[param] = value;
                  }
                  return newWall;
              }
              return w;
          })
      }));
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
            
            {selectedBg.type === 'exterior' && (
              <div className="space-y-4">
                 <div className="flex gap-1 p-1 bg-panel-header rounded-lg">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'main' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
                    > Main </button>
                    <button
                        onClick={() => setActiveTab('elements')}
                        className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'elements' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
                    > Elementos </button>
                     <button
                        onClick={() => setActiveTab('vistas')}
                        className={`select-none flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'vistas' ? 'bg-white text-condorito-red shadow-sm' : 'text-condorito-brown hover:bg-panel-border'}`}
                    > Vistas </button>
                </div>

                {activeTab === 'main' && <div className="space-y-4">
                    <div className="p-3 bg-panel-back rounded-lg">
                      <h3 className="font-bold text-condorito-brown text-sm mb-2">Horizonte y Perspectiva</h3>
                       <div className="space-y-3">
                        <Slider label="Posición del Horizonte" min={0} max={100} step={1} value={selectedBg.horizon.position} onChange={e => handleParamChange('horizon', 'position', Number(e.target.value))} />
                        <Slider label="Punto de Fuga Horizontal" min={0} max={100} step={1} value={selectedBg.horizon.vanishingPointX} onChange={e => handleParamChange('horizon', 'vanishingPointX', Number(e.target.value))} />
                        
                        <div className="pt-2 border-t border-panel-header">
                            <Slider label="Densidad de Rejilla" min={1} max={10} step={1} value={selectedBg.gridDensity} onChange={e => handleParamChange('root', 'gridDensity', Number(e.target.value))} />
                        </div>

                        <div className="pt-2 border-t border-panel-header">
                            <CheckboxControl label="Rejilla de Perspectiva" checked={selectedBg.gridPerspective.visible} onChange={e => handleGridParamChange('gridPerspective', 'visible', e.target.checked)} />
                            {selectedBg.gridPerspective.visible && (
                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3 pt-3">
                                    <Slider label="Grosor" min={0.1} max={5} step={0.1} value={selectedBg.gridPerspective.strokeWidth} onChange={e => handleGridParamChange('gridPerspective', 'strokeWidth', Number(e.target.value))} />
                                    <Slider label="Desvanecimiento" min={0} max={100} step={1} value={selectedBg.gridPerspective.horizonFade} onChange={e => handleGridParamChange('gridPerspective', 'horizonFade', Number(e.target.value))} />
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-2 border-t border-panel-header">
                            <CheckboxControl label="Rejilla Horizontal" checked={selectedBg.gridHorizontal.visible} onChange={e => handleGridParamChange('gridHorizontal', 'visible', e.target.checked)} />
                            {selectedBg.gridHorizontal.visible && (
                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3 pt-3">
                                    <Slider label="Grosor" min={0.1} max={5} step={0.1} value={selectedBg.gridHorizontal.strokeWidth} onChange={e => handleGridParamChange('gridHorizontal', 'strokeWidth', Number(e.target.value))} />
                                    <Slider label="Desvanecimiento" min={0} max={100} step={1} value={selectedBg.gridHorizontal.horizonFade} onChange={e => handleGridParamChange('gridHorizontal', 'horizonFade', Number(e.target.value))} />
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-2 border-t border-panel-header">
                             <CheckboxControl label="Rejilla Vertical" checked={selectedBg.gridVerticals.visible} onChange={e => handleGridParamChange('gridVerticals', 'visible', e.target.checked)} />
                             {selectedBg.gridVerticals.visible && (
                                <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3 pt-3">
                                    <Slider label="Grosor" min={0.1} max={5} step={0.1} value={selectedBg.gridVerticals.strokeWidth} onChange={e => handleGridParamChange('gridVerticals', 'strokeWidth', Number(e.target.value))} />
                                    <Slider label="Desvanecimiento" min={0} max={100} step={1} value={selectedBg.gridVerticals.horizonFade} onChange={e => handleGridParamChange('gridVerticals', 'horizonFade', Number(e.target.value))} />
                                </div>
                            )}
                        </div>

                         <CheckboxControl label="Mostrar Vértices" checked={selectedBg.gridVerticesVisible} onChange={e => handleParamChange('root', 'gridVerticesVisible', e.target.checked)} />
                        {selectedBg.gridVerticesVisible && (
                             <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                                <ColorInput label="Color de Vértices" value={selectedBg.gridVertexColor} onChange={e => handleParamChange('root', 'gridVertexColor', e.target.value)} />
                                <Slider label="Radio de Vértices" min={0.5} max={10} step={0.5} value={selectedBg.gridVertexRadius} onChange={e => handleParamChange('root', 'gridVertexRadius', Number(e.target.value))} />
                             </div>
                        )}
                      </div>
                    </div>
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
                      </div>
                    </div>
                     <div className="p-3 bg-panel-back rounded-lg">
                      <h3 className="font-bold text-condorito-brown text-sm mb-2">Suelo</h3>
                      <div className="space-y-2">
                         <ColorInput label="Color" value={selectedBg.ground.color} onChange={e => handleParamChange('ground', 'color', e.target.value)} />
                      </div>
                    </div>
                </div>}

                {activeTab === 'elements' && <div className="space-y-4">
                    <div className="p-3 bg-panel-back rounded-lg">
                        <h3 className="font-bold text-condorito-brown text-sm mb-2">Nubes</h3>
                        <div className="space-y-3">
                             <CheckboxControl label="Mostrar Nubes" checked={selectedBg.sky.cloudsVisible} onChange={e => handleParamChange('sky', 'cloudsVisible', e.target.checked)} />
                             {selectedBg.sky.cloudsVisible && (
                                 <div className="pl-2 border-l-2 border-condorito-red/30 space-y-3">
                                    <Slider label="Densidad de Nubes" min={0} max={999} step={1} value={selectedBg.sky.cloudDensity} onChange={e => handleParamChange('sky', 'cloudDensity', Number(e.target.value))} />
                                    <ColorInput label="Color de Nubes" value={selectedBg.sky.cloudColor} onChange={e => handleParamChange('sky', 'cloudColor', e.target.value)} />
                                </div>
                             )}
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
                                    <Slider label="Cantidad" min={0} max={999} step={1} value={selectedBg.horizon.treeCount} onChange={e => handleParamChange('horizon', 'treeCount', Number(e.target.value))} />
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
                                    <Slider label="Cantidad" min={0} max={999} step={1} value={selectedBg.horizon.houseCount} onChange={e => handleParamChange('horizon', 'houseCount', Number(e.target.value))} />
                                    <Slider label="Ancho Mínimo (Unidades)" min={0.1} max={5} step={0.1} value={selectedBg.horizon.houseWidthMin} onChange={e => handleParamChange('horizon', 'houseWidthMin', Number(e.target.value))} />
                                    <Slider label="Ancho Máximo (Unidades)" min={0.1} max={5} step={0.1} value={selectedBg.horizon.houseWidthMax} onChange={e => handleParamChange('horizon', 'houseWidthMax', Number(e.target.value))} />
                                    <Slider label="Altura Mínima (Unidades)" min={0.1} max={5} step={0.1} value={selectedBg.horizon.houseHeightMin} onChange={e => handleParamChange('horizon', 'houseHeightMin', Number(e.target.value))} />
                                    <Slider label="Altura Máxima (Unidades)" min={0.1} max={5} step={0.1} value={selectedBg.horizon.houseHeightMax} onChange={e => handleParamChange('horizon', 'houseHeightMax', Number(e.target.value))} />
                                    <ColorInput label="Color" value={selectedBg.horizon.houseColor} onChange={e => handleParamChange('horizon', 'houseColor', e.target.value)} />
                                    <Slider label="Variación de Color" min={0} max={100} step={1} value={selectedBg.horizon.houseColorVariation} onChange={e => handleParamChange('horizon', 'houseColorVariation', Number(e.target.value))} />
                                 </div>
                             )}
                        </div>
                    </div>
                </div>}

                {activeTab === 'vistas' && (
                  <div className="space-y-4">
                      <div className="p-3 bg-panel-back rounded-lg">
                          <h3 className="font-bold text-condorito-brown text-sm mb-2">Configuración de Vista</h3>
                          <div className="space-y-3">
                              <Slider label="Ángulo de Vista" min={-135} max={135} step={1} value={selectedBg.viewAngle} onChange={e => handleParamChange('root', 'viewAngle', Number(e.target.value))} />
                              <Slider label="Altura de Vista" min={-90} max={90} step={1} value={selectedBg.viewHeight} onChange={e => handleParamChange('root', 'viewHeight', Number(e.target.value))} />
                              <Slider label="Distancia Focal" min={300} max={3000} step={10} value={selectedBg.focalLength} onChange={e => handleParamChange('root', 'focalLength', Number(e.target.value))} />
                          </div>
                      </div>
                      <div className="p-3 bg-panel-back rounded-lg">
                          <h3 className="font-bold text-condorito-brown text-sm mb-2">Paredes en Perspectiva</h3>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                              {selectedBg.walls.map((wall, index) => (
                                  <div key={wall.id} className="p-3 border border-panel-header rounded-lg bg-white space-y-3">
                                      <div className="flex justify-between items-center">
                                          <h4 className="font-bold text-xs text-condorito-red">Pared #{index + 1}</h4>
                                          <button onClick={() => handleDeleteWall(wall.id)} className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/10 text-lg leading-none font-bold">&times;</button>
                                      </div>
                                      <CheckboxControl label="Visible" checked={wall.visible} onChange={e => handleWallParamChange(wall.id, 'visible', e.target.checked)} />
                                      <Slider label="Punto Inicio X" min={-10} max={10} step={0.5} value={wall.start.x} onChange={e => handleWallParamChange(wall.id, 'start.x', Number(e.target.value))} />
                                      <Slider label="Punto Inicio Z" min={0} max={10} step={0.1} value={wall.start.z} onChange={e => handleWallParamChange(wall.id, 'start.z', Number(e.target.value))} />
                                      <Slider label="Punto Final X" min={-10} max={10} step={0.5} value={wall.end.x} onChange={e => handleWallParamChange(wall.id, 'end.x', Number(e.target.value))} />
                                      <Slider label="Punto Final Z" min={0} max={10} step={0.1} value={wall.end.z} onChange={e => handleWallParamChange(wall.id, 'end.z', Number(e.target.value))} />
                                      <Slider label="Altura" min={0} max={100} step={1} value={wall.height} onChange={e => handleWallParamChange(wall.id, 'height', Number(e.target.value))} />
                                      <Slider label="Grosor" min={0} max={10} step={0.5} value={wall.strokeWidth} onChange={e => handleWallParamChange(wall.id, 'strokeWidth', Number(e.target.value))} />
                                      <Slider label="Opacidad" min={0} max={100} step={1} value={wall.opacity} onChange={e => handleWallParamChange(wall.id, 'opacity', Number(e.target.value))} />
                                      <ColorInput label="Color" value={wall.color} onChange={e => handleWallParamChange(wall.id, 'color', e.target.value)} />
                                      <CheckboxControl label="Sombra" checked={wall.shadow} onChange={e => handleWallParamChange(wall.id, 'shadow', e.target.checked)} />
                                      {wall.shadow && <Slider label="Opacidad Sombra" min={0} max={100} step={1} value={wall.shadowOpacity} onChange={e => handleWallParamChange(wall.id, 'shadowOpacity', Number(e.target.value))} />}
                                  </div>
                              ))}
                          </div>
                          <button onClick={handleAddWall} className="w-full mt-3 py-2 text-xs font-semibold bg-condorito-green text-white rounded-md hover:brightness-95 transition-colors">+ Añadir Pared</button>
                      </div>
                  </div>
                )}
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
          <div className="w-1/2 h-full relative bg-condorito-pink">
            <div className="w-full h-full shadow-lg">
                <ProceduralBackgroundRenderer 
                    background={selectedBg} 
                    viewBox={viewBox}
                    onViewBoxChange={setViewBox}
                />
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
