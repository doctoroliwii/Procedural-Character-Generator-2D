import React, { useState } from 'react';
import type { RichText } from '../types';
import Slider from './Slider';

interface ProjectSettingsPanelProps {
  onGenerateProject: (settings: { name: RichText; genre: RichText; seasons: number; episodes: number; }) => Promise<void>;
  isGenerating: boolean;
}

const stringToRichText = (text: string, source: 'user' | 'ai' = 'user'): RichText => [{ text, source }];

const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({ onGenerateProject, isGenerating }) => {
    const [projName, setProjName] = useState('');
    const [projGenre, setProjGenre] = useState('');
    const [projSeasons, setProjSeasons] = useState(1);
    const [projEpisodes, setProjEpisodes] = useState(3);

    const handleSubmit = () => {
        if (!projName || !projGenre) {
            alert("Por favor, introduzca un nombre y un género para el proyecto.");
            return;
        }
        onGenerateProject({
            name: stringToRichText(projName),
            genre: stringToRichText(projGenre),
            seasons: projSeasons,
            episodes: projEpisodes,
        });
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-condorito-brown">Genera una serie de cómics. Esto utilizará el universo y los personajes cargados actualmente.</p>
            <div>
                <label htmlFor="proj-name" className="block text-xs font-medium text-condorito-brown mb-1">Nombre del Proyecto</label>
                <input
                    id="proj-name"
                    type="text"
                    value={projName}
                    onChange={e => setProjName(e.target.value)}
                    className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"
                />
            </div>
            <div>
                <label htmlFor="proj-genre" className="block text-xs font-medium text-condorito-brown mb-1">Género del Proyecto</label>
                <input
                    id="proj-genre"
                    type="text"
                    value={projGenre}
                    onChange={e => setProjGenre(e.target.value)}
                    className="w-full p-2 border border-panel-header rounded-md shadow-sm focus:ring-condorito-red focus:border-condorito-red text-xs bg-white"
                />
            </div>
            <Slider label="Temporadas" min={1} max={5} step={1} value={projSeasons} onChange={e => setProjSeasons(Number(e.target.value))} />
            <Slider label="Episodios por Temporada" min={1} max={10} step={1} value={projEpisodes} onChange={e => setProjEpisodes(Number(e.target.value))} />
            <div className="pt-2">
                <button
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    className="w-full relative overflow-hidden bg-condorito-red text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:brightness-95 transition-colors disabled:bg-panel-border disabled:cursor-not-allowed"
                >
                    <span className="relative z-10">{isGenerating ? 'Generando...' : 'Generar Proyecto'}</span>
                    {isGenerating && <div className="absolute inset-0 loading-bar-progress"></div>}
                </button>
            </div>
        </div>
    );
};

// FIX: Added missing default export for the component.
export default ProjectSettingsPanel;