import { duration, num } from '../format.js'

const RATES = [1, 60, 300, 1800]

interface Props {
  running: boolean
  rate: number
  elapsedSec: number
  gainM: number
  kcal: number
  onToggle: () => void
  onReset: () => void
  onRate: (rate: number) => void
  share?: React.ReactNode
}

export function Transport({
  running,
  rate,
  elapsedSec,
  gainM,
  kcal,
  onToggle,
  onReset,
  onRate,
  share,
}: Props) {
  return (
    <div className="transport">
      <button type="button" className="tp-go" onClick={onToggle}>
        {running ? '❙❙ 일시정지' : '▶ 오르기'}
      </button>
      <button type="button" className="tp-reset ghost" onClick={onReset}>
        처음으로
      </button>
      <span className="tp-share">{share}</span>
      <span className="eyebrow tp-readout" aria-live="off">
        {num(gainM, 0)} m · {duration(elapsedSec)} · {num(kcal, 0)} kcal
      </span>
      <span className="rate" role="group" aria-label="배속">
        {RATES.map((r) => (
          <button key={r} type="button" aria-pressed={rate === r} onClick={() => onRate(r)}>
            {r}×
          </button>
        ))}
      </span>
    </div>
  )
}
