import { describe, expect, it } from 'vitest'
import {
  computeAscent,
  computeSession,
  decodeSessionPlan,
  DomainError,
  encodeSessionPlan,
  kg,
  kmh,
  meters,
  percent,
  solveRepeatsForGain,
  type SessionPlan,
} from '../src/index.js'

/** 15% 5분 / 25% 3분 × 6 — README가 예로 든 그 세션. */
const VK_INTERVALS: SessionPlan = {
  speedBasis: 'belt',
  massKg: 70,
  blocks: [
    { repeat: 1, steps: [{ gradePercent: 3, speedKmh: 4.5, durationSec: 600 }] },
    {
      repeat: 6,
      steps: [
        { gradePercent: 15, speedKmh: 5, durationSec: 300 },
        { gradePercent: 25, speedKmh: 5, durationSec: 180 },
      ],
    },
  ],
}

describe('전개', () => {
  it('블록 반복이 스텝으로 펼쳐진다', () => {
    const { steps } = computeSession(VK_INTERVALS)
    expect(steps).toHaveLength(1 + 6 * 2)
    expect(steps[0]?.blockIndex).toBe(0)
    expect(steps[1]).toMatchObject({ blockIndex: 1, repetition: 1 })
    expect(steps[12]).toMatchObject({ blockIndex: 1, repetition: 6 })
  })

  it('총 시간은 스텝 길이의 합이다', () => {
    const { totals } = computeSession(VK_INTERVALS)
    expect(totals.durationSec).toBe(600 + 6 * (300 + 180))
    expect(totals.stepCount).toBe(13)
  })

  it('스텝 하나의 상승고도는 VAM × 시간이다', () => {
    const { steps } = computeSession(VK_INTERVALS)
    const work = steps[1]
    expect(work?.gainM).toBeCloseTo((work?.vamMh ?? 0) * (300 / 3600), 12)
  })

  it('빈 세션도 계산은 성공한다', () => {
    const { steps, totals } = computeSession({ speedBasis: 'belt', massKg: 70, blocks: [] })
    expect(steps).toEqual([])
    expect(totals.gainM).toBe(0)
    expect(totals.averageVamMh).toBe(0)
  })
})

describe('계산기와의 일치', () => {
  /**
   * 세션은 "시간 → 고도", 계산기는 "고도 → 시간"으로 반대 방향으로 푼다.
   * 같은 구간을 양쪽으로 풀면 같은 값이 나와야 한다.
   */
  it('한 스텝의 상승고도를 계산기에 넣으면 그 스텝 시간이 나온다', () => {
    const step = { gradePercent: 25, speedKmh: 5, durationSec: 180 }
    const { steps } = computeSession({ speedBasis: 'belt', massKg: 70, blocks: [{ repeat: 1, steps: [step] }] })
    const only = steps[0]!

    const viaCalculator = computeAscent({
      gradePercent: percent(step.gradePercent),
      speedKmh: kmh(step.speedKmh),
      speedBasis: 'belt',
      massKg: kg(70),
      targetGainM: meters(only.gainM),
    })

    expect(viaCalculator.durationSec).toBeCloseTo(step.durationSec, 9)
    expect(viaCalculator.beltKm).toBeCloseTo(only.beltKm, 12)
    expect(viaCalculator.kcal).toBeCloseTo(only.kcal, 9)
    expect(viaCalculator.met).toBeCloseTo(only.met, 12)
  })
})

