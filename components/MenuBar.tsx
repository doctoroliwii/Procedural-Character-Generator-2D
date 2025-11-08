import React from 'react';
import Menu from './Menu';
import { PanelKey } from './ControlPanel';

interface MenuBarProps {
  onRandomize: () => void;
  onRandomizeComic: () => void;
  isRandomizingComic: boolean;
  onMenuItemClick: (key: PanelKey) => void;
  handleImport: (type: 'lore' | 'characters' | 'story') => void;
  handleExport: (type: 'lore' | 'characters' | 'story') => void;
  onExportComic: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onRandomize, onRandomizeComic, isRandomizingComic, onMenuItemClick, handleImport, handleExport, onExportComic }) => {
  const fileItems = [
    { label: 'Randomize Character', action: onRandomize },
    { label: 'Randomize Comic', action: onRandomizeComic, disabled: isRandomizingComic },
    { label: 'Exportar Cómic', action: onExportComic },
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
    }
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
      <Menu title="File" items={fileItems} />
      <Menu title="Universo" items={universeItems} />
      <Menu title="Personajes" items={characterItems} />
      <Menu title="Cómics" items={comicItems} />
      <Menu title="View" items={viewItems} />
    </header>
  );
};

export default MenuBar;