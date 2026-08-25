import type { AscentResult } from '@vk10k/core'
import { useEffect, useState } from 'react'
import { num } from '../format.js'

interface Frame {
  vbW: number
  vbH: number
  X0: number
  Y0: number
  W: number
  ARC_R: number
  /** 라벨 크기. 나머지 라벨 간격은 전부 이 값의 배수다. */
  fs: number
  dot: number
}

/** 세로 상한 비율. 이 기울기(≈40%)를 넘는 경사부터 그림이 압축된다. */
const RISE_RATIO = 238 / 590

const WIDE: Frame = { vbW: 700, vbH: 330, X0: 70, Y0: 285, W: 590, ARC_R: 42, fs: 11.5, dot: 6.5 }

/**
 * 좁은 화면 전용 좌표계. 700폭 viewBox를 354px에 그리면 11.5 단위 라벨이 6px로
 * 찍혀 읽히지 않는다 — viewBox를 렌더 폭에 맞춰 1단위 = 1px로 만든다.
 * 세로 상한은 비율로 잡아 압축이 시작되는 경사가 넓은 화면과 같다.
 */
const NARROW: Frame = { vbW: 354, vbH: 172, X0: 14, Y0: 146, W: 326, ARC_R: 26, fs: 10, dot: 5.5 }

const NARROW_QUERY = '(max-width: 680px)'

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY)
    const sync = (): void => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrow
}

interface Props {
  result: AscentResult
  targetGainM: number
  /** 0~1 */
  progress: number
}

/**
 * 단면도. 경사각은 실제 atan(G)를 그대로 그린다 —
 * 세로 상한에 걸리면 그때만 압축된다.
 */
export function Profile({ result, targetGainM, progress }: Props) {
  const f = useNarrow() ? NARROW : WIDE
  const { X0, Y0, W, ARC_R, fs } = f

  const grade = Math.tan((result.angleDeg * Math.PI) / 180)
  const rise = Math.min(W * grade, W * RISE_RATIO)
  const x1 = X0 + W
  const y1 = Y0 - rise
  const th = (result.angleDeg * Math.PI) / 180

  const arcEndX = X0 + ARC_R * Math.cos(th)
  const arcEndY = Y0 - ARC_R * Math.sin(th)

  return (
    <svg
      viewBox={`0 0 ${f.vbW} ${f.vbH}`}
      role="img"
      aria-label={`경사 단면도 ${num(result.angleDeg, 1)}도`}
    >
      <g>
        {[1, 2, 3, 4].map((i) => {
          const yy = Y0 - (rise * i) / 4
          return (
            <line
              key={i}
              x1={X0}
              y1={yy}
              x2={x1}
              y2={yy}
              stroke="#BAC5B4"
              strokeWidth={1}
              strokeDasharray="2 5"
            />
          )
        })}
      </g>

      <path d={`M${X0} ${Y0}L${x1} ${y1}L${x1} ${Y0}Z`} fill="rgba(14,107,117,.10)" />
      <line x1={X0} y1={Y0} x2={x1} y2={Y0} stroke="#15211B" strokeWidth={1.5} />
      <line x1={x1} y1={y1} x2={x1} y2={Y0} stroke="#4C5C52" strokeWidth={1} strokeDasharray="3 3" />
      <path
        d={`M${X0} ${Y0}L${x1} ${y1}`}
        fill="none"
        stroke="#0E6B75"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d={`M${X0 + ARC_R} ${Y0}A${ARC_R} ${ARC_R} 0 0 1 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="#4C5C52"
        strokeWidth={1}
      />

      <text
        x={X0 + ARC_R + fs * 0.7}
        y={Y0 - fs * 0.5}
        fontFamily="ui-monospace,monospace"
        fontSize={fs}
        fill="#4C5C52"
      >
        {num(result.angleDeg, 1)}°
      </text>

      <circle
        cx={X0 + W * progress}
        cy={Y0 - rise * progress}
        r={f.dot}
        fill="#D19A12"
        stroke="#15211B"
        strokeWidth={1.5}
      />

      <text
        x={X0 + W / 2}
        y={Y0 + fs * 1.75}
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize={fs}
        fill="#4C5C52"
      >
        수평 {num(result.horizontalKm, 2)} km
      </text>
      <text
        x={x1 - fs * 0.87}
        y={Y0 - rise / 2}
        textAnchor="end"
        fontFamily="ui-monospace,monospace"
        fontSize={fs}
        fill="#4C5C52"
      >
        ↑ {num(targetGainM, 0)} m
      </text>
      <text
        x={X0 + W * 0.52}
        y={Y0 - rise * 0.52 - fs * 1.05}
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize={fs}
        fill="#0E6B75"
      >
        벨트 {num(result.beltKm, 2)} km
      </text>
    </svg>
  )
}
