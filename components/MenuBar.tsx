import React from 'react';
import Menu from './Menu';
import { PanelKey } from './ControlPanel';

interface MenuBarProps {
  onRandomize: () => void;
  onRandomizeComic: () => void;
  isRandomizingComic: boolean;
  onMenuItemClick: (key: PanelKey) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onRandomize, onRandomizeComic, isRandomizingComic, onMenuItemClick }) => {
  const fileItems = [
    { label: 'Randomize Character', action: onRandomize },
    { label: 'Randomize Comic', action: onRandomizeComic, disabled: isRandomizingComic },
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
  const helpItems = [{ label: 'Acerca de', action: () => onMenuItemClick('About') }];

  return (
    <header className="flex-shrink-0 bg-[#FDEFE2]/80 w-full px-2 py-1 flex items-center border-b border-[#D6A27E]/60 shadow-sm z-50">
       <h1 className="text-xl font-bold text-red-700 mr-6 select-none">Plop!</h1>
      <Menu title="File" items={fileItems} />
      <Menu title="Universo" items={universeItems} />
      <Menu title="Personajes" items={characterItems} />
      <Menu title="Cómics" items={comicItems} />
      <Menu title="View" items={viewItems} />
      <Menu title="Help" items={helpItems} />
    </header>
  );
};

export default MenuBar;