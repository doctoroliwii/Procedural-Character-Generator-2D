import React, { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  action: () => void;
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
            // Check if the mouse is moving to the dropdown before closing
            if (e.relatedTarget && menuRef.current?.contains(e.relatedTarget as Node)) {
                return;
            }
            setIsOpen(false);
        }}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none select-none ${isOpen ? 'bg-sky-500 text-white' : 'text-gray-800 hover:bg-gray-400/50'}`}
      >
        {title}
      </button>
      {isOpen && (
        <div 
            className="absolute top-full left-0 w-48 bg-gray-50/95 backdrop-blur-md rounded-md shadow-lg border border-gray-300 py-1 z-50"
            onMouseLeave={() => setIsOpen(false)}
        >
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item.action)}
              className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-sky-500 hover:text-white transition-colors duration-150 select-none"
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