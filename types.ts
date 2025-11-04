
export interface CharacterParams {
  headWidth: number;
  headHeight: number;
  headShape: 'ellipse' | 'circle' | 'square' | 'triangle' | 'inverted-triangle';
  headCornerRadius: number;
  triangleCornerRadius: number;
  // Face params are now ratios relative to head dimensions
  eyeSizeRatio: number;      // % of head height
  eyeSpacingRatio: number;   // % of head width
  pupilSizeRatio: number;    // % of eye size
  // FIX: Corrected typo from upperEylidCoverage to upperEyelidCoverage
  upperEyelidCoverage: number; // % of eye height, renamed from eyelidCoverage
  // FIX: Corrected typo from lowerEylidCoverage to lowerEyelidCoverage
  lowerEyelidCoverage: number; // % of eye height, for the bottom lid
  eyeStyle: 'realistic' | 'blocky';
  eyeTracking: boolean;
  mouthWidthRatio: number;   // % of head width
  mouthYOffsetRatio: number; // % of head height/2 from center
  mouthIsFlipped: boolean;
  eyebrowWidthRatio: number; // % of head width
  eyebrowHeightRatio: number;// % of eye size
  eyebrowYOffsetRatio: number;// % of head height from eye line
  eyebrowAngle: number;
  // Neck width is now a ratio of head width
  neckHeight: number;
  neckWidthRatio: number;    // % of head width
  torsoHeight: number;
  torsoWidth: number;
  torsoShape: 'rectangle' | 'square' | 'circle' | 'triangle' | 'inverted-triangle';
  torsoCornerRadius: number;
  pelvisHeight: number;
  pelvisWidthRatio: number; // % of torso width
  pelvisShape: 'rectangle' | 'inverted-triangle' | 'horizontal-oval';
  armLength: number;
  lArmWidth: number;
  rArmWidth: number;
  lHandSize: number;
  rHandSize: number;
  legLength: number;
  lLegWidth: number;
  rLegWidth: number;
  lFootSize: number;
  rFootSize: number;
  lArmAngle: number;
  rArmAngle: number;
  lArmBend: number;
  rArmBend: number;
  lLegAngle: number;
  rLegAngle: number;
  lLegBend: number;
  rLegBend: number;
  bodyColor: string;
  irisColor: string;
  outlineColor: string;
  pupilColor: string;
  bodyOutlines: boolean;
  eyeOutlines: boolean;
}

export interface ParamConfig {
  min: number;
  max: number;
  step: number;
  label: string;
}

export interface BackgroundOptions {
  color1: string;
  color2: string;
  animation: boolean;
}

export type CharacterParamKey = keyof Omit<CharacterParams, 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor'>;

export type ColorParamKey = keyof Pick<CharacterParams, 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor'>;