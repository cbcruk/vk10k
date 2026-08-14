/**
 * 세션 빌더 — 경사 인터벌 프로그램의 누적 계산.
 *
 * 계산기는 "목표 고도 → 얼마나 걸리나"를 푼다. 세션은 반대다.
 * 트레드밀 앞에서 실제로 정하는 건 시간이다("15% 5분"). 상승고도는 결과다.
 *
 * 구조는 한 겹만 중첩한다: 세션 = 블록의 나열, 블록 = 스텝의 나열 × 반복.
 * 워밍업은 반복 1회짜리 블록, 인터벌은 반복 N회짜리 블록으로 표현된다.
 * 두 겹 이상은 실제 트레드밀 세션에서 쓸 일이 없고 UI만 복잡해진다.
 */

import { computeRates, type SpeedBasis } from './geometry.js'
import { computeMetabolic, type Gait, type Warning, type WarningCode } from './metabolic.js'
import { computeMinetti } from './minetti.js'
import { computePower } from './power.js'
import { DomainError, kg, kmh, percent, type Kg } from './units.js'

/** 구간 하나. 시간이 입력이고 상승고도가 결과다. */
export interface SessionStep {
  gradePercent: number
  speedKmh: number
  durationSec: number
}

export interface SessionBlock {
  /** 이 블록을 몇 번 도는지. 워밍업이면 1. */
  repeat: number
  steps: SessionStep[]
}

export interface SessionPlan {
  speedBasis: SpeedBasis
  massKg: number
  blocks: SessionBlock[]
}

export interface SessionStepResult {
  blockIndex: number
  /** 1-based. 몇 번째 바퀴에서 나온 스텝인지. */
  repetition: number
  step: SessionStep
  durationSec: number
  gainM: number
  beltKm: number
  horizontalKm: number
  vamMh: number
  met: number
  kcal: number
  /** Minetti 실측 기준선으로 다시 푼 열량. */
  minettiKcal: number
  gait: Gait
}

export interface SessionTotals {
  durationSec: number
  gainM: number
  beltKm: number
  horizontalKm: number
  kcal: number
  minettiKcal: number
  /** 세션 전체 평균 상승률. 쉬는 구간이 있으면 순간 VAM보다 낮게 나온다. */
  averageVamMh: number
  /** 시간가중 평균 MET. 단순 평균이 아니다 — 짧은 고강도 구간이 과대반영된다. */
  averageMet: number
  peakGradePercent: number
  stepCount: number
}

export interface SessionResult {
  steps: SessionStepResult[]
  totals: SessionTotals
  /** 스텝별 경고를 코드 단위로 합친 것. 어느 스텝이 유발했는지는 `sources`에. */
  warnings: SessionWarning[]
}

export interface SessionWarning extends Warning {
  /** 이 경고를 낸 스텝의 전개 순번(0-based). */
  sources: number[]
}

/** 구간 길이 도메인. 1초 미만은 입력 실수, 24시간 초과는 세션이 아니다. */
export const STEP_SEC_MIN = 1
export const STEP_SEC_MAX = 86_400

function guardDuration(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec < STEP_SEC_MIN || durationSec > STEP_SEC_MAX) {
    throw new DomainError('durationSec', durationSec, `expected ${STEP_SEC_MIN}~${STEP_SEC_MAX} s`)
  }
  return durationSec
}

function guardRepeat(repeat: number): number {
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 999) {
    throw new DomainError('repeat', repeat, 'expected integer 1~999')
  }
  return repeat
}

function computeStep(
  step: SessionStep,
  basis: SpeedBasis,
  massKg: Kg,
  blockIndex: number,
  repetition: number,
): { result: SessionStepResult; warnings: Warning[]; vo2: number } {
  const gradePercent = percent(step.gradePercent)
  const speedKmh = kmh(step.speedKmh)
  const durationSec = guardDuration(step.durationSec)

  const rates = computeRates(gradePercent, speedKmh, basis)
  const hours = durationSec / 3600
  const met = computeMetabolic(gradePercent, rates.grade, rates.beltSpeedKmh, massKg, durationSec)
  const minetti = computeMinetti(rates.grade, rates.beltSpeedKmh, massKg, durationSec, met.gait)

  return {
    vo2: met.vo2,
    warnings: met.warnings,
    result: {
      blockIndex,
      repetition,
      step,
      durationSec,
      gainM: rates.vamMh * hours,
      beltKm: rates.beltSpeedKmh * hours,
      horizontalKm: rates.horizontalSpeedKmh * hours,
      vamMh: rates.vamMh,
      met: met.met,
      kcal: met.kcal,
      minettiKcal: minetti.kcal,
      gait: met.gait,
    },
  }
}

