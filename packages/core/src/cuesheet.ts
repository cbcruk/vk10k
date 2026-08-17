/**
 * 큐시트 — 세션을 "트레드밀 앞에서 읽는 순서"로 뒤집는다.
 *
 * 구간 전개표(`SessionResult.steps`)는 구간 중심이다: "이 구간 3분". 그런데
 * 트레드밀 계기판에 찍히는 건 경과 시간 하나뿐이고, 그 앞에서 필요한 정보는
 * "지금 몇 분이니 뭘 눌러야 하나"다. 그 변환을 사람이 머리로 하지 않게 한다.
 *
 * 두 가지를 한다.
 *   1. 구간 길이를 절대 시각(T+)으로 바꾼다 — 누계는 이미 있지만 끝 시각이라
 *      바꿔야 할 시점이 아니다. 큐는 구간의 *시작*에 선다.
 *   2. 설정이 같은 연속 구간을 하나로 합친다. 손이 가는 건 값이 변할 때뿐이라
 *      합치지 않으면 "아무것도 안 하는 큐"가 섞여 오히려 놓친다.
 */

import type { SessionResult, SessionStepResult } from './session.js'

export interface CueEntry {
  /** 세션 시작 기준 경과 시각(초). 이 시각에 트레드밀을 조작한다. */
  atSec: number
  gradePercent: number
  speedKmh: number
  /** 합쳐진 뒤의 길이. 다음 큐까지 걸리는 시간이다. */
  durationSec: number
  /** 직전 큐 대비 무엇이 변했는지. 첫 큐는 둘 다 true — 처음엔 둘 다 맞춰야 한다. */
  gradeChanged: boolean
  speedChanged: boolean
  gainM: number
  /** 이 큐가 끝나는 시점의 누적 상승. */
  cumulativeGainM: number
  /** 합쳐진 전개 스텝의 순번(0-based). 구간 전개표로 되짚는 통로다. */
  stepIndices: number[]
  /** 합쳐졌으면 첫 스텝 기준. */
  blockIndex: number
  repetition: number
}

export interface CueSheet {
  entries: CueEntry[]
  /** 마지막 큐가 끝나는 시각. 세션 총 시간과 같다. */
  totalSec: number
  totalGainM: number
  /** 합치기 전 스텝 수. `entries.length`와 다르면 병합이 일어난 것이다. */
  stepCount: number
}

function sameSetting(a: SessionStepResult, b: SessionStepResult): boolean {
  return a.step.gradePercent === b.step.gradePercent && a.step.speedKmh === b.step.speedKmh
}

export function buildCueSheet(result: SessionResult): CueSheet {
  const entries: CueEntry[] = []
  let atSec = 0
  let cumulativeGainM = 0

  for (const [index, step] of result.steps.entries()) {
    const previous = entries[entries.length - 1]
    const previousStep = result.steps[index - 1]
    const merge = previous !== undefined && previousStep !== undefined && sameSetting(previousStep, step)

    cumulativeGainM += step.gainM

    if (merge && previous) {
      previous.durationSec += step.durationSec
      previous.gainM += step.gainM
      previous.cumulativeGainM = cumulativeGainM
      previous.stepIndices.push(index)
    } else {
      entries.push({
        atSec,
        gradePercent: step.step.gradePercent,
        speedKmh: step.step.speedKmh,
        durationSec: step.durationSec,
        gradeChanged: previous === undefined || previous.gradePercent !== step.step.gradePercent,
        speedChanged: previous === undefined || previous.speedKmh !== step.step.speedKmh,
        gainM: step.gainM,
        cumulativeGainM,
        stepIndices: [index],
        blockIndex: step.blockIndex,
        repetition: step.repetition,
      })
    }

    atSec += step.durationSec
  }

  return {
    entries,
    totalSec: atSec,
    totalGainM: cumulativeGainM,
    stepCount: result.steps.length,
  }
}
