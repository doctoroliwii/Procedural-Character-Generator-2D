import React from 'react';
import Menu from './Menu';
import { PanelKey } from './ControlPanel';

interface MenuBarProps {
  onNewCharacter: () => void;
  onNewComic: () => void;
  onNewUniverse: () => void;
  onNewProject: () => void;
  onNewBackground: () => void;
  onRandomize: () => void;
  onRandomizeComic: () => void;
  isRandomizingComic: boolean;
  onMenuItemClick: (key: PanelKey) => void;
  handleImport: (type: 'lore' | 'characters' | 'story') => void;
  handleExport: (type: 'lore' | 'characters' | 'story') => void;
  onExportComic: (mode: 'current' | 'batch') => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onNewCharacter, onNewComic, onNewUniverse, onNewProject, onNewBackground, onRandomize, onRandomizeComic, isRandomizingComic, onMenuItemClick, handleImport, handleExport, onExportComic }) => {
  const newItems = [
    { label: 'Nuevo Proyecto', action: onNewProject },
    { label: 'Nuevo Universo', action: onNewUniverse },
    { label: 'Nuevo Personaje', action: onNewCharacter },
    { label: 'Nuevo Cómic', action: onNewComic },
    { label: 'Nuevo Fondo', action: onNewBackground },
  ];

  const fileItems = [
    {
      label: 'Importar',
      subItems: [
        { label: 'Universo', action: () => handleImport('lore') },
        { label: 'Personajes', action: () => handleImport('characters') },
        { label: 'Historia', action: () => handleImport('story') },
      ]
    },
    {
      label: 'Exportar',
      subItems: [
        { label: 'Universo', action: () => handleExport('lore') },
        { label: 'Personajes', action: () => handleExport('characters') },
        { label: 'Historia', action: () => handleExport('story') },
      ]
    },
    {
      label: 'Exportar Cómic',
      subItems: [
        { label: 'Exportar Página Actual', action: () => onExportComic('current') },
        { label: 'Exportar Todas las Páginas', action: () => onExportComic('batch') },
      ]
    },
  ];
  
  const actionsItems = [
    { label: 'Personaje Aleatorio', action: onRandomize },
    { label: 'Cómic Aleatorio', action: onRandomizeComic, disabled: isRandomizingComic },
  ];

  const universeItems = [
    { label: 'Editor de Universo', action: () => onMenuItemClick('LoreEditor') }
  ];
  const characterItems = [
    { label: 'Editor de Personajes', action: () => onMenuItemClick('CharacterEditor') }
  ];
  const comicItems = [
    { label: 'Editor de Cómics', action: () => onMenuItemClick('Comic') }
  ];
  const backgroundItems = [
    { label: 'Editor de Fondos', action: () => onMenuItemClick('BackgroundEditor') }
  ];
  const viewItems = [{ label: 'Opciones', action: () => onMenuItemClick('Options') }];

  return (
    <header className="flex-shrink-0 bg-panel-header/80 w-full px-2 py-1 flex items-center border-b border-panel-border/60 shadow-sm z-50">
       <button 
        onClick={() => onMenuItemClick('About')} 
        className="mr-6 focus:outline-none focus:ring-2 focus:ring-condorito-red focus:ring-offset-2 rounded-sm"
        aria-label="About Plop!"
       >
        <h1 className="text-base font-bold font-fredoka text-condorito-red select-none plop-logo-outline">Plop!</h1>
      </button>
      <Menu title="Nuevo" items={newItems} />
      <Menu title="Archivo" items={fileItems} />
      <Menu title="Acciones" items={actionsItems} />
      <Menu title="Universo" items={universeItems} />
      <Menu title="Personajes" items={characterItems} />
      <Menu title="Cómics" items={comicItems} />
      <Menu title="Fondos" items={backgroundItems} />
      <Menu title="View" items={viewItems} />
    </header>
  );
};

export default MenuBar;