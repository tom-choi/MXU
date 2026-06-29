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

export interface GoldenSpatulaChampionSkill {
  name?: string;
  description?: string;
  briefValue?: string;
  valueDescription?: string;
  icon?: string;
}

export interface GoldenSpatulaChampionStat {
  level?: number;
  sellPrice?: number;
  armor?: number;
  attackRange?: number;
  attackSpeed?: number;
  criticalStrikeChance?: number;
  attackDamage?: number;
  hp?: number;
  initialMana?: number;
  magicResist?: number;
  maxMana?: number;
}

export interface GoldenSpatulaChampionAsset {
  id?: number;
  name: string;
  imagePath?: string;
  sourceUrl?: string;
  templateAvailable?: boolean;
  cost?: number;
  traits?: string[];
  skill?: GoldenSpatulaChampionSkill;
  stats?: GoldenSpatulaChampionStat[];
}

export type GoldenSpatulaChampionAssetIndex = Record<string, GoldenSpatulaChampionAsset>;
export type GoldenSpatulaItemAsset = GoldenSpatulaChampionAsset;
export type GoldenSpatulaItemAssetIndex = Record<string, GoldenSpatulaItemAsset>;
export interface GoldenSpatulaTraitAsset extends GoldenSpatulaChampionAsset {
  slug?: string;
  description?: string;
  effect?: string;
  aliases?: string[];
  thresholds?: number[];
  members?: Array<{
    id?: number;
    name: string;
    cost?: number;
  }>;
}
export type GoldenSpatulaTraitAssetIndex = Record<string, GoldenSpatulaTraitAsset>;
export interface GoldenSpatulaAugmentAsset extends GoldenSpatulaChampionAsset {
  slug?: string;
  level?: number;
  description?: string;
  aliases?: string[];
  isLegend?: boolean;
  heroEnhancementType?: string;
}
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
  traitAssets: GoldenSpatulaFileLoad<GoldenSpatulaTraitAssetIndex>;
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
  details?: GoldenSpatulaLineupAugmentRecommendationDetail[];
}

export type GoldenSpatulaLineupAugmentRecommendationGroup =
  | 'priority'
  | 'alternative'
  | 'recommended';

export type GoldenSpatulaLineupAugmentStrengthTier =
  | 'OP'
  | 'S'
  | 'A'
  | 'B'
  | 'C'
  | 'contextual'
  | 'unknown';

export interface GoldenSpatulaLineupAugmentRecommendationDetail {
  id: number;
  name?: string;
  group?: GoldenSpatulaLineupAugmentRecommendationGroup;
  rank?: number;
  recommendationIndex?: number;
  strengthTier?: GoldenSpatulaLineupAugmentStrengthTier;
  level?: number;
  roleTags?: string[];
  selectionDecision?: string;
  reason?: string;
  source?: string;
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
  | 'augments'
  | 'streak'
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
  cost?: number;
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

export type GoldenSpatulaHandEventKind =
  | 'started'
  | 'benchHit'
  | 'benchMiss'
  | 'bought'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaOwnedConfidence = 'confirmed' | 'estimated' | 'stale';

export interface GoldenSpatulaOwnedChampionState {
  name: string;
  count: number;
  boughtCount: number;
  benchCount: number;
  benchSlots?: string[];
  cost?: number;
  confidence?: GoldenSpatulaOwnedConfidence;
  updatedAt: number;
}

export interface GoldenSpatulaHandEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaHandEventKind;
  targetName?: string;
  targetNames?: string[];
  slotIndex?: number;
  slotLabel?: string;
  cost?: number;
  count?: number;
  message: string;
  nodeName?: string;
}

export interface GoldenSpatulaHandRunState {
  active: boolean;
  targetNames: string[];
  owned: Record<string, GoldenSpatulaOwnedChampionState>;
  startedAt?: number;
  updatedAt?: number;
  lastEvent?: GoldenSpatulaHandEvent;
  events: GoldenSpatulaHandEvent[];
}

