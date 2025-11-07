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
        <label htmlFor={label} className="text-sm font-medium text-[#8C5A3A]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-mono bg-[#FDEFE2] px-2 py-0.5 rounded text-sm">{value}</span>
          {onRandomize && (
            <button
                onClick={onRandomize}
                className="p-1 text-red-600 rounded-full hover:bg-red-100 transition-colors"
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
        className="w-full h-2 bg-[#FDEFE2] rounded-lg appearance-none cursor-pointer accent-red-500"
      />
    </div>
  );
};

export default Slider;