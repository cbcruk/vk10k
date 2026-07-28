export {
  computeAscent,
  type AscentInput,
  type AscentResult,
} from './ascent.js'
export {
  beltRatio,
  computeGeometry,
  gradeToRatio,
  runKm,
  type Geometry,
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
export { computePower, EFFICIENCY_PLAUSIBLE, type Power } from './power.js'
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