export type GoldenSpatulaEconomyEventKind =
  | 'started'
  | 'scanned'
  | 'recognized'
  | 'scanFailed'
  | 'buyChampion'
  | 'refresh'
  | 'buyXp'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaEconomyField =
  | 'round'
  | 'gold'
  | 'level'
  | 'experience'
  | 'streak'
  | 'shopOdds';

export type GoldenSpatulaEconomyStreakKind = 'win' | 'loss' | 'none' | 'unknown';

export type GoldenSpatulaShopCost = 1 | 2 | 3 | 4 | 5;

export type GoldenSpatulaShopOddsByCost = Partial<Record<GoldenSpatulaShopCost, number>>;

export type GoldenSpatulaShopOddsSource = 'ocr' | 'levelTable' | 'mixed';

export interface GoldenSpatulaEconomySnapshot {
  round?: string;
  gold?: number;
  health?: number;
  level?: number;
  experience?: number;
  experienceMax?: number;
  streakKind?: GoldenSpatulaEconomyStreakKind;
  streakInterest?: number;
  shopOdds?: GoldenSpatulaShopOddsByCost;
  shopOddsSource?: GoldenSpatulaShopOddsSource;
  estimatedGoldDelta: number;
  boughtChampionGold: number;
  refreshGold: number;
  xpGold: number;
  xpPurchases: number;
}

export interface GoldenSpatulaEconomyEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaEconomyEventKind;
  field?: GoldenSpatulaEconomyField;
  round?: string;
  gold?: number;
  level?: number;
  experience?: number;
  experienceMax?: number;
  streakKind?: GoldenSpatulaEconomyStreakKind;
  streakInterest?: number;
  shopOdds?: GoldenSpatulaShopOddsByCost;
  shopOddsSource?: GoldenSpatulaShopOddsSource;
  goldDelta?: number;
  rawText?: string;
  targetName?: string;
  cost?: number;
  message: string;
  nodeName?: string;
}

export interface GoldenSpatulaEconomyRunState extends GoldenSpatulaEconomySnapshot {
  active: boolean;
  startedAt?: number;
  updatedAt?: number;
  lastEvent?: GoldenSpatulaEconomyEvent;
  events: GoldenSpatulaEconomyEvent[];
}

export type GoldenSpatulaKnowledgeEventKind =
  | 'shopScanStarted'
  | 'shopChampionHit'
  | 'shopSlotMiss'
  | 'shopScanCompleted'
  | 'selectedAugmentScanStarted'
  | 'selectedAugmentHit'
  | 'selectedAugmentSlotMiss'
  | 'selectedAugmentScanCompleted'
  | 'itemScanStarted'
  | 'itemHit'
  | 'itemScanCompleted'
  | 'streakScanStarted'
  | 'streakRecognized'
  | 'streakScanFailed'
  | 'streakScanCompleted';

export type GoldenSpatulaKnowledgeItemKind = 'basicItems' | 'completedItems' | 'specialItems';

export type GoldenSpatulaKnowledgeItemZone = 'inventory' | 'bench' | 'boardLower';

export type GoldenSpatulaKnowledgeStreakKind = 'win' | 'loss';

export interface GoldenSpatulaKnowledgeEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaKnowledgeEventKind;
  scanKind?: GoldenSpatulaRecognitionKind;
  slotIndex?: number;
  slotLabel?: string;
  championName?: string;
  augmentName?: string;
  templatePath?: string;
  itemKind?: GoldenSpatulaKnowledgeItemKind;
  zone?: GoldenSpatulaKnowledgeItemZone;
  streakKind?: GoldenSpatulaKnowledgeStreakKind;
  streakCount?: number;
  score?: number;
  rawText?: string;
  message: string;
  nodeName?: string;
}

export type GoldenSpatulaKnowledgeSlotConfidence = 'matched' | 'empty' | 'unknown';

