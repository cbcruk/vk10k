import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 배속 시뮬레이션. 경과 시간(초)만 들고 있고, 진행률 환산은 호출부에서 한다.
 * 계산은 코어가 하고 여기는 시계만 돌린다.
 */
export function useClimb(durationSec: number) {
  const [elapsedSec, setElapsedSec] = useState(0)
  const [running, setRunning] = useState(false)
  const [rate, setRate] = useState(300)

  const raf = useRef(0)
  const last = useRef(0)
  const limit = useRef(durationSec)
  limit.current = durationSec

  useEffect(() => {
    if (!running) return

    last.current = 0
    const step = (ts: number) => {
      if (!last.current) last.current = ts
      const dt = (ts - last.current) / 1000
      last.current = ts

      setElapsedSec((prev) => {
        const next = prev + dt * rate
        if (next >= limit.current) {
          setRunning(false)
          return limit.current
        }
        return next
      })
      raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [running, rate])

  const toggle = useCallback(() => {
    setRunning((r) => {
      // 끝에 도달한 상태에서 다시 누르면 처음부터.
      if (!r && limit.current > 0 && elapsedSec >= limit.current) setElapsedSec(0)
      return !r
    })
  }, [elapsedSec])

  const reset = useCallback(() => {
    setRunning(false)
    setElapsedSec(0)
  }, [])

  return { elapsedSec, running, rate, setRate, toggle, reset }
}
