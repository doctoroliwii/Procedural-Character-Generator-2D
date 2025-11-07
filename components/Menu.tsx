import React, { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

interface MenuProps {
  title: string;
  items: MenuItem[];
}

const Menu: React.FC<MenuProps> = ({ title, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={(e) => {
            if (e.relatedTarget instanceof Node && menuRef.current?.contains(e.relatedTarget)) {
                return;
            }
            setIsOpen(false);
        }}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none select-none ${isOpen ? 'bg-red-500 text-white' : 'text-[#593A2D] hover:bg-[#D6A27E]/50'}`}
      >
        {title}
      </button>
      {isOpen && (
        <div 
            className="absolute top-full left-0 w-48 bg-[#FFFBF7]/95 backdrop-blur-md rounded-md shadow-lg border border-[#FDEFE2] py-1 z-50"
            onMouseLeave={() => setIsOpen(false)}
        >
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => !item.disabled && handleItemClick(item.action)}
              disabled={item.disabled}
              className="w-full text-left px-4 py-2 text-sm text-[#593A2D] hover:bg-red-500 hover:text-white transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#593A2D]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;