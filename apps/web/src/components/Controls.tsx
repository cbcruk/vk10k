import type { AscentParams } from '@vk10k/core'
import { GRADE_MAX, GRADE_MIN } from '@vk10k/core'
import { useState } from 'react'
import { ACSM_LIMIT_RATIO, GAIT_SWITCH_RATIO, SPEED_MAX, SPEED_MIN } from '../track-marks.js'
import { BASIS_LABEL, num } from '../format.js'

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

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      className="chev"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={up ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'} />
    </svg>
  )
}

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
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 좁은 화면에서는 슬라이더 넉 줄이 결과를 화면 밖으로 밀어낸다. 값만 한 줄로
          접어두고 손댈 때만 편다 — 넓은 화면에서는 이 바가 아예 없다. */}
      <button
        type="button"
        className="inputbar"
        aria-expanded={open}
        aria-controls="ctrls"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inputbar-grid">
          <span className="ib-k">경사</span>
          <span className="ib-k">속도 · {BASIS_LABEL[value.speedBasis]}</span>
          <span className="ib-k">체중</span>
          <span className="ib-k">목표 상승</span>
          <span className="ib-v">
            {num(value.gradePercent, 1)}
            <i>%</i>
          </span>
          <span className="ib-v">
            {num(value.speedKmh, 1)}
            <i>km/h</i>
          </span>
          <span className="ib-v">
            {value.massKg}
            <i>kg</i>
          </span>
          <span className="ib-v">
            {num(value.targetGainM, 0)}
            <i>m</i>
          </span>
        </span>
        <Chevron up={open} />
      </button>

      <div className="ctrls" id="ctrls" data-collapsed={!open}>
        <div className="ctrl">
          <label htmlFor="g">
            경사 <output id="gv">{num(value.gradePercent, 1)} %</output>
          </label>
          {/* 검증범위 경계를 조작하는 자리에 표시한다. 결과를 보고서야 외삽인 걸
              알면 이미 늦다. */}
          <div className="track" style={{ '--mark': `${ACSM_LIMIT_RATIO * 100}%` } as React.CSSProperties}>
            <input
              type="range"
              id="g"
              min={GRADE_MIN}
              max={GRADE_MAX}
              step={0.5}
              value={value.gradePercent}
              onChange={(e) => onChange({ gradePercent: Number(e.target.value) })}
            />
            <span className="markzone" aria-hidden="true" />
            <span className="marktick" aria-hidden="true" />
          </div>
          <p className="trackhint caution">15% 넘어가면 ACSM 대사식은 외삽</p>
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
          <div className="track" style={{ '--mark': `${GAIT_SWITCH_RATIO * 100}%` } as React.CSSProperties}>
            <input
              type="range"
              id="s"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={0.1}
              value={value.speedKmh}
              onChange={(e) => onChange({ speedKmh: Number(e.target.value) })}
            />
            <span className="marktick" aria-hidden="true" />
          </div>
          <p className="trackhint">7 km/h에서 보행식 → 주행식 전환</p>
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
    </>
  )
}
