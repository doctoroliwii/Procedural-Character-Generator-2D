

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
  eyelashes: boolean;
  eyelashCount: number;
  eyelashLength: number;
  eyelashAngle: number;
  mouthWidthRatio: number;   // % of head width
  mouthYOffsetRatio: number; // % of head height/2 from center
  mouthBend: number;
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
  pelvisShape: 'rectangle' | 'horizontal-oval';
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
  hair: boolean;
  backHairWidthRatio: number;
  backHairHeightRatio: number;
  fringeHeightRatio: number;
  viewAngle: number;
  bodyColor: string;
  irisColor: string;
  outlineColor: string;
  pupilColor: string;
  hairColor: string;
  bodyOutlines: boolean;
  eyeOutlines: boolean;
}

export interface CharacterInstance {
  params: CharacterParams;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  isFlipped?: boolean;
  lookAt?: { x: number; y: number };
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

export type CharacterParamKey = keyof Omit<CharacterParams, 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor' | 'hairColor'>;

export type ColorParamKey = keyof Pick<CharacterParams, 'bodyColor' | 'irisColor' | 'outlineColor' | 'pupilColor' | 'hairColor'>;

export interface LayoutData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DialogueData {
  characterId: number;
  text: string;
}

export interface ComicPanelData {
  id: string;
  layout: LayoutData;
  characters: CharacterInstance[];
  characterIdsInPanel: number[];
  dialogues: DialogueData[];
  backgroundColor: string;
  description: string;
  shotType: 'close-up' | 'medium-shot' | 'full-shot';
  backgroundImageB64?: string;
}

// --- NEW NARRATIVE SYSTEM TYPES ---

export interface Segment {
  text: string;
  source: 'user' | 'ai';
}
export type RichText = Segment[];


export interface Location {
  id: string;
  name: RichText;
  description: RichText;
  imageB64?: string;
}

export interface Lore {
  genre: RichText;
  rules: RichText;
  locations: Location[];
  history: RichText;
}

export interface Psychology {
  motivation: RichText;
  fear: RichText;
  virtues: RichText;
  flaws: RichText;
  archetype: RichText;
}

export interface Backstory {
  origin: RichText;
  wound: RichText;
  journey: RichText;
  initialState: RichText;
}

export interface CharacterProfile {
  id: string;
  name: RichText;
  age: RichText;
  species: RichText;
  occupation: RichText;
  originLocationId: string;
  psychology: Psychology;
  skills: RichText;
  limitations: RichText;
  backstory: Backstory;
  characterParams?: CharacterParams;
}

export interface StoryCircleStep {
  step: number;
  title: string;
  description: string;
}

export interface Story {
  genre: RichText;
  stakes: RichText;
  characterProfileIds: string[];
  storyCircle: StoryCircleStep[];
}

export interface Project {
  name: RichText;
  genre: RichText;
  seasons: number;
  episodes: number;
  lore: Lore | null;
  characterProfiles: CharacterProfile[];
  comicPages: ComicPanelData[][];
}