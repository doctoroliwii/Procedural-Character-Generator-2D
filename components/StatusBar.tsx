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
    <footer className="flex-shrink-0 bg-panel-header/80 w-full px-4 py-1 flex items-center justify-center gap-6 border-t border-panel-border/60 text-xs text-condorito-brown font-mono select-none z-50">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-condorito-brown/70">X:</span>
        <span>{formatValue(viewBox.x)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-condorito-brown/70">Y:</span>
        <span>{formatValue(viewBox.y)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-condorito-brown/70">W:</span>
        <span>{formatValue(viewBox.width)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-condorito-brown/70">H:</span>
        <span>{formatValue(viewBox.height)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-condorito-brown/70">Zoom:</span>
        <span>{zoomPercentage.toFixed(0)}%</span>
      </div>
    </footer>
  );
};

export default StatusBar;