export interface GoldenSpatulaKnowledgeShopSlotState {
  slotIndex: number;
  slotLabel?: string;
  championName?: string;
  templatePath?: string;
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  updatedAt: number;
}

export interface GoldenSpatulaKnowledgeItemState {
  templatePath: string;
  itemKind: GoldenSpatulaKnowledgeItemKind;
  zones: GoldenSpatulaKnowledgeItemZone[];
  updatedAt: number;
}

export interface GoldenSpatulaKnowledgeSelectedAugmentState {
  slotIndex: number;
  slotLabel?: string;
  augmentName?: string;
  templatePath?: string;
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  score?: number;
  updatedAt: number;
}

export interface GoldenSpatulaKnowledgeStreakSideState {
  kind: GoldenSpatulaKnowledgeStreakKind;
  count?: number;
  rawText?: string;
  updatedAt: number;
  status: 'recognized' | 'miss';
}

export interface GoldenSpatulaKnowledgeScanState {
  active: boolean;
  shopSlots: Record<number, GoldenSpatulaKnowledgeShopSlotState>;
  selectedAugments: Record<number, GoldenSpatulaKnowledgeSelectedAugmentState>;
  items: Record<string, GoldenSpatulaKnowledgeItemState>;
  streak: Partial<Record<GoldenSpatulaKnowledgeStreakKind, GoldenSpatulaKnowledgeStreakSideState>>;
  startedAt?: number;
  updatedAt?: number;
  lastEvent?: GoldenSpatulaKnowledgeEvent;
  events: GoldenSpatulaKnowledgeEvent[];
}

export type GoldenSpatulaContestConfidence = 'observed' | 'estimated' | 'manual';

export interface GoldenSpatulaContestChampionState {
  championName: string;
  externalCopies: number;
  playerCount?: number;
  confidence?: GoldenSpatulaContestConfidence;
  updatedAt?: number;
}

export interface GoldenSpatulaContestState {
  active?: boolean;
  champions: Record<string, GoldenSpatulaContestChampionState>;
  updatedAt?: number;
}

export type GoldenSpatulaDecisionRole = 'carry' | 'frontline' | 'trait' | 'transition' | 'power';

export type GoldenSpatulaDecisionTier = 'core' | 'high' | 'medium' | 'watch';

export type GoldenSpatulaDecisionReason =
  | 'activeCarry'
  | 'activeFrontline'
  | 'activeLineup'
  | 'recommendedCarry'
  | 'recommendedOverlap'
  | 'nearUpgrade'
  | 'shopVisible'
  | 'itemFit'
  | 'stageFit'
  | 'streakPressure'
  | 'highCostPower'
  | 'cheapTransition'
  | 'traitBridge'
  | 'contested'
  | 'owned'
  | 'levelOdds'
  | 'levelLocked';

export type GoldenSpatulaShopOddsAvailability = 'available' | 'rare' | 'unavailable' | 'unknown';

export type GoldenSpatulaEconomyDecisionAction = 'roll' | 'save' | 'level' | 'hold';

export type GoldenSpatulaDecisionConfidence = 'high' | 'medium' | 'low';

export type GoldenSpatulaTempoPhase = 'early' | 'mid' | 'late' | 'unknown';

export type GoldenSpatulaStreakPressure = 'push' | 'preserve' | 'neutral';

export type GoldenSpatulaRollDecisionFactor =
  | 'healthPressure'
  | 'combatGap'
  | 'targetClarity'
  | 'pairsAndOuts'
  | 'economyMargin';

export type GoldenSpatulaRollDecisionBand = 'none' | 'smallRoll' | 'rollToQuality';

export type GoldenSpatulaRoundPolicyCheckpoint =
  | '2-1'
  | '2-5'
  | '3-2'
  | '3-5'
  | '4-1'
  | '4-2'
  | '5-1';