describe('누적', () => {
  it('열량과 거리는 스텝 합과 같다', () => {
    const { steps, totals } = computeSession(VK_INTERVALS)
    const sum = (pick: (s: (typeof steps)[number]) => number) =>
      steps.reduce((a, s) => a + pick(s), 0)

    expect(totals.kcal).toBeCloseTo(sum((s) => s.kcal), 9)
    expect(totals.gainM).toBeCloseTo(sum((s) => s.gainM), 9)
    expect(totals.beltKm).toBeCloseTo(sum((s) => s.beltKm), 9)
    expect(totals.minettiKcal).toBeCloseTo(sum((s) => s.minettiKcal), 9)
  })

  it('평균 VAM은 쉬는 구간 때문에 최고 구간보다 낮다', () => {
    const { steps, totals } = computeSession(VK_INTERVALS)
    const peak = Math.max(...steps.map((s) => s.vamMh))
    expect(totals.averageVamMh).toBeLessThan(peak)
    expect(totals.averageVamMh).toBeCloseTo(totals.gainM / (totals.durationSec / 3600), 9)
  })

  it('평균 MET은 시간가중이다 — 짧은 고강도 구간이 과대반영되지 않는다', () => {
    const plan: SessionPlan = {
      speedBasis: 'belt',
      massKg: 70,
      blocks: [
        {
          repeat: 1,
          steps: [
            { gradePercent: 1, speedKmh: 5, durationSec: 3540 }, // 59분 저강도
            { gradePercent: 40, speedKmh: 5, durationSec: 60 }, // 1분 고강도
          ],
        },
      ],
    }
    const { steps, totals } = computeSession(plan)
    const naive = (steps[0]!.met + steps[1]!.met) / 2
    expect(totals.averageMet).toBeLessThan(naive)
    expect(totals.averageMet).toBeCloseTo(steps[0]!.met, 0)
  })

  it('최고 경사를 기록한다', () => {
    expect(computeSession(VK_INTERVALS).totals.peakGradePercent).toBe(25)
  })
})

describe('경고 합치기', () => {
  it('같은 코드는 하나로 묶고 유발한 스텝을 남긴다', () => {
    const { warnings } = computeSession(VK_INTERVALS)
    const extrapolated = warnings.find((w) => w.code === 'GRADE_EXTRAPOLATED')

    // 25% 스텝 6개만 외삽. 15%와 3%는 검증범위 안이다.
    expect(extrapolated?.sources).toHaveLength(6)
    expect(warnings.filter((w) => w.code === 'GRADE_EXTRAPOLATED')).toHaveLength(1)
  })

  it('경사가 전부 15% 이하면 외삽 경고가 없다', () => {
    const { warnings } = computeSession({
      speedBasis: 'belt',
      massKg: 70,
      blocks: [{ repeat: 2, steps: [{ gradePercent: 12, speedKmh: 5, durationSec: 300 }] }],
    })
    expect(warnings.map((w) => w.code)).not.toContain('GRADE_EXTRAPOLATED')
    expect(warnings.map((w) => w.code)).toContain('HANDRAIL_UNMODELED')
  })
})

describe('도메인', () => {
  it('0초 구간은 막는다', () => {
    expect(() =>
      computeSession({
        speedBasis: 'belt',
        massKg: 70,
        blocks: [{ repeat: 1, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 0 }] }],
      }),
    ).toThrow(DomainError)
  })

  it('반복은 1 이상 정수다', () => {
    for (const repeat of [0, -1, 1.5]) {
      expect(() =>
        computeSession({
          speedBasis: 'belt',
          massKg: 70,
          blocks: [{ repeat, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 60 }] }],
        }),
      ).toThrow(DomainError)
    }
  })

  it('경사 0은 스텝에서도 막힌다', () => {
    expect(() =>
      computeSession({
        speedBasis: 'belt',
        massKg: 70,
        blocks: [{ repeat: 1, steps: [{ gradePercent: 0, speedKmh: 5, durationSec: 60 }] }],
      }),
    ).toThrow(DomainError)
  })
})

