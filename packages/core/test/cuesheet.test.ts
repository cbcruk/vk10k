import { describe, expect, it } from 'vitest'
import { buildCueSheet, computeSession, type SessionPlan } from '../src/index.js'

/** 15% 5분 / 25% 3분 × 6 — 속도가 같아 경사만 오르내리는 세션. */
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

const sheet = (plan: SessionPlan) => buildCueSheet(computeSession(plan))

describe('시각 변환', () => {
  it('큐는 구간의 시작에 선다 — 끝이 아니라', () => {
    const { entries } = sheet(VK_INTERVALS)
    expect(entries[0]?.atSec).toBe(0)
    expect(entries[1]?.atSec).toBe(600)
    expect(entries[2]?.atSec).toBe(600 + 300)
  })

  it('다음 큐 시각은 이전 큐 시각 + 길이다', () => {
    const { entries, totalSec } = sheet(VK_INTERVALS)
    for (const [i, entry] of entries.entries()) {
      const next = entries[i + 1]
      expect(next ? next.atSec : totalSec).toBe(entry.atSec + entry.durationSec)
    }
  })

  it('총 시간과 총 상승은 세션과 일치한다', () => {
    const result = computeSession(VK_INTERVALS)
    const cues = buildCueSheet(result)
    expect(cues.totalSec).toBe(result.totals.durationSec)
    expect(cues.totalGainM).toBeCloseTo(result.totals.gainM, 9)
    expect(cues.stepCount).toBe(result.totals.stepCount)
  })
})

describe('병합', () => {
  it('설정이 같은 연속 구간은 하나로 합친다', () => {
    const cues = sheet({
      speedBasis: 'belt',
      massKg: 70,
      blocks: [{ repeat: 3, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 120 }] }],
    })
    expect(cues.entries).toHaveLength(1)
    expect(cues.entries[0]?.durationSec).toBe(360)
    expect(cues.entries[0]?.stepIndices).toEqual([0, 1, 2])
    expect(cues.stepCount).toBe(3)
  })

  it('블록 경계라도 설정이 같으면 합친다 — 조작할 게 없으면 큐가 아니다', () => {
    const cues = sheet({
      speedBasis: 'belt',
      massKg: 70,
      blocks: [
        { repeat: 1, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 300 }] },
        { repeat: 1, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 180 }] },
      ],
    })
    expect(cues.entries).toHaveLength(1)
    expect(cues.entries[0]?.durationSec).toBe(480)
  })

  it('한 값만 달라도 합치지 않는다', () => {
    const cues = sheet({
      speedBasis: 'belt',
      massKg: 70,
      blocks: [
        {
          repeat: 1,
          steps: [
            { gradePercent: 20, speedKmh: 5, durationSec: 120 },
            { gradePercent: 20, speedKmh: 6, durationSec: 120 },
            { gradePercent: 25, speedKmh: 6, durationSec: 120 },
          ],
        },
      ],
    })
    expect(cues.entries).toHaveLength(3)
    expect(cues.entries[1]).toMatchObject({ gradeChanged: false, speedChanged: true })
    expect(cues.entries[2]).toMatchObject({ gradeChanged: true, speedChanged: false })
  })

  it('첫 큐는 둘 다 맞춰야 하므로 둘 다 변경으로 본다', () => {
    const { entries } = sheet(VK_INTERVALS)
    expect(entries[0]).toMatchObject({ gradeChanged: true, speedChanged: true })
  })

  it('병합돼도 누계는 스텝 전부를 반영한다', () => {
    const result = computeSession({
      speedBasis: 'belt',
      massKg: 70,
      blocks: [{ repeat: 4, steps: [{ gradePercent: 20, speedKmh: 5, durationSec: 120 }] }],
    })
    const cues = buildCueSheet(result)
    expect(cues.entries[0]?.gainM).toBeCloseTo(result.totals.gainM, 9)
    expect(cues.entries[0]?.cumulativeGainM).toBeCloseTo(result.totals.gainM, 9)
  })

  it('누적 상승은 단조증가하고 마지막이 총합이다', () => {
    const { entries, totalGainM } = sheet(VK_INTERVALS)
    for (const [i, entry] of entries.entries()) {
      if (i > 0) expect(entry.cumulativeGainM).toBeGreaterThan(entries[i - 1]!.cumulativeGainM)
    }
    expect(entries[entries.length - 1]?.cumulativeGainM).toBeCloseTo(totalGainM, 9)
  })
})

describe('되짚기', () => {
  it('스텝 순번을 빠짐없이 순서대로 담는다', () => {
    const { entries, stepCount } = sheet(VK_INTERVALS)
    expect(entries.flatMap((e) => e.stepIndices)).toEqual(
      Array.from({ length: stepCount }, (_, i) => i),
    )
  })

  it('블록·바퀴는 합쳐진 첫 스텝 기준이다', () => {
    const { entries } = sheet(VK_INTERVALS)
    expect(entries[0]).toMatchObject({ blockIndex: 0, repetition: 1 })
    expect(entries[1]).toMatchObject({ blockIndex: 1, repetition: 1 })
  })
})

describe('빈 세션', () => {
  it('큐가 없어도 계산은 성공한다', () => {
    const cues = sheet({ speedBasis: 'belt', massKg: 70, blocks: [] })
    expect(cues).toEqual({ entries: [], totalSec: 0, totalGainM: 0, stepCount: 0 })
  })
})
