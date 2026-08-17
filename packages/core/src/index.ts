export {
  computeAscent,
  toAscentInput,
  type AscentInput,
  type AscentParams,
  type AscentResult,
} from './ascent.js'
export { buildCueSheet, type CueEntry, type CueSheet } from './cuesheet.js'
export {
  beltRatio,
  computeGeometry,
  computeRates,
  gradeToRatio,
  runKm,
  type Geometry,
  type Rates,
  type SpeedBasis,
} from './geometry.js'
export {
  collectWarnings,
  computeMetabolic,
  runningVo2,
  selectGait,
  walkingVo2,
  type Gait,
  type Metabolic,
  type Severity,
  type Warning,
  type WarningCode,
} from './metabolic.js'
export {
  computeMinetti,
  MINETTI_GRADE_LIMIT,
  runningCost,
  walkingCost,
  type MinettiEstimate,
} from './minetti.js'
export { computePower, EFFICIENCY_PLAUSIBLE, type Power } from './power.js'
export {
  decodeAscentParams,
  decodeSessionPlan,
  encodeAscentParams,
  encodeSessionPlan,
  PARAM_KEYS,
  PLAN_KEY,
  type DecodedSessionPlan,
  type DecodeResult,
  type RejectedParam,
} from './serialize.js'
export {
  computeSession,
  solveRepeatsForGain,
  STEP_SEC_MAX,
  STEP_SEC_MIN,
  type GainSolution,
  type SessionBlock,
  type SessionPlan,
  type SessionResult,
  type SessionStep,
  type SessionStepResult,
  type SessionTotals,
  type SessionWarning,
} from './session.js'
export {
  ACSM_GRADE_LIMIT,
  DomainError,
  G0,
  GAIT_CROSSOVER_GRADE,
  GAIT_SWITCH_KMH,
  GRADE_MAX,
  GRADE_MIN,
  KCAL_PER_LITER_O2,
  kg,
  kmh,
  meters,
  O2_WATTS_PER_LPM,
  percent,
  RESTING_VO2,
  type Kg,
  type Kmh,
  type Meters,
  type Percent,
} from './units.js'
