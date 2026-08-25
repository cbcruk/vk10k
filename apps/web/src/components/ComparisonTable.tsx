import type { AscentParams } from '@vk10k/core'
import { ACSM_GRADE_LIMIT, computeAscent, toAscentInput } from '@vk10k/core'
import { Fragment } from 'react'
import { BASIS_LABEL, duration, num } from '../format.js'

const GRADES = [10, 15, 20, 25, 30, 35, 40]

export function ComparisonTable({ params }: { params: AscentParams }) {
  const nearest = GRADES.reduce((a, b) =>
    Math.abs(b - params.gradePercent) < Math.abs(a - params.gradePercent) ? b : a,
  )

  const rows = GRADES.map((gradePercent) => ({
    gradePercent,
    result: computeAscent(toAscentInput({ ...params, gradePercent })),
  }))

  return (
    <section className="section">
      <h2>
        경사별 비교{' '}
        <span className="cap">
          — {num(params.speedKmh, 1)} km/h ({BASIS_LABEL[params.speedBasis]}) 로{' '}
          {num(params.targetGainM, 0)} m 상승
        </span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>경사</th>
            {/* 좁은 화면에서는 거리 세 열을 접는다. 훑을 때 필요한 건 시간과 부하고,
                거리는 지금 고른 경사에서만 펼쳐 보여준다. */}
            <th className="colwide">수평거리</th>
            <th className="colwide">벨트거리</th>
            <th className="colwide">차이</th>
            <th>소요시간</th>
            <th>VAM</th>
            <th>MET</th>
            <th>Minetti</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ gradePercent, result }) => {
            const here = gradePercent === nearest
            const spread = (result.beltKm / result.horizontalKm - 1) * 100
            return (
              <Fragment key={gradePercent}>
                <tr className={here ? 'here' : undefined}>
                  <td>{gradePercent} %</td>
                  <td className="colwide">{num(result.horizontalKm, 2)} km</td>
                  <td className="colwide">{num(result.beltKm, 2)} km</td>
                  <td className="colwide">+{num(spread, 1)} %</td>
                  <td>{duration(result.durationSec)}</td>
                  <td>{num(result.vamMh, 0)}</td>
                  <td className={gradePercent > ACSM_GRADE_LIMIT ? 'extrap' : undefined}>
                    {num(result.met, 1)}
                    {gradePercent > ACSM_GRADE_LIMIT ? '*' : ''}
                  </td>
                  <td>{num(result.minetti.met, 1)}</td>
                </tr>
                {here ? (
                  <tr className="heredetail">
                    <td colSpan={8}>
                      <span>
                        수평 <b>{num(result.horizontalKm, 2)}</b> km
                      </span>
                      <span>
                        벨트 <b>{num(result.beltKm, 2)}</b> km
                      </span>
                      <span>
                        차이 <b>+{num(spread, 1)}</b> %
                      </span>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="notes" style={{ marginTop: 10 }}>
        * 경사 {ACSM_GRADE_LIMIT}% 초과 — ACSM 검증범위 밖의 외삽값. Minetti 열은 같은 입력을 실측
        기준선으로 다시 푼 MET입니다.
      </p>
    </section>
  )
}
