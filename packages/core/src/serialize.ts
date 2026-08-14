/**
 * 입력의 URL 직렬화.
 *
 * 계산기 링크 하나로 재현 가능하게 만드는 게 목적이다. 그래서 디코딩은
 * 방어적이다 — URL은 잘리고 손으로 고쳐지고 채팅앱을 거치며 망가진다.
 * 도메인 밖 값은 조용히 클램프하지 않는다. 클램프는 "45%로 보정했다"는
 * 사실을 감춘 채 다른 계산 결과를 보여주는 짓이다. 대신 그 필드만
 * 폴백으로 되돌리고 무엇을 왜 버렸는지 `rejected[]`로 같이 내보낸다.
 */

import type { AscentParams } from './ascent.js'
import type { SpeedBasis } from './geometry.js'
import { DomainError, kg, kmh, meters, percent } from './units.js'

export interface RejectedParam {
  /** 쿼리스트링 키 (`g` / `v` / `b` / `m` / `h`). */
  key: string
  /** 들어온 원본 문자열. */
  value: string
  reason: string
}

export interface DecodeResult {
  params: AscentParams
  /** 비어 있지 않으면 URL 일부가 무시됐다는 뜻. UI가 알려야 한다. */
  rejected: RejectedParam[]
}

/** 짧게 유지한다. 링크가 채팅에서 줄바꿈되면 잘려 들어온다. */
export const PARAM_KEYS = {
  gradePercent: 'g',
  speedKmh: 'v',
  speedBasis: 'b',
  massKg: 'm',
  targetGainM: 'h',
} as const

const BASIS_CODE: Record<SpeedBasis, string> = { belt: 'b', horizontal: 'h' }
const BASIS_FROM_CODE: Record<string, SpeedBasis> = { b: 'belt', h: 'horizontal' }

/** 부동소수 잡음(20.000000000000004)이 URL에 실리지 않게 자른다. */
function trim(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}

export function encodeAscentParams(params: AscentParams): string {
  return [
    `${PARAM_KEYS.gradePercent}=${trim(params.gradePercent)}`,
    `${PARAM_KEYS.speedKmh}=${trim(params.speedKmh)}`,
    `${PARAM_KEYS.speedBasis}=${BASIS_CODE[params.speedBasis]}`,
    `${PARAM_KEYS.massKg}=${trim(params.massKg)}`,
    `${PARAM_KEYS.targetGainM}=${trim(params.targetGainM)}`,
  ].join('&')
}

/**
 * 쿼리스트링을 직접 읽는다. `URLSearchParams`를 쓰면 코어에 DOM 타입을
 * 끌어와야 하는데, 그건 순수 계산 패키지에 `window`를 열어주는 값이 너무 크다.
 * 실을 게 스칼라 5개뿐이라 이걸로 충분하다. 키가 중복되면 첫 값을 쓴다.
 */
function parseQuery(query: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const pair of (query.startsWith('?') ? query.slice(1) : query).split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq))
    if (out.has(key)) continue
    out.set(key, eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1)))
  }
  return out
}

function readNumber(
  q: Map<string, string>,
  key: string,
  guard: (value: number) => unknown,
  fallback: number,
  rejected: RejectedParam[],
): number {
  const raw = q.get(key)
  if (raw === undefined || raw === '') return fallback

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    rejected.push({ key, value: raw, reason: '숫자가 아님' })
    return fallback
  }

  try {
    guard(value)
    return value
  } catch (error) {
    rejected.push({
      key,
      value: raw,
      reason: error instanceof DomainError ? error.expectation : '도메인 밖',
    })
    return fallback
  }
}

/**
 * `query`는 `?`가 붙어 있어도 없어도 된다(`location.search`를 그대로 넘길 수 있게).
 * 없는 키는 조용히 폴백을 쓴다 — 링크에 일부만 실린 건 오류가 아니다.
 * 있는데 못 쓰는 값만 `rejected[]`에 남는다.
 */
export function decodeAscentParams(query: string, fallback: AscentParams): DecodeResult {
  const q = parseQuery(query)
  const rejected: RejectedParam[] = []

  const rawBasis = q.get(PARAM_KEYS.speedBasis)
  let speedBasis = fallback.speedBasis
  if (rawBasis !== undefined && rawBasis !== '') {
    const decoded = BASIS_FROM_CODE[rawBasis] ?? (rawBasis === 'belt' || rawBasis === 'horizontal' ? rawBasis : undefined)
    if (decoded) {
      speedBasis = decoded
    } else {
      rejected.push({ key: PARAM_KEYS.speedBasis, value: rawBasis, reason: "'b' 또는 'h'만 허용" })
    }
  }

  return {
    params: {
      gradePercent: readNumber(q, PARAM_KEYS.gradePercent, percent, fallback.gradePercent, rejected),
      speedKmh: readNumber(q, PARAM_KEYS.speedKmh, kmh, fallback.speedKmh, rejected),
      speedBasis,
      massKg: readNumber(q, PARAM_KEYS.massKg, kg, fallback.massKg, rejected),
      targetGainM: readNumber(q, PARAM_KEYS.targetGainM, meters, fallback.targetGainM, rejected),
    },
    rejected,
  }
}
