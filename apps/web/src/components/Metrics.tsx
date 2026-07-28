import type { AscentResult } from '@vk10k/core'
import { EFFICIENCY_PLAUSIBLE } from '@vk10k/core'
import { num } from '../format.js'

function Cell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="m">
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <small>{unit}</small> : null}
      </dd>
    </div>
  )
}

export function Metrics({ result }: { result: AscentResult }) {
  const extrapolated = result.warnings.some((w) => w.code === 'GRADE_EXTRAPOLATED')
  const effPct = result.efficiency * 100
  const effSane =
    result.efficiency >= EFFICIENCY_PLAUSIBLE.min && result.efficiency <= EFFICIENCY_PLAUSIBLE.max

  return (
    <dl className="metrics">
      <Cell label="벨트 거리" value={num(result.beltKm, 2)} unit="km" />
      <Cell label="수평 거리 (run)" value={num(result.horizontalKm, 2)} unit="km" />
      <Cell label="경사각" value={num(result.angleDeg, 1)} unit="°" />
      <Cell label="벨트 속도" value={num(result.beltSpeedKmh, 2)} unit="km/h" />
      <Cell
        label="MET"
        value={num(result.met, 1)}
        unit={extrapolated ? '외삽' : result.gait === 'walking' ? '보행식' : '주행식'}
      />
      <Cell label="총 소비 열량" value={num(result.kcal, 0)} unit="kcal" />
      <Cell label="수직 일률" value={num(result.mechanicalW, 0)} unit="W" />
      <Cell label="대사 출력" value={num(result.metabolicW, 0)} unit="W" />
      <Cell label="총효율" value={num(effPct, 1)} unit={effSane ? '%' : '% · 범위 밖'} />
    </dl>
  )
}
