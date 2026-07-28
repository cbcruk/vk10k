/**
 * 기하 — 거리와 시간.
 *
 * 거리는 속도에 불변이다. 속도 컨벤션이 가르는 건 시간뿐이다.
 */

import type { Kmh, Meters, Percent } from './units.js'

/**
 * 표시 속도 `v`를 무엇으로 읽을지.
 *
 * - `belt`: 벨트가 지나간 사면 길이 기준. 실제 트레드밀 계기판이 이것이다. 기본값.
 * - `horizontal`: 수평 이동 기준. 인용되는 대부분의 표가 암묵적으로 쓰는 가정.
 */
export type SpeedBasis = 'belt' | 'horizontal'

export interface Geometry {
  /** 경사율, 소수(rise/run). */
  grade: number
  /** 경사각, rad. */
  angleRad: number
  /** 경사각, deg. */
  angleDeg: number
  /** 수평거리, km. */
  horizontalKm: number
  /** 사면(벨트) 거리, km. */
  beltKm: number
  /** 벨트 속도, km/h. */
  beltSpeedKmh: number
  /** 수평 속도, km/h. */
  horizontalSpeedKmh: number
  /** 수직 상승 속도, m/h. */
  vamMh: number
  /** 소요 시간, s. */
  durationSec: number
}

export function gradeToRatio(gradePercent: Percent): number {
  return gradePercent / 100
}

/** 수평거리. 속도와 무관한 순수 기하. */
export function runKm(targetGainM: Meters, grade: number): number {
  return targetGainM / grade / 1000
}

/** 사면 배율 √(1 + G²). belt / run 이 정확히 이 값이다. */
export function beltRatio(grade: number): number {
  return Math.sqrt(1 + grade * grade)
}

export function computeGeometry(
  gradePercent: Percent,
  speedKmh: Kmh,
  basis: SpeedBasis,
  targetGainM: Meters,
): Geometry {
  const grade = gradeToRatio(gradePercent)
  const angleRad = Math.atan(grade)

  // vVert = v·sinθ (belt) vs v·G (horizontal). 거리는 어느 쪽이든 같다.
  const beltSpeedKmh = basis === 'belt' ? speedKmh : speedKmh / Math.cos(angleRad)
  const horizontalSpeedKmh = basis === 'belt' ? speedKmh * Math.cos(angleRad) : speedKmh
  const vamMh = horizontalSpeedKmh * grade * 1000

  const horizontalKm = runKm(targetGainM, grade)

  return {
    grade,
    angleRad,
    angleDeg: (angleRad * 180) / Math.PI,
    horizontalKm,
    beltKm: horizontalKm * beltRatio(grade),
    beltSpeedKmh,
    horizontalSpeedKmh,
    vamMh,
    durationSec: (targetGainM / vamMh) * 3600,
  }
}