export type GoldenSpatulaRoundPolicyKind =
  | 'streakPush'
  | 'standardLevel'
  | 'rerollWindow'
  | 'fourCostLaunch'
  | 'lateCap'
  | 'interest';

export type GoldenSpatulaStopLossKind =
  | 'oneCostRerollAbandon'
  | 'twoCostRerollStabilize'
  | 'threeCostPivotFourCost'
  | 'fourCostStabilize'
  | 'fastNineAvoidGreed'
  | 'stopRollingSideUnits';

export type GoldenSpatulaStopLossSeverity = 'watch' | 'warning' | 'critical';

export type GoldenSpatulaStopLossAction =
  | 'stopRolling'
  | 'stabilize'
  | 'pivot'
  | 'avoidLevel'
  | 'monitor';

export interface GoldenSpatulaStopLossAdvice {
  kind: GoldenSpatulaStopLossKind;
  severity: GoldenSpatulaStopLossSeverity;
  action: GoldenSpatulaStopLossAction;
  targetNames: string[];
  reasonNames: GoldenSpatulaDecisionReason[];
  pivotPreferred?: boolean;
  bankFloor?: number;
}

export type GoldenSpatulaFormationBalanceKind =
  | 'carryBeforeFrontline'
  | 'frontlineFirst'
  | 'carryFirst'
  | 'balanced';

export interface GoldenSpatulaFormationBalanceAdvice {
  kind: GoldenSpatulaFormationBalanceKind;
  carryName?: string;
  frontlineName?: string;
  carryStable: boolean;
  frontlineStable: boolean;
  priorityTargetNames: string[];
  deprioritizedTargetNames: string[];
  reasonNames: GoldenSpatulaDecisionReason[];
}

export interface GoldenSpatulaRoundPolicyRecommendation {
  checkpoint: GoldenSpatulaRoundPolicyCheckpoint;
  kind: GoldenSpatulaRoundPolicyKind;
  action: GoldenSpatulaEconomyDecisionAction;
  confidence: GoldenSpatulaDecisionConfidence;
  targetLevel?: number;
  bankFloor?: number;
  recommendedRollCount?: number;
  focusCost?: GoldenSpatulaShopCost;
}

export interface GoldenSpatulaRollDecisionFactorScore {
  score: number;
  available: boolean;
}

export interface GoldenSpatulaRollDecisionScoreBreakdown {
  total: number;
  band: GoldenSpatulaRollDecisionBand;
  factors: Record<GoldenSpatulaRollDecisionFactor, GoldenSpatulaRollDecisionFactorScore>;
  topTargetName?: string;
  stopLineTargetNames: string[];
  unknownFactors: GoldenSpatulaRollDecisionFactor[];
}

export type GoldenSpatulaBenchDecisionKind =
  | 'fantasy'
  | 'pairBait'
  | 'transition'
  | 'directUpgrade'
  | 'core';

export type GoldenSpatulaBenchCleanupReason =
  | 'stageFourDeadSingle'
  | 'stageFourPairBait'
  | 'lowEconomyBenchTax';

export interface GoldenSpatulaBenchSellCandidate {
  name: string;
  count: number;
  benchCount: number;
  sellGold: number;
  kind: GoldenSpatulaBenchDecisionKind;
  cleanupPriority?: number;
  cleanupReason?: GoldenSpatulaBenchCleanupReason;
  score?: number;
  reasons: GoldenSpatulaDecisionReason[];
}

export interface GoldenSpatulaBenchInterestAdvice {
  interestGoldNeeded?: number;
  sellGoldAvailable: number;
  canReachNextInterest: boolean;
  cleanupRecommended: boolean;
  cleanupCandidateNames: string[];
  decisionTaxCount: number;
  benchTaxGold: number;
  sellCandidates: GoldenSpatulaBenchSellCandidate[];
  preservedNames: string[];
}

