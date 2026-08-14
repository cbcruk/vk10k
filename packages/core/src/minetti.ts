/**
 * 대안 모델 — Minetti et al. (2002).
 *
 * ACSM 식은 경사 15%까지만 검증됐다. VK 영역은 전부 외삽이고, "10~20%
 * 과대추정"이라는 말은 그 자체로는 검증할 수 없는 주장이다. Minetti는
 * −45%~+45% 경사대를 실측해 이동거리 1 m당 대사비용을 5차 다항식으로
 * 적합했다. 우리 경사 도메인(1~45%)이 통째로 그 안에 든다.
 *
 * 두 모델을 나란히 내보내는 게 목적이다. 어느 쪽이 옳다고 고르지 않는다.
 * 벌어지는 폭이 곧 "이 숫자를 얼마나 못 믿는지"다.
 *
 * Minetti AE, Moia C, Roi GS, Susta D, Ferretti G (2002).
 * Energy cost of walking and running at extreme uphill and downhill slopes.
 * J Appl Physiol 93:1039–1046.
 */

import type { Gait } from './metabolic.js'
import { KCAL_PER_LITER_O2, O2_WATTS_PER_LPM, RESTING_VO2, type Kg } from './units.js'

/** 다항식이 적합된 경사 범위(소수). 우리 도메인 상한 45%와 정확히 맞물린다. */
export const MINETTI_GRADE_LIMIT = 0.45

/**
 * 보행 대사비용, J/(kg·m). i = 경사(소수).
 * Cw = 280.5i⁵ − 58.7i⁴ − 76.8i³ + 51.9i² + 19.6i + 2.5
 */
export function walkingCost(grade: number): number {
  return ((((280.5 * grade - 58.7) * grade - 76.8) * grade + 51.9) * grade + 19.6) * grade + 2.5
}

/**
 * 주행 대사비용, J/(kg·m).
 * Cr = 155.4i⁵ − 30.4i⁴ − 43.3i³ + 46.3i² + 19.5i + 3.6
 */
export function runningCost(grade: number): number {
  return ((((155.4 * grade - 30.4) * grade - 43.3) * grade + 46.3) * grade + 19.5) * grade + 3.6
}

export interface MinettiEstimate {
  /** 이동거리 1 m당 대사비용, J/(kg·m). 벨트(사면) 거리 기준. */
  costJPerKgM: number
  /** VO₂, mL/kg/min. 안정시 3.5를 더한 총량 — ACSM과 같은 축에 놓기 위해서다. */
  vo2: number
  met: number
  kcal: number
  metabolicW: number
  /** 경사가 다항식 적합 범위 밖이면 true. 도메인상 현재는 발생하지 않는다. */
  extrapolated: boolean
}

/**
 * Minetti의 비용은 **사면(벨트) 이동거리 1 m당**이고 **안정시 대사를 뺀 순수
 * 증분**이다. ACSM 식은 안정시 3.5를 포함한 총량이라, 비교하려면 3.5를
 * 되돌려 놓아야 한다. 그러지 않으면 모델 차이가 아니라 기준선 차이를 본다.
 */
export function computeMinetti(
  grade: number,
  beltSpeedKmh: number,
  massKg: Kg,
  durationSec: number,
  gait: Gait,
): MinettiEstimate {
  const costJPerKgM = gait === 'walking' ? walkingCost(grade) : runningCost(grade)

  // J/(kg·m) × m/s = W/kg
  const netWattsPerKg = costJPerKgM * ((beltSpeedKmh * 1000) / 3600)
  const vo2 = (netWattsPerKg / O2_WATTS_PER_LPM) * 1000 + RESTING_VO2

  return {
    costJPerKgM,
    vo2,
    met: vo2 / RESTING_VO2,
    kcal: ((vo2 * massKg) / 1000) * KCAL_PER_LITER_O2 * (durationSec / 60),
    metabolicW: ((vo2 * massKg) / 1000) * O2_WATTS_PER_LPM,
    extrapolated: Math.abs(grade) > MINETTI_GRADE_LIMIT,
  }
}
