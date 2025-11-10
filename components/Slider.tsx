import React from 'react';
import { DiceIcon } from './icons';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRandomize?: () => void;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange, onRandomize }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={label} className="text-xs font-medium text-condorito-brown select-none">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-condorito-red font-mono bg-panel-header px-2 py-0.5 rounded text-xs select-none">{value}</span>
          {onRandomize && (
            <button
                onClick={onRandomize}
                className="p-1 text-condorito-red rounded-full hover:bg-condorito-red/20 transition-colors"
                aria-label={`Randomize ${label}`}
                title={`Randomize ${label}`}
            >
                <DiceIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-panel-header rounded-lg appearance-none cursor-pointer accent-condorito-red"
      />
    </div>
  );
};

export default Slider;