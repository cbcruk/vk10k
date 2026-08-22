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
 * 경사·속도 퀵버튼이 6/9/12뿐인 트레드밀을 전제로 짠 세 세션.
 *
 * 세 모드가 필요한 건 하나로 합쳐지지 않기 때문이다 — 인터벌은 심폐(뛰기),
 * 지구력은 등반 특이성(걷기), 템포는 상승량이다. 같은 VAM을 내도 쓰는 근육이 다르다.
 *
 * 앞의 둘은 아홉 칸(경사 3 × 속도 3) 안에 닫혀 있어 모든 조작이 한 탭이다.
 * 템포만 15%를 쓰는데, 이건 퀵버튼 밖이라 +/- 로 맞춰야 한다. 그래서 템포에서
 * 15%는 인터벌 값이 아니라 "한 번 걸어두고 버티는" 값이다 — 세션당 다이얼 2회.
 *
 * 경사가 올라갈수록 이 앱이 스스로 못 믿는 폭도 커진다. 보행식·주행식 간극은
 * 12%에서 2.4%(교차점 G = 1/9 ≈ 11.1% 바로 위라 가장 좁다), 15%에서 9.6%,
 * 20%에서 19.5%다. 15%는 `GRADE_EXTRAPOLATED`가 뜨지 않는 마지막 경사이기도
 * 하다(경고 조건이 `> 15`). 그 대가로 MET 1당 VAM은 12%보다 좋아진다 —
 * 15% · 9 km/h가 12% · 12 km/h와 거의 같은 VAM을 MET 3.2 낮게 낸다.
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
  {
    id: 'tempo',
    label: '템포',
    summary: '15% · 6 km/h 12분을 2회. 15%는 퀵버튼 밖이라 시작에 한 번 맞춰 건다 — 상승 위주.',
    blocks: [
      { repeat: 1, steps: [step(6, 6, 5), step(9, 6, 5)] },
      // 15%에 주차하고 속도만 9↔6으로 토글하면 다이얼이 한 번으로 줄지만,
      // 회복이 15% · 6 km/h = MET 11.6이라 회복이 되지 않는다. 내려올 때
      // 퀵버튼 9를 한 탭 쓰는 값이 그것보다 싸다.
      { repeat: 2, steps: [step(15, 6, 12), step(9, 6, 3)] },
      { repeat: 1, steps: [step(6, 6, 5)] },
    ],
  },
]
