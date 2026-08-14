/**
 * 코어 진입점 — computeAscent.
 *
 * 계산은 항상 성공한다. 실패하는 건 도메인 밖 입력뿐이고, 그건
 * 단위 생성자(units.ts)에서 이미 걸린다. 신뢰도는 `warnings[]`로 나온다.
 */

import { computeGeometry, type SpeedBasis } from './geometry.js'
import { computeMetabolic, type Gait, type Warning } from './metabolic.js'
import { computeMinetti, type MinettiEstimate } from './minetti.js'
import { computePower } from './power.js'
import { kg, kmh, meters, percent, type Kg, type Kmh, type Meters, type Percent } from './units.js'

export interface AscentInput {
  /** 1 ~ 45 */
  gradePercent: Percent
  speedKmh: Kmh
  speedBasis: SpeedBasis
  massKg: Kg
  targetGainM: Meters
}

/**
 * `AscentInput`의 날 숫자 쌍둥이. UI 상태, URL 쿼리, FIT 파싱 결과처럼
 * 브랜디드 타입을 아직 통과하지 않은 값이 사는 곳이다.
 */
export interface AscentParams {
  gradePercent: number
  speedKmh: number
  speedBasis: SpeedBasis
  massKg: number
  targetGainM: number
}

/** 날 숫자에 브랜드를 붙인다. 도메인 밖이면 `DomainError`. */
export function toAscentInput(params: AscentParams): AscentInput {
  return {
    gradePercent: percent(params.gradePercent),
    speedKmh: kmh(params.speedKmh),
    speedBasis: params.speedBasis,
    massKg: kg(params.massKg),
    targetGainM: meters(params.targetGainM),
  }
}

export interface AscentResult {
  angleDeg: number
  horizontalKm: number
  beltKm: number
  /** 벨트 기준 속도, km/h. 입력 basis와 무관하게 항상 벨트값. */
  beltSpeedKmh: number
  /** 수평 기준 속도, km/h. */
  horizontalSpeedKmh: number
  vamMh: number
  durationSec: number
  /** VO₂, mL/kg/min. */
  vo2: number
  met: number
  kcal: number
  mechanicalW: number
  metabolicW: number
  efficiency: number
  gait: Gait
  /** 어느 컨벤션으로 읽었는지 결과에 항상 붙인다. */
  speedBasis: SpeedBasis
  /**
   * 같은 입력을 Minetti et al. (2002) 실측 기준선으로 다시 푼 값.
   * 위 필드들이 ACSM 추정이고 이건 대조군이다. 벌어지는 폭이 곧 불확실성이다.
   */
  minetti: MinettiEstimate
  /** 빈 배열이 아니면 UI가 반드시 노출한다. */
  warnings: Warning[]
}

export function computeAscent(input: AscentInput): AscentResult {
  const geo = computeGeometry(
    input.gradePercent,
    input.speedKmh,
    input.speedBasis,
    input.targetGainM,
  )
  const met = computeMetabolic(
    input.gradePercent,
    geo.grade,
    geo.beltSpeedKmh,
    input.massKg,
    geo.durationSec,
  )
  const pow = computePower(geo.vamMh, met.vo2, input.massKg)
  const minetti = computeMinetti(
    geo.grade,
    geo.beltSpeedKmh,
    input.massKg,
    geo.durationSec,
    met.gait,
  )

  return {
    angleDeg: geo.angleDeg,
    horizontalKm: geo.horizontalKm,
    beltKm: geo.beltKm,
    beltSpeedKmh: geo.beltSpeedKmh,
    horizontalSpeedKmh: geo.horizontalSpeedKmh,
    vamMh: geo.vamMh,
    durationSec: geo.durationSec,
    vo2: met.vo2,
    met: met.met,
    kcal: met.kcal,
    mechanicalW: pow.mechanicalW,
    metabolicW: pow.metabolicW,
    efficiency: pow.efficiency,
    gait: met.gait,
    speedBasis: input.speedBasis,
    minetti,
    warnings: met.warnings,
  }
}
