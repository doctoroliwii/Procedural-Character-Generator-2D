import type { SkyParams } from '../types';

const getRandomHexColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Helper to create a slightly darker/lighter version of a color
const tintOrShade = (hex: string, percent: number): string => {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    const amount = Math.floor(255 * (percent / 100));

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    return `#${(r).toString(16).padStart(2, '0')}${(g).toString(16).padStart(2, '0')}${(b).toString(16).padStart(2, '0')}`;
};

export const generateRandomSky = (): Partial<SkyParams> => {
    const baseColor = getRandomHexColor();
    const isDay = Math.random() > 0.3;

    if (isDay) {
        // Daytime sky
        const topColor = tintOrShade(baseColor, 20); // Lighter
        const bottomColor = tintOrShade(baseColor, -10); // Darker
        return {
            topColor,
            bottomColor,
            sunMoonVisible: true,
            sunMoonColor: '#FFD700',
            stars: false,
        };
    } else {
        // Nighttime sky
        const topColor = tintOrShade('#000033', 10);
        const bottomColor = tintOrShade('#1a1a4a', 10);
         return {
            topColor,
            bottomColor,
            sunMoonVisible: Math.random() > 0.4,
            sunMoonColor: '#F0F0F0', // Moon
            stars: true,
            starDensity: Math.random() * 50 + 20,
        };
    }
};
