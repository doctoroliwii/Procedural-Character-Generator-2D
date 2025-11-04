import type { CharacterParams, ParamConfig, CharacterParamKey, ColorParamKey } from './types';

export const INITIAL_PARAMS: CharacterParams = {
  headWidth: 95,
  headHeight: 110,
  headShape: 'ellipse',
  headCornerRadius: 20,
  triangleCornerRadius: 10,
  eyeSizeRatio: 11, // % of head height
  eyeSpacingRatio: 25, // % of head width
  pupilSizeRatio: 40, // % of eye size
  // FIX: Corrected typo from upperEylidCoverage to upperEyelidCoverage
  upperEyelidCoverage: 0, // % of eye height
  // FIX: Corrected typo from lowerEylidCoverage to lowerEyelidCoverage
  lowerEyelidCoverage: 0, // % of eye height
  eyeStyle: 'realistic',
  eyeTracking: true,
  mouthWidthRatio: 40, // % of head width
  mouthYOffsetRatio: 45, // % of head height/2 from center
  mouthIsFlipped: false,
  eyebrowWidthRatio: 25, // % of head width
  eyebrowHeightRatio: 40, // % of eye size
  eyebrowYOffsetRatio: 18, // % of head height from eye line
  eyebrowAngle: -10,
  neckHeight: 20,
  neckWidthRatio: 45, // % of head width
  torsoHeight: 150,
  torsoWidth: 120,
  torsoShape: 'rectangle',
  torsoCornerRadius: 20,
  pelvisHeight: 25,
  pelvisWidthRatio: 90, // % of torso width
  pelvisShape: 'rectangle',
  armLength: 120,
  lArmWidth: 18,
  rArmWidth: 18,
  lHandSize: 20,
  rHandSize: 20,
  legLength: 120,
  lLegWidth: 22,
  rLegWidth: 22,
  lFootSize: 28,
  rFootSize: 28,
  lArmAngle: 25,
  rArmAngle: 25,
  lArmBend: 30,
  rArmBend: 30,
  lLegAngle: 10,
  rLegAngle: 10,
  lLegBend: -20,
  rLegBend: -20,
  bodyColor: '#f5c68c',
  irisColor: '#3385cc',
  outlineColor: '#5e6670',
  pupilColor: '#1a1a1a',
  bodyOutlines: true,
  eyeOutlines: true,
};

export const PARAM_CONFIGS: Record<Exclude<CharacterParamKey, 'bodyOutlines' | 'eyeOutlines' | 'mouthIsFlipped' | 'eyeStyle' | 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor' | 'headShape' | 'torsoShape' | 'eyeTracking' | 'pelvisShape'>, ParamConfig> = {
  // Head
  headWidth: { min: 50, max: 130, step: 1, label: 'Head Width' },
  headHeight: { min: 70, max: 150, step: 1, label: 'Head Height' },
  headCornerRadius: { min: 0, max: 65, step: 1, label: 'Head Corners' },
  triangleCornerRadius: { min: 0, max: 50, step: 1, label: 'Triangle Corners' },
  eyeSizeRatio: { min: 8, max: 25, step: 1, label: 'Eye Size' },
  eyeSpacingRatio: { min: 15, max: 45, step: 1, label: 'Eye Spacing' },
  pupilSizeRatio: { min: 20, max: 70, step: 1, label: 'Pupil Size' },
  // FIX: Corrected typo from upperEylidCoverage to upperEyelidCoverage
  upperEyelidCoverage: { min: 0, max: 100, step: 1, label: 'Upper Eyelid' },
  // FIX: Corrected typo from lowerEylidCoverage to lowerEyelidCoverage
  lowerEyelidCoverage: { min: 0, max: 100, step: 1, label: 'Lower Eyelid' },
  mouthWidthRatio: { min: 20, max: 70, step: 1, label: 'Mouth Width' },
  mouthYOffsetRatio: { min: 20, max: 80, step: 1, label: 'Mouth Position' },
  eyebrowWidthRatio: { min: 15, max: 40, step: 1, label: 'Eyebrow Width' },
  eyebrowHeightRatio: { min: 20, max: 60, step: 1, label: 'Eyebrow Height' },
  eyebrowYOffsetRatio: { min: 10, max: 35, step: 1, label: 'Eyebrow Position' },
  eyebrowAngle: { min: -45, max: 45, step: 1, label: 'Eyebrow Angle' },
  
  // Body
  neckHeight: { min: 10, max: 50, step: 1, label: 'Neck Height' },
  neckWidthRatio: { min: 30, max: 50, step: 1, label: 'Neck Width Ratio' },
  torsoHeight: { min: 80, max: 220, step: 1, label: 'Torso Height' },
  torsoWidth: { min: 60, max: 180, step: 1, label: 'Torso Width' },
  torsoCornerRadius: { min: 0, max: 90, step: 1, label: 'Torso Corners' },
  pelvisHeight: { min: 10, max: 60, step: 1, label: 'Pelvis Height' },
  pelvisWidthRatio: { min: 50, max: 110, step: 1, label: 'Pelvis Width Ratio' },

  // Limbs
  armLength: { min: 50, max: 180, step: 1, label: 'Arm Length' },
  lArmWidth: { min: 8, max: 40, step: 1, label: 'L Arm Width' },
  rArmWidth: { min: 8, max: 40, step: 1, label: 'R Arm Width' },
  lHandSize: { min: 10, max: 40, step: 1, label: 'L Hand Size' },
  rHandSize: { min: 10, max: 40, step: 1, label: 'R Hand Size' },
  legLength: { min: 60, max: 200, step: 1, label: 'Leg Length' },
  lLegWidth: { min: 10, max: 50, step: 1, label: 'L Leg Width' },
  rLegWidth: { min: 10, max: 50, step: 1, label: 'R Leg Width' },
  lFootSize: { min: 15, max: 50, step: 1, label: 'L Foot Size' },
  rFootSize: { min: 15, max: 50, step: 1, label: 'R Foot Size' },
  lArmAngle: { min: -90, max: 120, step: 1, label: 'L Arm Angle' },
  lArmBend: { min: -100, max: 100, step: 1, label: 'L Arm Bend' },
  rArmAngle: { min: -90, max: 120, step: 1, label: 'R Arm Angle' },
  rArmBend: { min: -100, max: 100, step: 1, label: 'R Arm Bend' },
  lLegAngle: { min: -45, max: 45, step: 1, label: 'L Leg Angle' },
  lLegBend: { min: -100, max: 100, step: 1, label: 'L Leg Bend' },
  rLegAngle: { min: -45, max: 45, step: 1, label: 'R Leg Angle' },
  rLegBend: { min: -100, max: 100, step: 1, label: 'R Leg Bend' },
};