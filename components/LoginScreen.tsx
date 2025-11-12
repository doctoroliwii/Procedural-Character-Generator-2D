import React, { useState } from 'react';
import { COMPULSIVO_LOGO_BASE64, GoogleIcon } from './icons';

interface LoginScreenProps {
    onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLoginClick = () => {
        setIsLoggingIn(true);
        // Simulate network request
        setTimeout(() => {
            onLogin();
        }, 1000);
    };

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-condorito-brown/60 backdrop-blur-sm">
            <div className="bg-panel-back rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border border-panel-header">
                <h1 className="text-4xl font-bold font-fredoka text-condorito-red mb-2 plop-logo-outline">Plop!</h1>
                <p className="text-condorito-brown mb-8 text-sm">Welcome! Please sign in to continue.</p>
                
                <button
                    onClick={handleLoginClick}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-700 font-semibold text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-condorito-red transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoggingIn ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                        </>
                    ) : (
                        <>
                            <GoogleIcon className="w-5 h-5" />
                            Sign in with Google
                        </>
                    )}
                </button>

                <div className="mt-12 text-center">
                    <img src={COMPULSIVO_LOGO_BASE64} alt="Compulsivo Studio Logo" className="w-24 h-auto mx-auto" />
                    <p className="text-xs text-condorito-brown mt-2">A Compulsivo Studio Creation - 2025</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
