import { describe, expect, it } from 'vitest'
import {
  computeAscent,
  kg,
  kmh,
  meters,
  MINETTI_GRADE_LIMIT,
  percent,
  runningCost,
  walkingCost,
  type AscentInput,
} from '../src/index.js'

function input(gradePercent: number, speedKmh = 5): AscentInput {
  return {
    gradePercent: percent(gradePercent),
    speedKmh: kmh(speedKmh),
    speedBasis: 'belt',
    massKg: kg(70),
    targetGainM: meters(1000),
  }
}

describe('대사비용 다항식', () => {
  it('평지 절편이 논문 값과 맞는다 — 보행 2.5, 주행 3.6 J/(kg·m)', () => {
    expect(walkingCost(0)).toBeCloseTo(2.5, 12)
    expect(runningCost(0)).toBeCloseTo(3.6, 12)
  })

  it('오르막에서 단조증가한다', () => {
    let prevW = 0
    let prevR = 0
    for (let g = 0; g <= MINETTI_GRADE_LIMIT; g += 0.01) {
      expect(walkingCost(g)).toBeGreaterThan(prevW)
      expect(runningCost(g)).toBeGreaterThan(prevR)
      prevW = walkingCost(g)
      prevR = runningCost(g)
    }
  })

  it('오르막 전 구간에서 보행이 주행보다 m당 싸다', () => {
    for (let g = 0; g <= MINETTI_GRADE_LIMIT; g += 0.05) {
      expect(walkingCost(g)).toBeLessThan(runningCost(g))
    }
  })
})

describe('추정값', () => {
  // 20% · 5 km/h: Cw = 7.877 J/(kg·m) → 10.94 W/kg → VO₂ 31.4 + 3.5
  it('20% · 5 km/h에서 MET 10.0', () => {
    const r = computeAscent(input(20))
    expect(r.minetti.costJPerKgM).toBeCloseTo(7.877, 3)
    expect(r.minetti.met).toBeCloseTo(9.97, 2)
  })

  it('30% · 5 km/h에서 MET 13.7', () => {
    const r = computeAscent(input(30))
    expect(r.minetti.costJPerKgM).toBeCloseTo(11.184, 3)
    expect(r.minetti.met).toBeCloseTo(13.74, 2)
  })

  it('도메인 상한 45%가 다항식 적합 범위 안에 있다', () => {
    expect(computeAscent(input(45)).minetti.extrapolated).toBe(false)
  })

  it('kcal은 ACSM과 같은 시간축을 쓴다', () => {
    const r = computeAscent(input(20))
    const ratio = r.kcal / r.minetti.kcal
    expect(ratio).toBeCloseTo(r.met / r.minetti.met, 9)
  })

  it('비용은 벨트 거리 기준이라 basis를 바꾸면 벨트 속도를 따라간다', () => {
    const belt = computeAscent(input(20))
    const horiz = computeAscent({ ...input(20), speedBasis: 'horizontal' })
    // horizontal 5 km/h → 벨트 5.10 km/h. 같은 경사면 비용 계수는 같으니 VO₂ 증분이 그 비율만큼 커진다.
    expect((horiz.minetti.vo2 - 3.5) / (belt.minetti.vo2 - 3.5)).toBeCloseTo(
      horiz.beltSpeedKmh / belt.beltSpeedKmh,
      9,
    )
  })
})

describe('ACSM 대조 — 외삽이 얼마나 벌어지는지', () => {
  it('VK 영역에서 ACSM이 더 크게 나온다', () => {
    for (const g of [20, 25, 30]) {
      const r = computeAscent(input(g))
      expect(r.met).toBeGreaterThan(r.minetti.met)
    }
  })

  it('20~30%에서 과대추정 폭이 10~25%에 든다', () => {
    for (const g of [20, 25, 30]) {
      const r = computeAscent(input(g))
      const overestimate = (r.met / r.minetti.met - 1) * 100
      expect(overestimate).toBeGreaterThan(10)
      expect(overestimate).toBeLessThan(25)
    }
  })

  it('과대추정 폭은 경사에 단조가 아니다 — 20% 근처가 최대고 양끝에서 좁아진다', () => {
    const gap = (g: number) => {
      const r = computeAscent(input(g))
      return r.met / r.minetti.met - 1
    }
    expect(gap(20)).toBeGreaterThan(gap(5))
    expect(gap(20)).toBeGreaterThan(gap(45))
  })

  /**
   * 주행식은 경사 계수가 보행식의 절반(0.9 vs 1.8)인데 Minetti의 주행 비용은
   * 계속 가파르게 오른다. 그래서 전환 속도 위에서는 ACSM이 오히려 과소추정한다.
   * "ACSM은 과대추정한다"는 통설이 보행 구간에만 해당한다는 뜻이다.
   */
  it('주행식 구간에서는 부호가 뒤집혀 ACSM이 과소추정한다', () => {
    for (const g of [20, 30, 45]) {
      const r = computeAscent(input(g, 8))
      expect(r.met).toBeLessThan(r.minetti.met)
    }
    expect(computeAscent(input(45, 8)).met / computeAscent(input(45, 8)).minetti.met - 1).toBeLessThan(
      -0.3,
    )
  })
})
