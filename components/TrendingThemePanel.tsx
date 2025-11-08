import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../constants';
import { getTrendsForCountry } from '../services/geminiService';
import { DiceIcon } from './icons';

interface TrendingThemePanelProps {
  onAppendTheme: (theme: string) => void;
  setApiError: (error: string | null) => void;
}

const TrendingThemePanel: React.FC<TrendingThemePanelProps> = ({ onAppendTheme, setApiError }) => {
  const [selectedCountry, setSelectedCountry] = useState('GLOBAL');
  const [trends, setTrends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!selectedCountry) return;
      setIsLoading(true);
      setTrends([]);
      setApiError(null);
      try {
        const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || 'the world';
        const fetchedTrends = await getTrendsForCountry(countryName);
        setTrends(fetchedTrends);
      } catch (error: any) {
        console.error("Failed to fetch trends", error);
        setApiError('Failed to fetch trending topics from the API. Please try again.');
        setTrends([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrends();
  }, [selectedCountry, setApiError]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="country-select" className="block text-xs font-medium text-condorito-brown mb-1 select-none">
          País
        </label>
        <select
          id="country-select"
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"
        >
          {COUNTRIES.map(country => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="flex justify-center items-center p-4">
            <DiceIcon className="w-6 h-6 text-condorito-red animate-spin" />
          </div>
        )}
        {!isLoading && trends.length === 0 && (
          <p className="text-center text-xs text-condorito-brown p-4">
            No se encontraron tendencias.
          </p>
        )}
        {trends.map((trend, index) => (
          <button
            key={index}
            onClick={() => onAppendTheme(trend)}
            className="w-full text-left p-2 bg-panel-header rounded-lg hover:bg-panel-border transition text-xs font-semibold"
          >
            {trend}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingThemePanel;
