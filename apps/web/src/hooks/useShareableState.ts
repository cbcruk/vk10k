import {
  decodeAscentParams,
  decodeSessionPlan,
  encodeAscentParams,
  encodeSessionPlan,
  type AscentParams,
  type RejectedParam,
  type SessionPlan,
} from '@vk10k/core'
import { useCallback, useEffect, useState } from 'react'

export type Tab = 'calculator' | 'session'

const TAB_KEY = 't'
const TAB_CODE: Record<Tab, string> = { calculator: 'c', session: 's' }

interface Defaults {
  params: AscentParams
  plan: SessionPlan
}

/**
 * 탭·계산기 입력·세션 플랜을 URL과 동기화한다. 링크 하나로 화면이 재현되는 게
 * 목적이므로 탭도 실린다 — 세션을 짜서 보냈는데 상대가 계산기를 보면 곤란하다.
 *
 * `replaceState`를 쓴다. 슬라이더 한 번 끌면 입력 이벤트가 수십 번 나는데
 * `pushState`면 히스토리가 그만큼 쌓여 뒤로가기가 못 쓰게 된다.
 */
export function useShareableState(defaults: Defaults) {
  const [initial] = useState(() => {
    const search = window.location.search
    const decodedParams = decodeAscentParams(search, defaults.params)
    const decodedPlan = decodeSessionPlan(search, defaults.plan)
    const rawTab = new Map(
      search
        .replace(/^\?/, '')
        .split('&')
        .map((p) => p.split('=') as [string, string]),
    ).get(TAB_KEY)

    return {
      tab: (rawTab === TAB_CODE.session ? 'session' : 'calculator') as Tab,
      params: decodedParams.params,
      plan: decodedPlan.plan,
      // 세션 플랜 거부는 세션 탭에서만 의미가 있다. 계산기 링크에는 p가 아예 없다.
      rejected: [...decodedParams.rejected, ...decodedPlan.rejected].filter(
        (r, i, all) => all.findIndex((x) => x.key === r.key) === i,
      ),
    }
  })

  const [tab, setTab] = useState<Tab>(initial.tab)
  const [params, setParams] = useState<AscentParams>(initial.params)
  const [plan, setPlan] = useState<SessionPlan>(initial.plan)

  useEffect(() => {
    const query =
      tab === 'session'
        ? `${TAB_KEY}=${TAB_CODE.session}&${encodeSessionPlan(plan)}`
        : encodeAscentParams(params)
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`)
  }, [tab, params, plan])

  const patchParams = useCallback((next: Partial<AscentParams>) => {
    setParams((prev) => ({ ...prev, ...next }))
  }, [])

  const touched = params !== initial.params || plan !== initial.plan
  return {
    tab,
    setTab,
    params,
    patchParams,
    plan,
    setPlan,
    /** 링크에 실려 왔지만 못 쓴 값들. 사용자가 입력을 건드리면 의미를 잃는다. */
    rejected: touched ? ([] as RejectedParam[]) : initial.rejected,
  }
}
