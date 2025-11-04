
import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange }) => {
  return (
    <div>
      <label htmlFor={label} className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <span className="text-sky-600 font-mono bg-gray-200 px-2 py-0.5 rounded">{value}</span>
      </label>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-sky-500"
      />
    </div>
  );
};

export default Slider;