/**
 * 브랜디드 단위 타입.
 *
 * 계산 코어의 입력은 전부 여기를 통과한다. `number`를 그대로 받으면
 * 경사 0(→ VAM 0 → t = ∞) 같은 도메인 밖 값이 조용히 흘러들어간다.
 * 생성자에서 막고, 타입으로 다시 막는다.
 */

declare const brand: unique symbol

type Brand<T, B extends string> = T & { readonly [brand]: B }

/** 경사율, 퍼센트 단위(rise/run × 100). */
export type Percent = Brand<number, 'Percent'>
/** 속도, km/h. */
export type Kmh = Brand<number, 'Kmh'>
/** 거리/고도, m. */
export type Meters = Brand<number, 'Meters'>
/** 질량, kg. */
export type Kg = Brand<number, 'Kg'>

export class DomainError extends Error {
  constructor(
    readonly field: string,
    readonly value: number,
    readonly expectation: string,
  ) {
    super(`${field}: ${value} — ${expectation}`)
    this.name = 'DomainError'
  }
}

function guard(field: string, value: number, min: number, max: number, unit: string): void {
  if (!Number.isFinite(value)) {
    throw new DomainError(field, value, 'finite number required')
  }
  if (value < min || value > max) {
    throw new DomainError(field, value, `expected ${min}~${max} ${unit}`)
  }
}

/** 경사 도메인. 0%는 VAM = 0 → 시간 무한이라 배제한다. 45%는 실기기 상한 근처. */
export const GRADE_MIN = 1
export const GRADE_MAX = 45
/** ACSM 대사식이 검증된 경사 상한. 이 위는 전부 외삽이다. */
export const ACSM_GRADE_LIMIT = 15
/** 보행식/주행식 관례 전환 속도(벨트 기준, km/h). */
export const GAIT_SWITCH_KMH = 7
/** 두 식이 실제로 만나는 경사. 0.9G = 0.1 → G = 1/9. */
export const GAIT_CROSSOVER_GRADE = 1 / 9

export function percent(value: number): Percent {
  guard('gradePercent', value, GRADE_MIN, GRADE_MAX, '%')
  return value as Percent
}

export function kmh(value: number): Kmh {
  guard('speedKmh', value, 0.1, 30, 'km/h')
  return value as Kmh
}

export function meters(value: number): Meters {
  guard('targetGainM', value, 1, 100_000, 'm')
  return value as Meters
}

export function kg(value: number): Kg {
  guard('massKg', value, 20, 250, 'kg')
  return value as Kg
}

/** 표준 중력가속도, m/s². */
export const G0 = 9.80665
/** 산소 1 L의 에너지 등가 ≈ 20.9 kJ. W 환산 계수로 미리 접어둔다(20900/60). */
export const O2_WATTS_PER_LPM = 348.3
/** 산소 1 L ≈ 5 kcal. */
export const KCAL_PER_LITER_O2 = 5.0
/** 안정시 VO₂, mL/kg/min. */
export const RESTING_VO2 = 3.5
