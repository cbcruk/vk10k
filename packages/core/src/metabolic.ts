/**
 * ACSM 대사 추정 + 신뢰도 경고.
 *
 * 경고는 예외가 아니라 결과의 일부다. 계산은 항상 성공하고,
 * "어디부터 못 믿는지"가 데이터로 딸려 나온다.
 */

import {
  ACSM_GRADE_LIMIT,
  GAIT_SWITCH_KMH,
  KCAL_PER_LITER_O2,
  RESTING_VO2,
  type Kg,
} from './units.js'

export type Gait = 'walking' | 'running'

export type WarningCode =
  /** 경사 > 15%. ACSM 검증범위 밖. 통상 10~20% 과대추정. */
  | 'GRADE_EXTRAPOLATED'
  /** 벨트 속도 6~8 km/h. 보행식/주행식 하드 전환 구간. */
  | 'GAIT_BOUNDARY'
  /** 손잡이 파지가 식에 없다. 고정 경고. */
  | 'HANDRAIL_UNMODELED'

export type Severity = 'info' | 'caution'

export interface Warning {
  code: WarningCode
  severity: Severity
  /** 사람이 읽는 한 줄. UI가 그대로 노출해도 되는 문장. */
  message: string
  /** 경고를 유발한 값(있으면). 디버깅/표시용. */
  detail?: string
}

export interface Metabolic {
  gait: Gait
  /** VO₂, mL/kg/min. */
  vo2: number
  met: number
  /** 총 소비 열량, kcal. */
  kcal: number
  warnings: Warning[]
}

/** 보행식: VO₂ = 0.1·S + 1.8·S·G + 3.5 (S = 벨트속도 m/min). */
export function walkingVo2(beltSpeedMPerMin: number, grade: number): number {
  return 0.1 * beltSpeedMPerMin + 1.8 * beltSpeedMPerMin * grade + RESTING_VO2
}

/** 주행식: VO₂ = 0.2·S + 0.9·S·G + 3.5. */
export function runningVo2(beltSpeedMPerMin: number, grade: number): number {
  return 0.2 * beltSpeedMPerMin + 0.9 * beltSpeedMPerMin * grade + RESTING_VO2
}

/**
 * 전환은 하드 컷이다(v0.1). 벨트 속도 기준 7 km/h.
 *
 * 두 식은 G = 1/9 ≈ 11.1%에서 속도와 무관하게 만난다. 그 위로 갈수록
 * 전환점에서 값이 튀고, 하필 VK 영역이 간극이 가장 큰 쪽이다.
 * 6~8 km/h 선형 블렌딩은 실측 대조 전까지 넣지 않는다 —
 * 근거 없는 보간은 정밀해 보이기만 하고 더 틀린다.
 */
export function selectGait(beltSpeedKmh: number): Gait {
  return beltSpeedKmh < GAIT_SWITCH_KMH ? 'walking' : 'running'
}

export function collectWarnings(gradePercent: number, beltSpeedKmh: number): Warning[] {
  const warnings: Warning[] = []

  if (gradePercent > ACSM_GRADE_LIMIT) {
    warnings.push({
      code: 'GRADE_EXTRAPOLATED',
      severity: 'caution',
      message: `경사 ${gradePercent.toFixed(1)}%는 ACSM 검증범위(≤${ACSM_GRADE_LIMIT}%) 밖입니다. 외삽이며 통상 10~20% 과대추정됩니다.`,
      detail: `grade ${gradePercent.toFixed(1)}% > ${ACSM_GRADE_LIMIT}%`,
    })
  }

  if (beltSpeedKmh >= 6 && beltSpeedKmh <= 8) {
    warnings.push({
      code: 'GAIT_BOUNDARY',
      severity: 'caution',
      message: `벨트 속도 ${beltSpeedKmh.toFixed(1)} km/h는 보행식/주행식 전환 구간입니다. 7 km/h 경계에서 추정치가 불연속으로 튑니다.`,
      detail: `belt ${beltSpeedKmh.toFixed(1)} km/h ∈ [6, 8]`,
    })
  }

  warnings.push({
    code: 'HANDRAIL_UNMODELED',
    severity: 'info',
    message: '손잡이를 잡으면 실측 VO₂가 유의하게 떨어지지만 ACSM 식에는 반영되지 않습니다.',
  })

  return warnings
}

export function computeMetabolic(
  gradePercent: number,
  grade: number,
  beltSpeedKmh: number,
  massKg: Kg,
  durationSec: number,
): Metabolic {
  const beltSpeedMPerMin = (beltSpeedKmh * 1000) / 60
  const gait = selectGait(beltSpeedKmh)
  const vo2 =
    gait === 'walking'
      ? walkingVo2(beltSpeedMPerMin, grade)
      : runningVo2(beltSpeedMPerMin, grade)

  const kcalPerMin = ((vo2 * massKg) / 1000) * KCAL_PER_LITER_O2

  return {
    gait,
    vo2,
    met: vo2 / RESTING_VO2,
    kcal: kcalPerMin * (durationSec / 60),
    warnings: collectWarnings(gradePercent, beltSpeedKmh),
  }
}
