import { describe, expect, it } from 'vitest'
import {
  beltRatio,
  computeAscent,
  DomainError,
  EFFICIENCY_PLAUSIBLE,
  GAIT_CROSSOVER_GRADE,
  kg,
  kmh,
  meters,
  percent,
  runningVo2,
  walkingVo2,
  type AscentInput,
  type SpeedBasis,
} from '../src/index.js'

function input(
  gradePercent: number,
  speedKmh = 5,
  speedBasis: SpeedBasis = 'belt',
  massKg = 70,
  targetGainM = 1000,
): AscentInput {
  return {
    gradePercent: percent(gradePercent),
    speedKmh: kmh(speedKmh),
    speedBasis,
    massKg: kg(massKg),
    targetGainM: meters(targetGainM),
  }
}

describe('골든 케이스 (5 km/h · belt · 70kg · 1000m)', () => {
  const cases = [
    { grade: 15, run: 6.67, belt: 6.74, minutes: 80.9, vam: 742, met: 9.8 },
    { grade: 20, run: 5.0, belt: 5.1, minutes: 61.2, vam: 981, met: 12.0 },
    { grade: 30, run: 3.33, belt: 3.48, minutes: 41.8, vam: 1437, met: 16.2 },
  ]

  for (const c of cases) {
    it(`${c.grade}%`, () => {
      const r = computeAscent(input(c.grade))
      expect(r.horizontalKm).toBeCloseTo(c.run, 2)
      expect(r.beltKm).toBeCloseTo(c.belt, 2)
      expect(r.durationSec / 60).toBeCloseTo(c.minutes, 1)
      expect(Math.round(r.vamMh)).toBe(c.vam)
      expect(r.met).toBeCloseTo(c.met, 1)
    })
  }
})

describe('거리 컨벤션', () => {
  it('run은 speedKmh / speedBasis에 불변이다 (순수 기하)', () => {
    const base = computeAscent(input(20)).horizontalKm
    for (const v of [1, 3, 5, 7, 12]) {
      for (const basis of ['belt', 'horizontal'] as const) {
        expect(computeAscent(input(20, v, basis)).horizontalKm).toBeCloseTo(base, 12)
      }
    }
  })

  it('belt / run === √(1+G²)', () => {
    for (const g of [1, 7.5, 15, 20, 30, 45]) {
      const r = computeAscent(input(g))
      expect(r.beltKm / r.horizontalKm).toBeCloseTo(beltRatio(g / 100), 12)
    }
  })

  it('belt은 30%에서 run보다 4.4% 길다', () => {
    const r = computeAscent(input(30))
    expect((r.beltKm / r.horizontalKm - 1) * 100).toBeCloseTo(4.4, 1)
  })

  it('basis는 시간을 가르고 거리는 가르지 않는다', () => {
    const belt = computeAscent(input(20, 5, 'belt'))
    const horiz = computeAscent(input(20, 5, 'horizontal'))
    expect(belt.beltKm).toBeCloseTo(horiz.beltKm, 12)
    expect(belt.durationSec / 60).toBeCloseTo(61.2, 1)
    expect(horiz.durationSec / 60).toBeCloseTo(60.0, 1)
  })

  it('결과에 어느 컨벤션인지 항상 라벨링된다', () => {
    expect(computeAscent(input(20, 5, 'horizontal')).speedBasis).toBe('horizontal')
  })
})

describe('보행식/주행식', () => {
  it('G = 1/9에서 두 식이 만난다 (속도 무관)', () => {
    for (const s of [50, 83.33, 116.67, 200]) {
      expect(walkingVo2(s, GAIT_CROSSOVER_GRADE)).toBeCloseTo(
        runningVo2(s, GAIT_CROSSOVER_GRADE),
        12,
      )
    }
  })

  it('전환 경계에서 간극의 부호가 경사에 따라 뒤집힌다', () => {
    const s = (7 * 1000) / 60
    expect(walkingVo2(s, 0) - runningVo2(s, 0)).toBeLessThan(0)
    expect(walkingVo2(s, 0.2) - runningVo2(s, 0.2)).toBeGreaterThan(0)
  })

  it('7 km/h 미만은 보행식, 이상은 주행식', () => {
    expect(computeAscent(input(20, 6.9)).gait).toBe('walking')
    expect(computeAscent(input(20, 7)).gait).toBe('running')
  })

  it('gait 판정은 벨트 속도 기준이라 basis에 따라 갈릴 수 있다', () => {
    // horizontal 6.95 km/h → belt 7.09 km/h (20%). 벨트 기준으로 주행식.
    expect(computeAscent(input(20, 6.95, 'horizontal')).gait).toBe('running')
    expect(computeAscent(input(20, 6.95, 'belt')).gait).toBe('walking')
  })
})