export interface GoldenSpatulaPickScoreBreakdown {
  base: number;
  bonuses: {
    owned: number;
    nearUpgrade: number;
    shopVisible: number;
    itemFit: number;
  };
  penalties: {
    complete: number;
    interestTax: number;
    contest: number;
  };
  penalty: number;
  beforeMultipliers: number;
  multipliers: {
    role: number;
    shopOdds: number;
    copiesUrgency: number;
    acquisitionEfficiency: number;
    acquisitionFeasibility: number;
    goldPressure: number;
    completionChance: number;
    expectedHitRate: number;
    tempo: number;
    level: number;
  };
  final: number;
}

export interface GoldenSpatulaPickRecommendation {
  name: string;
  score: number;
  scoreBreakdown: GoldenSpatulaPickScoreBreakdown;
  tier: GoldenSpatulaDecisionTier;
  role: GoldenSpatulaDecisionRole;
  cost?: number;
  ownedCount: number;
  ownedConfidence?: GoldenSpatulaOwnedConfidence;
  targetCount: number;
  copiesNeeded: number;
  rollTargetPriority: number;
  currentLevel?: number;
  shopOdds?: number;
  shopOddsSource?: GoldenSpatulaShopOddsSource;
  shopOddsAvailability: GoldenSpatulaShopOddsAvailability;
  nextLevel?: number;
  nextLevelShopOdds?: number;
  levelUpShopOddsGain?: number;
  levelUpShopOddsRatio?: number;
  shopVisibleCount?: number;
  observedItemMatchCount?: number;
  matchedItemNames?: string[];
  acquisitionExpectedRolls?: number;
  acquisitionExpectedSpend?: number;
  acquisitionCompletionChance?: number;
  externalContestCopies?: number;
  contestPoolShare?: number;
  traitTags: string[];
  sourceLineupNames: string[];
  reasons: GoldenSpatulaDecisionReason[];
}

export interface GoldenSpatulaTransitionLineupScoreBreakdown {
  sharedTraitScore: number;
  unitCountScore: number;
  sourceWeightScore: number;
  unitScore: number;
  stageReachScore: number;
  itemBridgeScore: number;
  itemFamilyScore: number;
  structureScore: number;
  lowCostBridgeScore: number;
  costCurveScore: number;
  guideScore: number;
  coreReachRatio: number;
  spendPressurePenalty: number;
  highCostPressurePenalty: number;
  dreamPivotPenalty: number;
  spellCyclePenalty: number;
  lateralPivotBonus: number;
  pivotBlockedPenalty: number;
  beforePenalty: number;
  final: number;
}

export type GoldenSpatulaTransitionPlanKind =
  | 'earlyBridge'
  | 'midPivot'
  | 'lateCap'
  | 'itemCarrier';

export type GoldenSpatulaTransitionCostCurve = 'low' | 'balanced' | 'expensive' | 'spike';

export type GoldenSpatulaTransitionNextAction =
  | 'holdBridge'
  | 'itemHolder'
  | 'pivotSoon'
  | 'saveForLevel'
  | 'pushCap';

export type GoldenSpatulaTransitionRiskLevel = 'safe' | 'conditional' | 'greedy';

export type GoldenSpatulaTransitionTempoStep =
  | 'nowBridge'
  | 'itemHold'
  | 'pivot'
  | 'saveLevel'
  | 'capBoard';

export type GoldenSpatulaTransitionEconomyPlan =
  | 'holdInterest'
  | 'buyShopHits'
  | 'smallRoll'
  | 'pushLevel'
  | 'avoidOverroll';

export type GoldenSpatulaTransitionReadiness =
  | 'ready'
  | 'needShopHit'
  | 'needItems'
  | 'needLevel'
  | 'tooGreedy';

export type GoldenSpatulaTransitionRouteUnitTag = 'owned' | 'shop' | 'item' | 'carry' | 'frontline';