describe('VK 목표 역산', () => {
  it('목표를 넘기는 최소 반복수를 준다', () => {
    const solution = solveRepeatsForGain(VK_INTERVALS, 1, 1000)
    expect(solution.reachable).toBe(true)
    expect(solution.gainM).toBeGreaterThanOrEqual(1000)

    // 한 바퀴 덜 돌면 목표에 못 미친다 — 최소성 확인
    const oneLess = computeSession({
      ...VK_INTERVALS,
      blocks: VK_INTERVALS.blocks.map((b, i) =>
        i === 1 ? { ...b, repeat: solution.repeat - 1 } : b,
      ),
    })
    expect(oneLess.totals.gainM).toBeLessThan(1000)
  })

  it('반올림 전 해도 같이 준다', () => {
    const solution = solveRepeatsForGain(VK_INTERVALS, 1, 1000)
    expect(solution.repeat).toBe(Math.ceil(solution.exactRepeat))
  })

  it('다른 블록이 쌓은 고도를 먼저 뺀다', () => {
    const withWarmup = solveRepeatsForGain(VK_INTERVALS, 1, 1000)
    const withoutWarmup = solveRepeatsForGain(
      { ...VK_INTERVALS, blocks: [VK_INTERVALS.blocks[1]!] },
      0,
      1000,
    )
    expect(withWarmup.exactRepeat).toBeLessThan(withoutWarmup.exactRepeat)
  })

  it('해가 정확히 떨어지면 올림이 늘리지 않는다', () => {
    const plan: SessionPlan = {
      speedBasis: 'horizontal',
      massKg: 70,
      // 수평 기준 20% · 5 km/h → VAM 1000 m/h. 6분이면 정확히 100 m.
      blocks: [{ repeat: 1, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 360 }] }],
    }
    const solution = solveRepeatsForGain(plan, 0, 1000)
    expect(solution.exactRepeat).toBeCloseTo(10, 9)
    expect(solution.repeat).toBe(10)
  })

  it('없는 블록을 지목하면 막는다', () => {
    expect(() => solveRepeatsForGain(VK_INTERVALS, 9, 1000)).toThrow(DomainError)
  })
})

describe('플랜 직렬화', () => {
  it('사람이 읽을 수 있는 형식으로 싣는다', () => {
    expect(encodeSessionPlan(VK_INTERVALS)).toBe('b=b&m=70&p=1*3@4.5@600|6*15@5@300;25@5@180')
  })

  it('왕복이 플랜을 보존한다', () => {
    const { plan, rejected } = decodeSessionPlan(encodeSessionPlan(VK_INTERVALS), VK_INTERVALS)
    expect(plan).toEqual(VK_INTERVALS)
    expect(rejected).toEqual([])
  })

  it('손으로 고친 링크도 읽는다', () => {
    const { plan } = decodeSessionPlan('p=3*20@6@240', VK_INTERVALS)
    expect(plan.blocks).toEqual([
      { repeat: 3, steps: [{ gradePercent: 20, speedKmh: 6, durationSec: 240 }] },
    ])
  })

  it('망가진 플랜은 통째로 버린다 — 반쯤 파싱된 세션은 기본값보다 나쁘다', () => {
    const { plan, rejected } = decodeSessionPlan('p=6*15@5@300;99@5@180', VK_INTERVALS)
    expect(plan).toEqual(VK_INTERVALS)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.key).toBe('p')
    expect(rejected[0]?.reason).toContain('경사')
  })

  it('형식 오류도 거부한다', () => {
    for (const bad of ['p=6', 'p=6*', 'p=x*15@5@300', 'p=6*15@5', 'p=6*15@5@300@9']) {
      expect(decodeSessionPlan(bad, VK_INTERVALS).rejected).toHaveLength(1)
    }
  })

  it('플랜이 없으면 폴백을 쓰되 체중·기준은 링크를 따른다', () => {
    const { plan, rejected } = decodeSessionPlan('m=58&b=h', VK_INTERVALS)
    expect(plan.blocks).toEqual(VK_INTERVALS.blocks)
    expect(plan.massKg).toBe(58)
    expect(plan.speedBasis).toBe('horizontal')
    expect(rejected).toEqual([])
  })
})
