import type { SpeedBasis } from '@vk10k/core'
import { GRADE_MAX, GRADE_MIN } from '@vk10k/core'
import { num } from '../format.js'

export interface ControlState {
  grade: number
  speed: number
  basis: SpeedBasis
  mass: number
  target: number
}

interface Props {
  value: ControlState
  onChange: (patch: Partial<ControlState>) => void
}

const GRADE_PRESETS = [
  { value: 15, label: '15 · 일반 트레드밀' },
  { value: 20, label: '20 · VK 평균' },
  { value: 30, label: '30 · Woodway' },
]

const TARGET_PRESETS = [
  { value: 1000, label: '1,000 VK' },
  { value: 8848, label: '8,848 에베레스팅' },
  { value: 10000, label: '10,000 VK10K' },
]

function Chips({
  presets,
  current,
  onPick,
}: {
  presets: { value: number; label: string }[]
  current: number
  onPick: (v: number) => void
}) {
  return (
    <div className="chips">
      {presets.map((p) => (
        <button
          key={p.value}
          type="button"
          aria-pressed={Math.abs(p.value - current) < 0.01}
          onClick={() => onPick(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export function Controls({ value, onChange }: Props) {
  return (
    <div className="ctrls">
      <div className="ctrl">
        <label htmlFor="g">
          경사 <output id="gv">{num(value.grade, 1)} %</output>
        </label>
        <input
          type="range"
          id="g"
          min={GRADE_MIN}
          max={GRADE_MAX}
          step={0.5}
          value={value.grade}
          onChange={(e) => onChange({ grade: Number(e.target.value) })}
        />
        <Chips
          presets={GRADE_PRESETS}
          current={value.grade}
          onPick={(grade) => onChange({ grade })}
        />
      </div>

      <div className="ctrl">
        <label htmlFor="s">
          속도 <output id="sv">{num(value.speed, 1)} km/h</output>
        </label>
        <input
          type="range"
          id="s"
          min={1}
          max={16}
          step={0.1}
          value={value.speed}
          onChange={(e) => onChange({ speed: Number(e.target.value) })}
        />
        <div className="seg" role="group" aria-label="속도 해석 기준">
          <button
            type="button"
            aria-pressed={value.basis === 'belt'}
            onClick={() => onChange({ basis: 'belt' })}
          >
            벨트 거리
          </button>
          <button
            type="button"
            aria-pressed={value.basis === 'horizontal'}
            onClick={() => onChange({ basis: 'horizontal' })}
          >
            수평 거리
          </button>
        </div>
      </div>

      <div className="ctrl">
        <label htmlFor="w">
          체중 <output id="wv">{value.mass} kg</output>
        </label>
        <input
          type="range"
          id="w"
          min={40}
          max={120}
          step={1}
          value={value.mass}
          onChange={(e) => onChange({ mass: Number(e.target.value) })}
        />
      </div>

      <div className="ctrl">
        <label htmlFor="t">
          목표 상승 <output id="tv">{num(value.target, 0)} m</output>
        </label>
        <input
          type="range"
          id="t"
          min={100}
          max={10000}
          step={100}
          value={value.target}
          onChange={(e) => onChange({ target: Number(e.target.value) })}
        />
        <Chips
          presets={TARGET_PRESETS}
          current={value.target}
          onPick={(target) => onChange({ target })}
        />
      </div>
    </div>
  )
}
