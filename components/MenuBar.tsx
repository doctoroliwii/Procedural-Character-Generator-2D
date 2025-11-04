import React from 'react';
import Menu from './Menu';
import { PanelKey } from './ControlPanel';

interface MenuBarProps {
  onRandomize: () => void;
  onMenuItemClick: (key: PanelKey) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onRandomize, onMenuItemClick }) => {
  const fileItems = [{ label: 'Randomize Character', action: onRandomize }];
  const editItems = [
    { label: 'Head', action: () => onMenuItemClick('Head') },
    { label: 'Eyes', action: () => onMenuItemClick('Eyes') },
    { label: 'Eyebrows', action: () => onMenuItemClick('Eyebrows') },
    { label: 'Mouth', action: () => onMenuItemClick('Mouth') },
    { label: 'Body', action: () => onMenuItemClick('Body') },
    { label: 'Limbs', action: () => onMenuItemClick('Limbs') },
    { label: 'Color', action: () => onMenuItemClick('Color') },
  ];
  const viewItems = [{ label: 'Options', action: () => onMenuItemClick('Options') }];
  const helpItems = [{ label: 'About', action: () => onMenuItemClick('About') }];

  return (
    <div className="flex-shrink-0 bg-gray-300/80 w-full px-2 py-1 flex items-center border-b border-gray-400/60 shadow-sm z-50">
       <h1 className="text-xl font-bold text-sky-700 mr-6 hidden lg:block select-none">Character Creator</h1>
      <Menu title="File" items={fileItems} />
      <Menu title="Edit" items={editItems} />
      <Menu title="View" items={viewItems} />
      <Menu title="Help" items={helpItems} />
    </div>
  );
};

export default MenuBar;