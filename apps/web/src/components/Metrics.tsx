import type { AscentResult } from '@vk10k/core'
import { EFFICIENCY_PLAUSIBLE } from '@vk10k/core'
import { useState } from 'react'
import { num } from '../format.js'

interface CellData {
  label: string
  value: string
  unit?: string
  /** 검증범위 밖이라 그대로 믿으면 안 되는 값. */
  soft?: boolean
}

function Cell({ label, value, unit, soft }: CellData) {
  return (
    <div className="m" data-soft={soft ? 'true' : undefined}>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <small>{unit}</small> : null}
      </dd>
    </div>
  )
}

function Group({ label, cells }: { label: string; cells: CellData[] }) {
  return (
    <section className="mgroup">
      <div className="grp">{label}</div>
      <dl className="metrics">
        {cells.map((c) => (
          <Cell key={c.label} {...c} />
        ))}
      </dl>
    </section>
  )
}

export function Metrics({ result }: { result: AscentResult }) {
  const [open, setOpen] = useState(false)
  const extrapolated = result.warnings.some((w) => w.code === 'GRADE_EXTRAPOLATED')
  const effPct = result.efficiency * 100
  const effSane =
    result.efficiency >= EFFICIENCY_PLAUSIBLE.min && result.efficiency <= EFFICIENCY_PLAUSIBLE.max

  const metUnit = extrapolated ? '외삽' : result.gait === 'walking' ? '보행식' : '주행식'

  const distance: CellData[] = [
    { label: '벨트 거리', value: num(result.beltKm, 2), unit: 'km' },
    { label: '수평 거리 (run)', value: num(result.horizontalKm, 2), unit: 'km' },
    { label: '경사각', value: num(result.angleDeg, 1), unit: '°' },
  ]
  const metabolic: CellData[] = [
    { label: '벨트 속도', value: num(result.beltSpeedKmh, 2), unit: 'km/h' },
    { label: 'MET', value: num(result.met, 1), unit: metUnit, soft: extrapolated },
    { label: '총 소비 열량', value: num(result.kcal, 0), unit: 'kcal' },
  ]
  const power: CellData[] = [
    { label: '수직 일률', value: num(result.mechanicalW, 0), unit: 'W' },
    { label: '대사 출력', value: num(result.metabolicW, 0), unit: 'W' },
    { label: '총효율', value: num(effPct, 1), unit: effSane ? '%' : '% · 범위 밖' },
  ]

  /* 좁은 화면에서 아홉 칸이 같은 무게로 깔리면 어디부터 읽을지가 없다.
     세 칸만 남기고 나머지는 접는다 — 넓은 화면에서는 늘 다 펼쳐져 있다. */
  const key: CellData[] = [distance[0]!, metabolic[2]!, metabolic[1]!]

  return (
    <div className="metricswrap" data-open={open ? 'true' : 'false'}>
      <dl className="metrics mkey">
        {key.map((c) => (
          <Cell key={c.label} {...c} />
        ))}
      </dl>

      <div className="mgroups" data-collapsed={!open}>
        <Group label="거리 · 기하" cells={distance} />
        <Group label="속도 · 대사" cells={metabolic} />
        <Group label="출력 · 효율" cells={power} />
      </div>

      <button
        type="button"
        className="moretoggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '상세 지표 접기' : '상세 지표 6개'}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={open ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'} />
        </svg>
      </button>
    </div>
  )
}