describe('단조성', () => {
  it('durationSec은 경사에 대해 단조감소한다', () => {
    let prev = Infinity
    for (let g = 1; g <= 45; g += 0.5) {
      const d = computeAscent(input(g)).durationSec
      expect(d).toBeLessThan(prev)
      prev = d
    }
  })

  it('vamMh는 경사에 대해 단조증가한다', () => {
    let prev = 0
    for (let g = 1; g <= 45; g += 0.5) {
      const v = computeAscent(input(g)).vamMh
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })
})

describe('경고', () => {
  it('15% 이하에서는 GRADE_EXTRAPOLATED가 없다', () => {
    const codes = computeAscent(input(15)).warnings.map((w) => w.code)
    expect(codes).not.toContain('GRADE_EXTRAPOLATED')
  })

  it('15% 초과는 외삽 경고', () => {
    const codes = computeAscent(input(15.5)).warnings.map((w) => w.code)
    expect(codes).toContain('GRADE_EXTRAPOLATED')
  })

  it('벨트 6~8 km/h는 전환 경계 경고', () => {
    expect(computeAscent(input(20, 7)).warnings.map((w) => w.code)).toContain('GAIT_BOUNDARY')
    expect(computeAscent(input(20, 5)).warnings.map((w) => w.code)).not.toContain('GAIT_BOUNDARY')
  })

  it('손잡이 경고는 항상 붙는다', () => {
    for (const g of [1, 10, 20, 45]) {
      expect(computeAscent(input(g)).warnings.map((w) => w.code)).toContain('HANDRAIL_UNMODELED')
    }
  })

  it('경고는 예외가 아니다 — 계산은 항상 성공한다', () => {
    const r = computeAscent(input(45, 16))
    expect(Number.isFinite(r.durationSec)).toBe(true)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe('도메인', () => {
  it('경사 0은 타입 생성자에서 막힌다 (VAM 0 → t = ∞)', () => {
    expect(() => percent(0)).toThrow(DomainError)
  })

  it('경사 상한 밖도 막힌다', () => {
    expect(() => percent(45.1)).toThrow(DomainError)
    expect(() => percent(Number.NaN)).toThrow(DomainError)
  })

  it('체중/속도/목표고도도 도메인이 있다', () => {
    expect(() => kg(0)).toThrow(DomainError)
    expect(() => kmh(0)).toThrow(DomainError)
    expect(() => meters(0)).toThrow(DomainError)
  })
})

describe('효율 sanity check', () => {
  it('VK 영역(20~30%, 5 km/h)에서 18~25%에 든다', () => {
    for (const g of [20, 25, 30]) {
      const eff = computeAscent(input(g)).efficiency
      expect(eff).toBeGreaterThanOrEqual(EFFICIENCY_PLAUSIBLE.min)
      expect(eff).toBeLessThanOrEqual(EFFICIENCY_PLAUSIBLE.max)
    }
  })

  it('낮은 경사에서는 작게 나온다 (수평 이동 일이 분자에 없음)', () => {
    expect(computeAscent(input(2)).efficiency).toBeLessThan(EFFICIENCY_PLAUSIBLE.min)
  })
})

describe('에너지 회계', () => {
  it('kcal은 시간에 비례한다 (목표고도 2배 → kcal 2배)', () => {
    const a = computeAscent(input(20, 5, 'belt', 70, 1000))
    const b = computeAscent(input(20, 5, 'belt', 70, 2000))
    expect(b.kcal / a.kcal).toBeCloseTo(2, 9)
  })

  it('mechanicalW = m·g·VAM/3600', () => {
    const r = computeAscent(input(20))
    expect(r.mechanicalW).toBeCloseTo(70 * 9.80665 * (r.vamMh / 3600), 9)
  })
})
