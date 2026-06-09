export type GoldenSpatulaLoadStatus = 'ready' | 'missing' | 'error';

export interface GoldenSpatulaFileLoad<T> {
  path: string;
  status: GoldenSpatulaLoadStatus;
  data?: T;
  error?: string;
}

export interface GoldenSpatulaSeasonInfo {
  version_id?: string;
  version?: string;
  season?: string;
  name?: string;
  fetched_at?: string;
  source_urls?: Record<string, string>;
  counts?: {
    champions?: number;
    traits?: number;
    items?: number;
    augments?: number;
    lineups?: number;
  };
}

export interface GoldenSpatulaStrategyRule {
  when: string;
  recommendation: string;
}

export interface GoldenSpatulaStrategyStage {
  stage: string;
  checks?: string[];
  rules?: GoldenSpatulaStrategyRule[];
}

export interface GoldenSpatulaStrategyData {
  id: string;
  title: string;
  author?: string;
  source_url?: string;
  season?: string;
  game_version?: string;
  captured_at?: string;
  automation_profile?: {
    target?: string;
    current_phase?: string;
    enabled_actions?: string[];
    locked_actions?: string[];
  };
  main_decision?: {
    primary_paths?: string[];
    conditional_paths?: string[];
    fallback?: string;
  };
  stage_rules?: GoldenSpatulaStrategyStage[];
  lineup_codes?: Array<{
    name: string;
    code: string;
  }>;
}

export interface GoldenSpatulaTemplateManifest {
  generated_at?: string;
  category?: string;
  version_id?: string;
  entries?: unknown[];
}

export interface GoldenSpatulaChampionAsset {
  id?: number;
  name: string;
  imagePath?: string;
  sourceUrl?: string;
  templateAvailable?: boolean;
  cost?: number;
}

export type GoldenSpatulaChampionAssetIndex = Record<string, GoldenSpatulaChampionAsset>;
export type GoldenSpatulaItemAsset = GoldenSpatulaChampionAsset;
export type GoldenSpatulaItemAssetIndex = Record<string, GoldenSpatulaItemAsset>;
export type GoldenSpatulaAugmentAsset = GoldenSpatulaChampionAsset;
export type GoldenSpatulaAugmentAssetIndex = Record<string, GoldenSpatulaAugmentAsset>;

export type GoldenSpatulaTemplateCategory = 'champions' | 'items' | 'traits' | 'augments';

export interface GoldenSpatulaTemplateCategoryStatus {
  key: GoldenSpatulaTemplateCategory;
  path: string;
  status: GoldenSpatulaLoadStatus;
  count?: number;
  error?: string;
}

export interface GoldenSpatulaAssistantData {
  season: GoldenSpatulaFileLoad<GoldenSpatulaSeasonInfo>;
  strategy: GoldenSpatulaFileLoad<GoldenSpatulaStrategyData>;
  championAssets: GoldenSpatulaFileLoad<GoldenSpatulaChampionAssetIndex>;
  itemAssets: GoldenSpatulaFileLoad<GoldenSpatulaItemAssetIndex>;
  augmentAssets: GoldenSpatulaFileLoad<GoldenSpatulaAugmentAssetIndex>;
  templates: GoldenSpatulaTemplateCategoryStatus[];
  loadedAt: number;
}

export type GoldenSpatulaVariantSlot = 'A' | 'B' | 'C';

export interface GoldenSpatulaLineupUnit {
  name: string;
  items?: string[];
  location?: string;
  isCarry?: boolean;
  type?: string;
  needsReview?: boolean;
}

export interface GoldenSpatulaLineupNotes {
  early?: string;
  economy?: string;
  positioning?: string;
  matchup?: string;
}

export interface GoldenSpatulaLineupAugmentRecommendations {
  priorityIds?: number[];
  alternativeIds?: number[];
  ids?: number[];
  note?: string;
}