export function computeSession(plan: SessionPlan): SessionResult {
  const massKg = kg(plan.massKg)
  const steps: SessionStepResult[] = []
  const byCode = new Map<WarningCode, SessionWarning>()

  for (const [blockIndex, block] of plan.blocks.entries()) {
    const repeat = guardRepeat(block.repeat)
    for (let repetition = 1; repetition <= repeat; repetition++) {
      for (const step of block.steps) {
        const { result, warnings } = computeStep(step, plan.speedBasis, massKg, blockIndex, repetition)
        const index = steps.length
        steps.push(result)

        for (const warning of warnings) {
          const existing = byCode.get(warning.code)
          if (existing) existing.sources.push(index)
          else byCode.set(warning.code, { ...warning, sources: [index] })
        }
      }
    }
  }

  const totals = steps.reduce<SessionTotals>(
    (acc, s) => ({
      durationSec: acc.durationSec + s.durationSec,
      gainM: acc.gainM + s.gainM,
      beltKm: acc.beltKm + s.beltKm,
      horizontalKm: acc.horizontalKm + s.horizontalKm,
      kcal: acc.kcal + s.kcal,
      minettiKcal: acc.minettiKcal + s.minettiKcal,
      averageVamMh: 0,
      // 시간가중. 여기선 누적만 하고 아래에서 총시간으로 나눈다.
      averageMet: acc.averageMet + s.met * s.durationSec,
      peakGradePercent: Math.max(acc.peakGradePercent, s.step.gradePercent),
      stepCount: acc.stepCount + 1,
    }),
    {
      durationSec: 0,
      gainM: 0,
      beltKm: 0,
      horizontalKm: 0,
      kcal: 0,
      minettiKcal: 0,
      averageVamMh: 0,
      averageMet: 0,
      peakGradePercent: 0,
      stepCount: 0,
    },
  )

  totals.averageVamMh = totals.durationSec > 0 ? totals.gainM / (totals.durationSec / 3600) : 0
  totals.averageMet = totals.durationSec > 0 ? totals.averageMet / totals.durationSec : 0

  // 경고 순서를 스텝 등장 순서로 맞춘다. Map 삽입 순서가 곧 그 순서다.
  return { steps, totals, warnings: [...byCode.values()] }
}

export interface GainSolution {
  /** 목표를 넘기는 데 필요한 최소 반복 횟수. */
  repeat: number
  /** 소수점 그대로의 해. 반올림 전 값이라 "6.2바퀴"가 보인다. */
  exactRepeat: number
  /** 그 반복수로 실제로 쌓이는 고도. 목표를 조금 넘는다. */
  gainM: number
  durationSec: number
  /** 반복해도 목표에 닿지 못하면(해당 블록의 상승이 0) false. */
  reachable: boolean
}

/**
 * VK 목표 역산 — 지정한 블록을 몇 바퀴 돌아야 목표 고도에 닿는지.
 *
 * 상승고도는 반복 횟수에 선형이라 이분탐색이 필요 없다. 다른 블록이 쌓는
 * 고도를 먼저 빼고, 남은 몫을 한 바퀴 상승으로 나눈 뒤 올린다.
 */
export function solveRepeatsForGain(
  plan: SessionPlan,
  blockIndex: number,
  targetGainM: number,
): GainSolution {
  const block = plan.blocks[blockIndex]
  if (!block) throw new DomainError('blockIndex', blockIndex, 'block not found')

  const perRepeat = computeSession({
    ...plan,
    blocks: [{ repeat: 1, steps: block.steps }],
  }).totals

  const others = computeSession({
    ...plan,
    blocks: plan.blocks.filter((_, i) => i !== blockIndex),
  }).totals

  if (perRepeat.gainM <= 0) {
    return { repeat: block.repeat, exactRepeat: 0, gainM: others.gainM, durationSec: others.durationSec, reachable: false }
  }

  const exactRepeat = Math.max(0, (targetGainM - others.gainM) / perRepeat.gainM)
  const repeat = Math.max(1, Math.ceil(exactRepeat))

  return {
    repeat,
    exactRepeat,
    gainM: others.gainM + perRepeat.gainM * repeat,
    durationSec: others.durationSec + perRepeat.durationSec * repeat,
    reachable: true,
  }
}
