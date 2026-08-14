import {
  decodeAscentParams,
  encodeAscentParams,
  type AscentParams,
  type RejectedParam,
} from '@vk10k/core'
import { useCallback, useEffect, useState } from 'react'

/**
 * 입력을 URL과 동기화한다. 링크 하나로 계산 결과가 재현되게 하는 게 목적이다.
 *
 * `replaceState`를 쓴다 — 슬라이더를 한 번 끌면 입력 이벤트가 수십 번 나는데
 * `pushState`면 히스토리가 그만큼 쌓여 뒤로가기가 못 쓰게 된다.
 */
export function useShareableParams(defaults: AscentParams) {
  const [initial] = useState(() => decodeAscentParams(window.location.search, defaults))
  const [params, setParams] = useState<AscentParams>(initial.params)

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?${encodeAscentParams(params)}`)
  }, [params])

  const patch = useCallback((next: Partial<AscentParams>) => {
    setParams((prev) => ({ ...prev, ...next }))
  }, [])

  return {
    params,
    patch,
    /** 링크에 실려 왔지만 못 쓴 값들. 사용자가 입력을 건드리면 의미를 잃는다. */
    rejected: params === initial.params ? initial.rejected : ([] as RejectedParam[]),
  }
}
