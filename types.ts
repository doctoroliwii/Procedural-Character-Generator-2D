

export type BackgroundType = 'exterior' | 'interior';
export type TextureType = 'solid' | 'grass' | 'dirt' | 'tiles' | 'wood' | 'brick' | 'wallpaper' | 'carpet' | 'concrete';
export type CloudStyle = 'fluffy' | 'wispy' | 'stormy' | 'none';
export type WindowView = 'sky' | 'buildings' | 'trees' | 'mountains' | 'abstract';
export type WallPosition = 'front' | 'back' | 'left' | 'right';
export type DoorStyle = 'simple' | 'paneled' | 'glass' | 'double';

// Parámetros del cielo
export interface SkyParams {
  topColor: string;
  bottomColor: string;
  cloudDensity: number; // 0-100
  cloudColor: string;
  cloudStyle: CloudStyle;
  sunMoonVisible: boolean;
  sunMoonPosition: { x: number; y: number }; // percentages
  sunMoonColor: string;
  sunMoonSize: number;
  stars: boolean;
  starDensity: number; // 0-100
  starColor: string;
}

// Parámetros del suelo/tierra
export interface GroundParams {
  color: string;
  texture: TextureType;
  textureScale: number; // 50-200
  textureColor1: string;
  textureColor2: string;
  textureRotation: number; // 0-360
}

// Parámetros del horizonte
export interface HorizonParams {
  position: number; // 0-100 percentage from top
  
  // Montañas
  mountainsVisible: boolean;
  mountainHeight: number; // 20-80
  mountainColor: string;
  mountainLayers: number; // 1-5
  mountainRoughness: number; // 0-100 (cuán dentadas son)
  
  // Árboles
  treesVisible: boolean;
  treeCount: number; // 3-30
  treeSize: number; // 20-150
  treeColor: string;
  treeVariation: number; // 0-100 (variación de tamaños)
  
  // Edificios
  buildingsVisible: boolean;
  buildingCount: number; // 3-20
  buildingMinHeight: number; // 50-200
  buildingMaxHeight: number; // 100-400
  buildingColor: string;
  buildingWindows: boolean;
}

// Parámetros de habitación 3D
export interface RoomParams {
  width: number; // 200-800 (ancho frontal en px)
  depth: number; // 100-600 (profundidad en px)
  height: number; // 150-500 (altura en px)
  
  wallColor: string;
  wallTexture: TextureType;
  wallTextureScale: number;
  
  floorColor: string;
  floorTexture: TextureType;
  floorTextureScale: number;
  
  ceilingVisible: boolean;
  ceilingColor: string;
  ceilingTexture: TextureType;
  
  baseboardVisible: boolean;
  baseboardColor: string;
  baseboardHeight: number; // 5-30
  
  cornerRadius: number; // 0-20 (redondeo de esquinas)
}

// Parámetros de ventana
export interface WindowParams {
  id: string;
  enabled: boolean;
  wall: WallPosition;
  position: { x: number; y: number }; // percentage 0-100
  width: number; // percentage 10-80
  height: number; // percentage 15-70
  frameColor: string;
  frameWidth: number; // 2-10
  panes: number; // 1, 2, 4, 6, 9 (grid)
  glass: boolean;
  glassOpacity: number; // 0-100
  glassColor: string;
  curtains: boolean;
  curtainColor: string;
  curtainStyle: 'left' | 'right' | 'both' | 'center';
  curtainOpen: number; // 0-100
  viewOutside: WindowView;
  viewDetail: 'low' | 'medium' | 'high';
  sill: boolean;
  sillColor: string;
}

// Parámetros de puerta
export interface DoorParams {
  id: string;
  enabled: boolean;
  wall: WallPosition;
  position: { x: number; y: number }; // percentage
  width: number; // percentage 15-40
  height: number; // percentage 35-60
  color: string;
  frameColor: string;
  style: DoorStyle;
  handleVisible: boolean;
  handleColor: string;
  handleSide: 'left' | 'right';
  open: boolean;
  openAmount: number; // 0-100 (degrees of rotation)
  threshold: boolean;
  thresholdColor: string;
}

// Elemento de mobiliario (futuro)
export interface FurnitureItem {
  id: string;
  type: 'table' | 'chair' | 'shelf' | 'plant' | 'lamp' | 'picture' | 'rug' | 'custom';
  position: { x: number; y: number; z: number }; // 3D space
  scale: number;
  rotation: number; // 0-360
  color: string;
  visible: boolean;
}

// Background completo
export interface ProceduralBackground {
  id: string;
  name: string;
  type: BackgroundType;
  
  // Exterior
  sky: SkyParams;
  ground: GroundParams;
  horizon: HorizonParams;
  
  // Interior
  room: RoomParams;
  windows: WindowParams[];
  doors: DoorParams[];
  furniture: FurnitureItem[]; // Para futuro
  
  // Común
  viewAngle: number; // -45 to 45 (horizontal rotation)
  viewHeight: number; // -30 to 30 (vertical tilt)
  focalLength: number; // 300-1000 (perspectiva)
  ambientLight: number; // 0-100
  ambientColor: string;
  shadows: boolean;
  shadowIntensity: number; // 0-100
  fogEnabled: boolean;
  fogColor: string;
  fogDensity: number; // 0-100
  
  // Canvas
  canvasWidth: number; // default 800
  canvasHeight: number; // default 600
}


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
  shotType: string;
  backgroundImageB64?: string;
  proceduralBackground?: ProceduralBackground;
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

// --- NEW SCRIPTING SYSTEM TYPES ---

export interface NarrativePanelScript {
  panelNumber: number;
  description: string;
  emotion: string;
  dialogues: DialogueData[];
  shotType: string;
  techNotes: string;
  dynamicAlt: string;
  charactersInPanel: number[];
}

export interface NarrativePageScript {
  pageNumber: number;
  context: string;
  panels: NarrativePanelScript[];
}

export interface NarrativeScript {
  theme: string;
  scene: string;
  pages: NarrativePageScript[];
  characterList?: {
    id: number;
    name: string;
    description: string;
  }[];
}