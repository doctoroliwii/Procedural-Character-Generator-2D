import React, { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  subItems?: MenuItem[];
}

interface MenuProps {
  title: string;
  items: MenuItem[];
}

const Menu: React.FC<MenuProps> = ({ title, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
      setIsOpen(false);
      setActiveSubMenu(null);
    }
  };

  return (
    <div className="relative" ref={menuRef} onMouseLeave={() => { setIsOpen(false); setActiveSubMenu(null); }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 focus:outline-none select-none ${isOpen ? 'bg-condorito-red text-white' : 'text-condorito-brown hover:bg-panel-border/50'}`}
      >
        {title}
      </button>
      {isOpen && (
        <div 
            className="absolute top-full left-0 w-48 bg-panel-back/95 backdrop-blur-md rounded-md shadow-lg border border-panel-header py-1 z-50"
        >
          {items.map(item => (
            <div 
              key={item.label} 
              className="relative" 
              onMouseEnter={() => item.subItems && setActiveSubMenu(item.label)} 
              onMouseLeave={() => item.subItems && setActiveSubMenu(null)}
            >
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.disabled || !item.action}
                className="w-full flex justify-between items-center text-left px-4 py-2 text-xs text-condorito-brown hover:bg-condorito-red hover:text-white transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-condorito-brown"
              >
                <span>{item.label}</span>
                {item.subItems && <span className="text-xs">▶</span>}
              </button>
              {item.subItems && activeSubMenu === item.label && (
                <div className="absolute top-0 left-full w-48 bg-panel-back/95 backdrop-blur-md rounded-md shadow-lg border border-panel-header py-1 z-50">
                  {item.subItems.map(subItem => (
                    <button
                      key={subItem.label}
                      onClick={() => handleItemClick(subItem)}
                      disabled={subItem.disabled}
                      className="w-full text-left px-4 py-2 text-xs text-condorito-brown hover:bg-condorito-red hover:text-white transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-condorito-brown"
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;