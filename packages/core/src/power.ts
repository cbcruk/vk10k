/**
 * 일률과 효율.
 *
 * η는 정밀 지표가 아니라 sanity check다. 경사 등반에서 18~25% 밖으로
 * 나가면 입력이나 모델이 깨졌다는 신호. 낮은 경사에서 작게 나오는 건
 * 정상 — 수평 이동에 쓴 일이 분자에 없기 때문이다.
 */

import { G0, O2_WATTS_PER_LPM, type Kg } from './units.js'

export interface Power {
  /** 순수 수직 일률 m·g·(VAM/3600), W. */
  mechanicalW: number
  /** 대사 출력 VO₂ × 20.9 kJ/L, W. */
  metabolicW: number
  /** 총효율 = mechanicalW / metabolicW. */
  efficiency: number
}

/** 경사 등반에서 총효율이 이 범위를 벗어나면 sanity check 실패로 본다. */
export const EFFICIENCY_PLAUSIBLE = { min: 0.18, max: 0.25 } as const

export function computePower(vamMh: number, vo2: number, massKg: Kg): Power {
  const mechanicalW = massKg * G0 * (vamMh / 3600)
  const metabolicW = ((vo2 * massKg) / 1000) * O2_WATTS_PER_LPM
  return { mechanicalW, metabolicW, efficiency: mechanicalW / metabolicW }
}
