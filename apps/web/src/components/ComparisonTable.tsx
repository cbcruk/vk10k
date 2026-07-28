import type { SpeedBasis } from '@vk10k/core'
import { ACSM_GRADE_LIMIT, computeAscent, kg, kmh, meters, percent } from '@vk10k/core'
import { BASIS_LABEL, duration, num } from '../format.js'

const GRADES = [10, 15, 20, 25, 30, 35, 40]

interface Props {
  grade: number
  speed: number
  basis: SpeedBasis
  mass: number
  target: number
}

export function ComparisonTable({ grade, speed, basis, mass, target }: Props) {
  const nearest = GRADES.reduce((a, b) =>
    Math.abs(b - grade) < Math.abs(a - grade) ? b : a,
  )

  const rows = GRADES.map((g) => {
    const r = computeAscent({
      gradePercent: percent(g),
      speedKmh: kmh(speed),
      speedBasis: basis,
      massKg: kg(mass),
      targetGainM: meters(target),
    })
    return { g, r }
  })

  return (
    <section className="section">
      <h2>
        경사별 비교{' '}
        <span className="cap">
          — {num(speed, 1)} km/h ({BASIS_LABEL[basis]}) 로 {num(target, 0)} m 상승
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>경사</th>
            <th>수평거리</th>
            <th>벨트거리</th>
            <th>차이</th>
            <th>소요시간</th>
            <th>VAM</th>
            <th>MET</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ g, r }) => (
            <tr key={g} className={g === nearest ? 'here' : undefined}>
              <td>{g} %</td>
              <td>{num(r.horizontalKm, 2)} km</td>
              <td>{num(r.beltKm, 2)} km</td>
              <td>+{num((r.beltKm / r.horizontalKm - 1) * 100, 1)} %</td>
              <td>{duration(r.durationSec)}</td>
              <td>{num(r.vamMh, 0)}</td>
              <td className={g > ACSM_GRADE_LIMIT ? 'extrap' : undefined}>
                {num(r.met, 1)}
                {g > ACSM_GRADE_LIMIT ? '*' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="notes" style={{ marginTop: 10 }}>
        * 경사 {ACSM_GRADE_LIMIT}% 초과 — ACSM 검증범위 밖의 외삽값.
      </p>
    </section>
  )
}
