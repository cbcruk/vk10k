import type { AscentParams } from '@vk10k/core'
import { GRADE_MAX, GRADE_MIN } from '@vk10k/core'
import { num } from '../format.js'

interface Props {
  value: AscentParams
  onChange: (patch: Partial<AscentParams>) => void
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
          경사 <output id="gv">{num(value.gradePercent, 1)} %</output>
        </label>
        <input
          type="range"
          id="g"
          min={GRADE_MIN}
          max={GRADE_MAX}
          step={0.5}
          value={value.gradePercent}
          onChange={(e) => onChange({ gradePercent: Number(e.target.value) })}
        />
        <Chips
          presets={GRADE_PRESETS}
          current={value.gradePercent}
          onPick={(gradePercent) => onChange({ gradePercent })}
        />
      </div>

      <div className="ctrl">
        <label htmlFor="s">
          속도 <output id="sv">{num(value.speedKmh, 1)} km/h</output>
        </label>
        <input
          type="range"
          id="s"
          min={1}
          max={16}
          step={0.1}
          value={value.speedKmh}
          onChange={(e) => onChange({ speedKmh: Number(e.target.value) })}
        />
        <div className="seg" role="group" aria-label="속도 해석 기준">
          <button
            type="button"
            aria-pressed={value.speedBasis === 'belt'}
            onClick={() => onChange({ speedBasis: 'belt' })}
          >
            벨트 거리
          </button>
          <button
            type="button"
            aria-pressed={value.speedBasis === 'horizontal'}
            onClick={() => onChange({ speedBasis: 'horizontal' })}
          >
            수평 거리
          </button>
        </div>
      </div>

      <div className="ctrl">
        <label htmlFor="w">
          체중 <output id="wv">{value.massKg} kg</output>
        </label>
        <input
          type="range"
          id="w"
          min={40}
          max={120}
          step={1}
          value={value.massKg}
          onChange={(e) => onChange({ massKg: Number(e.target.value) })}
        />
      </div>

      <div className="ctrl">
        <label htmlFor="t">
          목표 상승 <output id="tv">{num(value.targetGainM, 0)} m</output>
        </label>
        <input
          type="range"
          id="t"
          min={100}
          max={10000}
          step={100}
          value={value.targetGainM}
          onChange={(e) => onChange({ targetGainM: Number(e.target.value) })}
        />
        <Chips
          presets={TARGET_PRESETS}
          current={value.targetGainM}
          onPick={(targetGainM) => onChange({ targetGainM })}
        />
      </div>
    </div>
  )
}
