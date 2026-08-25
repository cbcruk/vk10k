import { ACSM_GRADE_LIMIT, GAIT_SWITCH_KMH, GRADE_MAX, GRADE_MIN } from '@vk10k/core'

/** 속도 슬라이더 도메인. 코어에는 상한이 없어 UI가 정한다. */
export const SPEED_MIN = 1
export const SPEED_MAX = 16

function ratio(value: number, min: number, max: number): number {
  return (value - min) / (max - min)
}

/** 슬라이더 위 눈금 위치. 도메인 상수에서 뽑아 값이 바뀌면 눈금도 따라간다. */
export const ACSM_LIMIT_RATIO: number = ratio(ACSM_GRADE_LIMIT, GRADE_MIN, GRADE_MAX)
export const GAIT_SWITCH_RATIO: number = ratio(GAIT_SWITCH_KMH, SPEED_MIN, SPEED_MAX)
