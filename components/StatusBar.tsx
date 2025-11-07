import React from 'react';

interface StatusBarProps {
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const StatusBar: React.FC<StatusBarProps> = ({ viewBox }) => {
  const zoomPercentage = (400 / viewBox.width) * 100;

  const formatValue = (value: number) => value.toFixed(1);

  return (
    <footer className="flex-shrink-0 bg-[#FDEFE2]/80 w-full px-4 py-1 flex items-center justify-center gap-6 border-t border-[#D6A27E]/60 text-xs text-[#593A2D] font-mono select-none z-50">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#8C5A3A]">X:</span>
        <span>{formatValue(viewBox.x)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#8C5A3A]">Y:</span>
        <span>{formatValue(viewBox.y)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#8C5A3A]">W:</span>
        <span>{formatValue(viewBox.width)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#8C5A3A]">H:</span>
        <span>{formatValue(viewBox.height)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#8C5A3A]">Zoom:</span>
        <span>{zoomPercentage.toFixed(0)}%</span>
      </div>
    </footer>
  );
};

export default StatusBar;
