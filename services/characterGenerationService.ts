import { PARAM_CONFIGS, INITIAL_PARAMS } from '../constants';
import type { CharacterParams, CharacterParamKey, ColorParamKey } from '../types';

// Helper function to get a random number in a range
const getRandomNumber = (min: number, max: number, step: number = 1) => {
    if (min > max) [min, max] = [max, min];
    const range = (max - min) / step;
    const rand = Math.floor(Math.random() * (range + 1));
    return min + rand * step;
};

// Helper function to get a random element from an array
const getRandomElement = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
};

export const getRandomParamValue = (param: CharacterParamKey | ColorParamKey, currentParams?: CharacterParams): any => {
    const configKey = param as Exclude<CharacterParamKey, 'bodyOutlines' | 'eyeOutlines' | 'eyeStyle' | 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor' | 'headShape' | 'torsoShape' | 'eyeTracking' | 'pelvisShape' | 'eyelashes' | 'hair' | 'hairColor' | 'glint' | 'backHairShape'>;
    if (configKey in PARAM_CONFIGS) {
        const config = PARAM_CONFIGS[configKey];
        // Special dynamic range logic for certain parameters
        if (param === 'mouthBend' && currentParams) {
             const maxMouthBend = 380 - 4 * currentParams.mouthWidthRatio;
             return getRandomNumber(-maxMouthBend, maxMouthBend, config.step);
        }
        if (param === 'fringeHeightRatio' && currentParams) {
            const { headHeight, eyeSizeRatio } = currentParams;
            const margin = 5;
            const headTopY = 120 - headHeight / 2;
            const eyeTopY = 120 - (headHeight * (eyeSizeRatio / 100));
            const maxFringeHeightPx = eyeTopY - headTopY - margin;
            const maxRatio = Math.max(0, (maxFringeHeightPx / headHeight) * 100);
            return getRandomNumber(config.min, Math.floor(isNaN(maxRatio) ? 100 : maxRatio), config.step);
        }
        return getRandomNumber(config.min, config.max, config.step);
    }

    switch (param) {
        // Booleans
        case 'bodyOutlines':
        case 'eyeOutlines':
            return true; // Always generate with outlines
        case 'eyeTracking':
        case 'eyelashes':
        case 'hair':
            return Math.random() < 0.5;
        case 'glint':
            return Math.random() < 0.9;
        case 'eyebrows':
            return Math.random() < 0.85; // Most characters have eyebrows
        // Shapes (string enums)
        case 'headShape':
            return getRandomElement(['ellipse', 'circle', 'square', 'triangle', 'inverted-triangle']);
        case 'torsoShape':
            return getRandomElement(['rectangle', 'square', 'circle', 'triangle', 'inverted-triangle']);
        case 'pelvisShape':
            return getRandomElement(['rectangle', 'horizontal-oval']);
        case 'eyeStyle':
            return getRandomElement(['realistic', 'blocky', 'circle', 'dot', 'square', 'triangle']);
        case 'backHairShape':
            return getRandomElement(['smooth', 'afro', 'square', 'triangle', 'oval']);
        // Colors
        case 'bodyColor': {
            const fantasticColors = [
                // Human-like
                '#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524',
                // Fantastic
                '#B2EBF2', // light cyan
                '#C8E6C9', // light green
                '#FFCDD2', // light pink
                '#D1C4E9', // light purple
                '#FFF9C4', // light yellow
                '#CFD8DC', // light grey/blue
                '#A7C7E7', // baby blue
                '#F3B993'  // existing initial color
            ];
            return getRandomElement(fantasticColors);
        }
        case 'hairColor': {
            const hairColors = ['#090806', '#2C222B', '#41323F', '#594747', '#76665B', '#A79B82', '#D3C5AA', '#E5E2DE', '#B86125', '#FFB32B', '#3D1C02', '#5A3A2D', '#F75B3B', '#A4303F', '#682667'];
            return getRandomElement(hairColors);
        }
        case 'irisColor': {
            const irisColors = ['#744729', '#A5683A', '#0077C0', '#417192', '#3B8578', '#6A9B89', '#505050', '#888888', '#AF8F53'];
            return getRandomElement(irisColors);
        }
        case 'outlineColor':
            return '#000000';
        case 'pupilColor':
            return '#000000';
        default:
            // This case should ideally not be reached if all params are handled
            return 0;
    }
};

export const generateRandomAppearanceParams = (baseParams?: CharacterParams | null): CharacterParams => {
    const params = { ...(baseParams || INITIAL_PARAMS) };
    const allKeys = [...Object.keys(PARAM_CONFIGS), 'bodyOutlines', 'eyeOutlines', 'eyeStyle', 'headShape', 'torsoShape', 'eyeTracking', 'pelvisShape', 'eyelashes', 'hair', 'eyebrows', 'glint', 'bodyColor', 'hairColor', 'irisColor', 'outlineColor', 'pupilColor', 'backHairShape'];
    const processed = new Set<string>();

    for (const key of allKeys) {
        if (processed.has(key as string)) continue;
        if (key === 'viewAngle') continue; // Skip randomizing viewAngle

        const value = getRandomParamValue(key as CharacterParamKey | ColorParamKey, params);
        (params as any)[key] = value;
        processed.add(key as string);

        // Enforce symmetry
        const symmetryMap: Record<string, string> = {
            lArmWidth: 'rArmWidth', rArmWidth: 'lArmWidth',
            lHandSize: 'rHandSize', rHandSize: 'lHandSize',
            lLegWidth: 'rLegWidth', rLegWidth: 'lLegWidth',
            lFootSize: 'rFootSize', rFootSize: 'lFootSize',
            lArmAngle: 'rArmAngle', rArmAngle: 'lArmAngle',
            lLegAngle: 'rLegAngle', rLegAngle: 'lLegAngle',
        };
        const bendSymmetryMap: Record<string, string> = {
            lArmBend: 'rArmBend', rArmBend: 'lArmBend',
            lLegBend: 'rLegBend', rLegBend: 'lLegBend',
        };

        if (key in symmetryMap) {
            const symmetricKey = symmetryMap[key];
            (params as any)[symmetricKey] = value;
            processed.add(symmetricKey);
        } else if (key in bendSymmetryMap) {
            const symmetricKey = bendSymmetryMap[key];
            (params as any)[symmetricKey] = -value;
            processed.add(symmetricKey);
        }
    }
    
    // If hair is enabled, sometimes add curls
    if (params.hair && Math.random() < 0.3) {
        params.hairCurliness = getRandomNumber(20, 80);
        params.hairCurlFrequency = getRandomNumber(5, 30);
        params.hairCurlAmplitude = getRandomNumber(5, 25);
    } else {
        params.hairCurliness = 0;
    }

    return params;
};

// Generates a complete set of random parameters, using INITIAL_PARAMS as a base
export const generateRandomParams = (): CharacterParams => {
    return generateRandomAppearanceParams(INITIAL_PARAMS);
};