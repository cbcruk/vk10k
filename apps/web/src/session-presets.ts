import type { SessionBlock, SessionStep } from '@vk10k/core'

export interface SessionPreset {
  id: string
  label: string
  /** 무엇을 훈련하는 세션인지 한 줄. 결과값이 아니라 구조를 적는다 —
   *  상승고도는 속도 해석 기준에 따라 달라져서 숫자를 박아두면 어긋난다. */
  summary: string
  blocks: SessionBlock[]
}

function step(gradePercent: number, speedKmh: number, minutes: number): SessionStep {
  return { gradePercent, speedKmh, durationSec: minutes * 60 }
}

/**
 * 경사·속도 퀵버튼이 6/9/12뿐인 트레드밀을 전제로 짠 두 세션.
 *
 * 그 밖의 값은 +/- 로 눌러 맞춰야 하니 아홉 칸(경사 3 × 속도 3) 안에서만 짰다.
 * 두 모드가 필요한 건 하나로 합쳐지지 않기 때문이다 — 인터벌은 심폐(뛰기),
 * 지구력은 등반 특이성(걷기)이다. 같은 VAM을 내도 쓰는 근육이 다르다.
 *
 * 참고로 12%는 보행식·주행식 교차점 G = 1/9 ≈ 11.1% 바로 위라 두 식의 간극이
 * 2.4%뿐이다. 6 km/h 구간이 `GAIT_BOUNDARY` 경고를 부르지만, 하필 12%에서는
 * 걷든 뛰든 추정이 거의 같다. 같은 간극이 6%에서는 16%로 벌어진다.
 */
export const SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'interval',
    label: '인터벌',
    summary: '12% · 9 km/h 2분을 6회. 회복은 9% · 6 km/h — 심폐 위주.',
    blocks: [
      { repeat: 1, steps: [step(6, 6, 6), step(9, 6, 4)] },
      // 회복을 12%로 두면 MET 10.0이라 쉬는 구간이 되지 않는다. 9%는 MET 8.5로
      // 워크 구간의 60%면서 VAM 538 — 회복하면서도 계속 오른다.
      { repeat: 6, steps: [step(12, 9, 2), step(9, 6, 3)] },
      { repeat: 1, steps: [step(6, 6, 5)] },
    ],
  },
  {
    id: 'endurance',
    label: '지구력',
    summary: '12% · 6 km/h 6분을 4회. 속도를 6에 고정해 경사만 토글 — 등반 위주.',
    blocks: [
      { repeat: 1, steps: [step(6, 6, 5)] },
      // 속도가 고정이라 큐마다 버튼 하나만 누른다. 인클라인 모터가 12%↔6%를
      // 오가는 데 10~20초 걸리니 전환 횟수가 적은 편이 실제로 유리하다.
      { repeat: 4, steps: [step(12, 6, 6), step(6, 6, 2)] },
      { repeat: 1, steps: [step(6, 6, 5)] },
    ],
  },
]
