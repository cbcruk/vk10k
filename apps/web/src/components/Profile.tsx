import type { AscentResult } from '@vk10k/core'
import { num } from '../format.js'

const X0 = 70
const Y0 = 285
const W = 590
const RISE_MAX = 238
const ARC_R = 42

interface Props {
  result: AscentResult
  targetGainM: number
  /** 0~1 */
  progress: number
}

/**
 * 단면도. 경사각은 실제 atan(G)를 그대로 그린다 —
 * 세로 상한(238px)에 걸리면 그때만 압축된다(45%까지는 걸리지 않는다).
 */
export function Profile({ result, targetGainM, progress }: Props) {
  const grade = Math.tan((result.angleDeg * Math.PI) / 180)
  const rise = Math.min(W * grade, RISE_MAX)
  const x1 = X0 + W
  const y1 = Y0 - rise
  const th = (result.angleDeg * Math.PI) / 180

  const arcEndX = X0 + ARC_R * Math.cos(th)
  const arcEndY = Y0 - ARC_R * Math.sin(th)

  return (
    <svg viewBox="0 0 700 330" role="img" aria-label={`경사 단면도 ${num(result.angleDeg, 1)}도`}>
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
        x={X0 + ARC_R + 8}
        y={Y0 - 6}
        fontFamily="ui-monospace,monospace"
        fontSize={12}
        fill="#4C5C52"
      >
        {num(result.angleDeg, 1)}°
      </text>

      <circle
        cx={X0 + W * progress}
        cy={Y0 - rise * progress}
        r={6.5}
        fill="#D19A12"
        stroke="#15211B"
        strokeWidth={1.5}
      />

      <text
        x={X0 + W / 2}
        y={Y0 + 20}
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize={11.5}
        fill="#4C5C52"
      >
        수평 {num(result.horizontalKm, 2)} km
      </text>
      <text
        x={x1 - 10}
        y={Y0 - rise / 2}
        textAnchor="end"
        fontFamily="ui-monospace,monospace"
        fontSize={11.5}
        fill="#4C5C52"
      >
        ↑ {num(targetGainM, 0)} m
      </text>
      <text
        x={X0 + W * 0.52}
        y={Y0 - rise * 0.52 - 12}
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize={11.5}
        fill="#0E6B75"
      >
        벨트 {num(result.beltKm, 2)} km
      </text>
    </svg>
  )
}
