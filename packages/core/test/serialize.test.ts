import { describe, expect, it } from 'vitest'
import {
  decodeAscentParams,
  encodeAscentParams,
  type AscentParams,
} from '../src/index.js'

const DEFAULTS: AscentParams = {
  gradePercent: 20,
  speedKmh: 5,
  speedBasis: 'belt',
  massKg: 70,
  targetGainM: 1000,
}

describe('인코딩', () => {
  it('다섯 개 입력이 전부 실린다', () => {
    expect(encodeAscentParams(DEFAULTS)).toBe('g=20&v=5&b=b&m=70&h=1000')
  })

  it('부동소수 잡음을 URL에 흘리지 않는다', () => {
    expect(encodeAscentParams({ ...DEFAULTS, gradePercent: 0.1 + 0.2 + 19.7 })).toContain('g=20')
  })

  it('horizontal은 h로 줄인다', () => {
    expect(encodeAscentParams({ ...DEFAULTS, speedBasis: 'horizontal' })).toContain('b=h')
  })
})

describe('왕복', () => {
  it('인코딩 → 디코딩이 입력을 보존한다', () => {
    for (const params of [
      DEFAULTS,
      { gradePercent: 30, speedKmh: 7.5, speedBasis: 'horizontal', massKg: 58, targetGainM: 8848 },
      { gradePercent: 1, speedKmh: 0.1, speedBasis: 'belt', massKg: 250, targetGainM: 100000 },
    ] satisfies AscentParams[]) {
      const { params: back, rejected } = decodeAscentParams(encodeAscentParams(params), DEFAULTS)
      expect(back).toEqual(params)
      expect(rejected).toEqual([])
    }
  })

  it('location.search처럼 ?가 붙어 있어도 읽는다', () => {
    const { params } = decodeAscentParams('?g=30&v=6', DEFAULTS)
    expect(params.gradePercent).toBe(30)
    expect(params.speedKmh).toBe(6)
  })
})

describe('디코딩 — 없는 값', () => {
  it('빈 쿼리는 전부 폴백이고 아무것도 거부하지 않는다', () => {
    const { params, rejected } = decodeAscentParams('', DEFAULTS)
    expect(params).toEqual(DEFAULTS)
    expect(rejected).toEqual([])
  })

  it('일부만 실린 링크는 오류가 아니다', () => {
    const { params, rejected } = decodeAscentParams('g=35', DEFAULTS)
    expect(params).toEqual({ ...DEFAULTS, gradePercent: 35 })
    expect(rejected).toEqual([])
  })
})

describe('디코딩 — 망가진 값', () => {
  it('도메인 밖 값은 클램프하지 않고 폴백으로 되돌린 뒤 보고한다', () => {
    const { params, rejected } = decodeAscentParams('g=90', DEFAULTS)
    expect(params.gradePercent).toBe(20)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.key).toBe('g')
    expect(rejected[0]?.value).toBe('90')
    expect(rejected[0]?.reason).toContain('45')
  })

  it('경사 0도 막힌다 (VAM 0 → t = ∞)', () => {
    const { params, rejected } = decodeAscentParams('g=0', DEFAULTS)
    expect(params.gradePercent).toBe(20)
    expect(rejected.map((r) => r.key)).toEqual(['g'])
  })

  it('숫자가 아니면 거부한다', () => {
    const { rejected } = decodeAscentParams('v=fast', DEFAULTS)
    expect(rejected[0]).toMatchObject({ key: 'v', value: 'fast', reason: '숫자가 아님' })
  })

  it('알 수 없는 basis 코드는 거부한다', () => {
    const { params, rejected } = decodeAscentParams('b=treadmill', DEFAULTS)
    expect(params.speedBasis).toBe('belt')
    expect(rejected.map((r) => r.key)).toEqual(['b'])
  })

  it('풀네임 basis도 받아준다 (손으로 고친 링크)', () => {
    const { params, rejected } = decodeAscentParams('b=horizontal', DEFAULTS)
    expect(params.speedBasis).toBe('horizontal')
    expect(rejected).toEqual([])
  })

  it('망가진 필드만 버리고 나머지는 살린다', () => {
    const { params, rejected } = decodeAscentParams('g=999&v=6&m=abc&h=2000', DEFAULTS)
    expect(params).toEqual({
      gradePercent: 20, // 거부 → 폴백
      speedKmh: 6,
      speedBasis: 'belt',
      massKg: 70, // 거부 → 폴백
      targetGainM: 2000,
    })
    expect(rejected.map((r) => r.key).sort()).toEqual(['g', 'm'])
  })

  it('모르는 키는 무시한다', () => {
    const { params, rejected } = decodeAscentParams('g=25&utm_source=chat', DEFAULTS)
    expect(params.gradePercent).toBe(25)
    expect(rejected).toEqual([])
  })
})