export interface GoldenSpatulaLineupVariant {
  id: string;
  slot: GoldenSpatulaVariantSlot;
  name: string;
  code: string;
  sourceUrl?: string;
  sourceId?: string;
  quality?: string;
  version?: string;
  season?: string;
  mainCarries: GoldenSpatulaLineupUnit[];
  frontliners: GoldenSpatulaLineupUnit[];
  units: GoldenSpatulaLineupUnit[];
  rollTargetNames?: string[];
  equipmentOrder?: string[];
  augmentRecommendations?: GoldenSpatulaLineupAugmentRecommendations;
  traitsSummary?: string;
  notes?: GoldenSpatulaLineupNotes;
}

export interface GoldenSpatulaManagedLineup {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  source?: {
    kind: 'manual' | 'recommended' | 'imported';
    sourceId?: string;
    sourceUrl?: string;
    version?: string;
  };
  tags?: string[];
  variants: GoldenSpatulaLineupVariant[];
}

export interface GoldenSpatulaLineupManagerState {
  lineups: GoldenSpatulaManagedLineup[];
  activeLineupId?: string;
  activeVariantId?: string;
}

export interface GoldenSpatulaRecommendedLineup {
  id: string;
  slug: string;
  name: string;
  path: string;
  quality?: string;
  version?: string;
  season?: string;
  sourceUrl?: string;
  variant: GoldenSpatulaLineupVariant;
}

export interface GoldenSpatulaLineupIndexData {
  generated_at?: string;
  version_id?: string;
  season?: string;
  count?: number;
  entries?: Array<{
    id?: number | string;
    slug?: string;
    name?: string;
    path?: string;
  }>;
}

export interface GoldenSpatulaRecommendedLineupsData {
  index: GoldenSpatulaFileLoad<GoldenSpatulaLineupIndexData>;
  lineups: GoldenSpatulaRecommendedLineup[];
  loadedAt: number;
}

export interface GoldenSpatulaLineupExportPackage {
  type: 'mxu.goldenSpatula.lineups';
  version: 1;
  exportedAt: string;
  lineups: GoldenSpatulaManagedLineup[];
}

export type GoldenSpatulaRecognitionKind =
  | 'smoke'
  | 'champions'
  | 'basicItems'
  | 'completedItems'
  | 'specialItems'
  | 'traits';

export type GoldenSpatulaRecognitionStatus = 'success' | 'miss' | 'error';

export interface GoldenSpatulaRecognitionSummary {
  id: string;
  timestamp: Date;
  kind: GoldenSpatulaRecognitionKind;
  status: GoldenSpatulaRecognitionStatus;
  message: string;
  nodeName?: string;
}

export type GoldenSpatulaRollEventKind =
  | 'started'
  | 'bought'
  | 'buyConfirmed'
  | 'buyUnconfirmed'
  | 'missed'
  | 'refreshed'
  | 'completed'
  | 'notReady';

export interface GoldenSpatulaRollEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaRollEventKind;
  cycle?: number;
  totalCycles?: number;
  rollCount?: number;
  targetName?: string;
  targetNames?: string[];
  slotIndex?: number;
  slotLabel?: string;
  message: string;
  nodeName?: string;
}

export interface GoldenSpatulaRollRunState {
  active: boolean;
  targetNames: string[];
  rollCount: number;
  currentCycle: number;
  totalCycles: number;
  startedAt?: number;
  updatedAt?: number;
  lastEvent?: GoldenSpatulaRollEvent;
  events: GoldenSpatulaRollEvent[];
}

export type GoldenSpatulaXpEventKind = 'started' | 'clicked' | 'completed' | 'notReady';

export interface GoldenSpatulaXpEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaXpEventKind;
  current?: number;
  total?: number;
  message: string;
  nodeName?: string;
}

export interface GoldenSpatulaXpRunState {
  active: boolean;
  current: number;
  total: number;
  startedAt?: number;
  updatedAt?: number;
  lastEvent?: GoldenSpatulaXpEvent;
  events: GoldenSpatulaXpEvent[];
}
