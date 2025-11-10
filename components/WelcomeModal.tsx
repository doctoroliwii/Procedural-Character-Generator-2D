import React from 'react';
import { COMPULSIVO_LOGO_BASE64 } from './icons';

interface WelcomeModalProps {
    onNewCharacter: () => void;
    onNewComic: () => void;
    onNewUniverse: () => void;
    onNewProject: () => void;
    onNewBackground: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onNewCharacter, onNewComic, onNewUniverse, onNewProject, onNewBackground }) => {
    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-condorito-brown/60 backdrop-blur-sm">
            <div className="bg-panel-back rounded-xl shadow-2xl p-8 max-w-lg w-full text-center border border-panel-header">
                <h1 className="text-4xl font-bold font-fredoka text-condorito-red mb-2 plop-logo-outline">Plop!</h1>
                <p className="text-condorito-brown mb-8 text-sm">¿Qué quieres crear hoy?</p>
                <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={onNewProject}
                        className="p-4 bg-condorito-gray text-white font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-condorito-gray transition-transform transform hover:scale-105 text-sm"
                    >
                        Nuevo Proyecto
                    </button>
                    <button 
                        onClick={onNewUniverse}
                        className="p-4 bg-condorito-green text-white font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-condorito-green transition-transform transform hover:scale-105 text-sm"
                    >
                        Nuevo Universo
                    </button>
                    <button 
                        onClick={onNewCharacter}
                        className="p-4 bg-condorito-red text-white font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-condorito-red transition-transform transform hover:scale-105 text-sm"
                    >
                        Nuevo Personaje
                    </button>
                    <button 
                        onClick={onNewComic}
                        className="p-4 bg-condorito-wood text-white font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-condorito-wood transition-transform transform hover:scale-105 text-sm"
                    >
                        Nuevo Cómic
                    </button>
                    <button 
                        onClick={onNewBackground}
                        className="p-4 bg-sky-500 text-white font-semibold rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-transform transform hover:scale-105 text-sm col-span-2"
                    >
                        Nuevo Fondo
                    </button>
                </div>
                <div className="mt-10 text-center">
                    <img src={COMPULSIVO_LOGO_BASE64} alt="Compulsivo Studio Logo" className="w-24 h-auto mx-auto" />
                    <p className="text-xs text-condorito-brown mt-2">A Compulsivo Studio Creation - 2025</p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;