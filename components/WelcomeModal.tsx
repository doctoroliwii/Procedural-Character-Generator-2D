import React from 'react';

interface WelcomeModalProps {
    onNewCharacter: () => void;
    onNewComic: () => void;
    onNewUniverse: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onNewCharacter, onNewComic, onNewUniverse }) => {
    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-[#6B4F4B]/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center border border-[#FDEFE2]">
                <h1 className="text-5xl font-bold text-red-700 mb-2">Plop!</h1>
                <p className="text-[#8C5A3A] mb-8">¿Qué quieres crear hoy?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onClick={onNewCharacter}
                        className="p-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform transform hover:scale-105"
                    >
                        Nuevo Personaje
                    </button>
                    <button 
                        onClick={onNewComic}
                        className="p-4 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
                    >
                        Nuevo Cómic
                    </button>
                    <button 
                        onClick={onNewUniverse}
                        className="p-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
                    >
                        Nuevo Universo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;