export interface GoldenSpatulaTransitionRouteUnit {
  name: string;
  itemNames?: string[];
  tags?: GoldenSpatulaTransitionRouteUnitTag[];
}

export interface GoldenSpatulaTransitionLineupRecommendation {
  lineupId: string;
  variantId: string;
  name: string;
  score: number;
  scoreBreakdown: GoldenSpatulaTransitionLineupScoreBreakdown;
  quality?: string;
  version?: string;
  matchedUnitNames: string[];
  shopVisibleUnitNames?: string[];
  itemFitNames?: string[];
  itemFamilyNames?: string[];
  blockedUnitNames?: string[];
  carryUnitNames?: string[];
  frontlineUnitNames?: string[];
  bridgeUnitNames?: string[];
  itemBridgeUnitNames?: string[];
  itemFamilyUnitNames?: string[];
  lowCostUnitNames?: string[];
  transitionPlanKind: GoldenSpatulaTransitionPlanKind;
  costCurve: GoldenSpatulaTransitionCostCurve;
  nextAction: GoldenSpatulaTransitionNextAction;
  riskLevel: GoldenSpatulaTransitionRiskLevel;
  economyPlan: GoldenSpatulaTransitionEconomyPlan;
  readiness: GoldenSpatulaTransitionReadiness;
  primaryReasonNames?: string[];
  shopPriorityUnitNames?: string[];
  missingKeyUnitNames?: string[];
  routeUnitNames?: string[];
  routeUnits?: GoldenSpatulaTransitionRouteUnit[];
  tempoSteps?: GoldenSpatulaTransitionTempoStep[];
  transitionHint?: string;
  targetLevel?: number;
  averageCost?: number;
  traitTags: string[];
}

export interface GoldenSpatulaEconomyDecisionBreakdown {
  urgentPickCount: number;
  tempoPickCount: number;
  levelLockedPickCount: number;
  topPickScore?: number;
  topRollTargetPriority?: number;
  nearUpgrade: boolean;
  highCostPlan: boolean;
  criticalLevelLockedNeed: boolean;
  levelUpTargetName?: string;
  levelUpLevel?: number;
  levelUpXpNeeded?: number;
  levelUpGoldNeeded?: number;
  levelUpShopOddsGain?: number;
  levelUpNextShopOdds?: number;
  levelUpShopOddsRatio?: number;
  levelUpBoardSlotPressure?: boolean;
  levelUpProjectedUnitCount?: number;
  levelUpStreakValue?: number;
  rollDecisionScore: GoldenSpatulaRollDecisionScoreBreakdown;
  roundPolicy?: GoldenSpatulaRoundPolicyRecommendation;
  stopLoss?: GoldenSpatulaStopLossAdvice;
  formationBalance?: GoldenSpatulaFormationBalanceAdvice;
  tempoPhase: GoldenSpatulaTempoPhase;
  streakPressure: GoldenSpatulaStreakPressure;
  projectedRollBudget?: number;
}

export interface GoldenSpatulaEconomyDecisionAdvice {
  action: GoldenSpatulaEconomyDecisionAction;
  confidence: GoldenSpatulaDecisionConfidence;
  recommendedRollCount: number;
  recommendedXpPurchaseCount?: number;
  breakdown: GoldenSpatulaEconomyDecisionBreakdown;
  benchInterestAdvice?: GoldenSpatulaBenchInterestAdvice;
  gold?: number;
  level?: number;
  interestGoldNeeded?: number;
  urgentPickNames: string[];
  reasons: GoldenSpatulaDecisionReason[];
}

export interface GoldenSpatulaDecisionPlan {
  generatedAt: number;
  evaluatedCandidates: number;
  evaluatedLineups: number;
  picks: GoldenSpatulaPickRecommendation[];
  recommendedRollTargetNames: string[];
  transitionLineups: GoldenSpatulaTransitionLineupRecommendation[];
  economyAdvice: GoldenSpatulaEconomyDecisionAdvice;
}
