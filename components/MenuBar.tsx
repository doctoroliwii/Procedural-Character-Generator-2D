import React from 'react';
import Menu from './Menu';
import { PanelKey } from './ControlPanel';

interface MenuBarProps {
  onRandomize: () => void;
  onRandomizeGroup: () => void;
  onRandomizeComic: () => void;
  isRandomizingComic: boolean;
  onMenuItemClick: (key: PanelKey) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onRandomize, onRandomizeGroup, onRandomizeComic, isRandomizingComic, onMenuItemClick }) => {
  const fileItems = [
    { label: 'Randomize Character', action: onRandomize },
    { label: 'Randomize Group', action: onRandomizeGroup },
    { label: 'Randomize Comic', action: onRandomizeComic, disabled: isRandomizingComic },
  ];
  const headItems = [
    { label: 'Head', action: () => onMenuItemClick('Head') },
    { label: 'Hair', action: () => onMenuItemClick('Hair') },
    { label: 'Eyes', action: () => onMenuItemClick('Eyes') },
    { label: 'Eyebrows', action: () => onMenuItemClick('Eyebrows') },
    { label: 'Mouth', action: () => onMenuItemClick('Mouth') },
  ];
  const bodyItems = [
    { label: 'Body', action: () => onMenuItemClick('Body') },
    { label: 'Arms', action: () => onMenuItemClick('Arms') },
    { label: 'Legs', action: () => onMenuItemClick('Legs') },
    { label: 'Color', action: () => onMenuItemClick('Color') },
  ];
  const groupItems = [
    { label: 'Group Settings', action: () => onMenuItemClick('GroupSettings') }
  ];
  const comicItems = [
    { label: 'Comic Settings', action: () => onMenuItemClick('Comic') }
  ];
  const universeItems = [
    { label: 'Editor de Universo', action: () => onMenuItemClick('LoreEditor') }
  ];
  const characterItems = [
    { label: 'Editor de Personajes', action: () => onMenuItemClick('CharacterEditor') }
  ];
  const viewItems = [{ label: 'Options', action: () => onMenuItemClick('Options') }];
  const helpItems = [{ label: 'About', action: () => onMenuItemClick('About') }];

  return (
    <header className="flex-shrink-0 bg-gray-300/80 w-full px-2 py-1 flex items-center border-b border-gray-400/60 shadow-sm z-50">
       <h1 className="text-xl font-bold text-sky-700 mr-6 select-none">Character Creator</h1>
      <Menu title="File" items={fileItems} />
      <Menu title="Head" items={headItems} />
      <Menu title="Body" items={bodyItems} />
      <Menu title="Group" items={groupItems} />
      <Menu title="Comic" items={comicItems} />
      <Menu title="Universo" items={universeItems} />
      <Menu title="Personajes" items={characterItems} />
      <Menu title="View" items={viewItems} />
      <Menu title="Help" items={helpItems} />
    </header>
  );
};

export default MenuBar;