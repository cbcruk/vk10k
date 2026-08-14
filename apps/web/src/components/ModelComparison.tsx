import type { AscentResult } from '@vk10k/core'
import { num } from '../format.js'

function delta(acsm: number, alt: number): string {
  const pct = (acsm / alt - 1) * 100
  return `${pct >= 0 ? '+' : ''}${num(pct, 1)} %`
}

/**
 * ACSM 추정과 Minetti 실측 기준선을 나란히 놓는다. 어느 쪽이 옳다고 고르지
 * 않는다 — 벌어지는 폭이 곧 이 숫자를 얼마나 못 믿는지다.
 */
export function ModelComparison({ result }: { result: AscentResult }) {
  const altEfficiency = result.mechanicalW / result.minetti.metabolicW
  const gapPct = (result.met / result.minetti.met - 1) * 100

  return (
    <section className="section">
      <h2>
        모델 대조{' '}
        <span className="cap">
          — ACSM 추정 vs Minetti et al. (2002) · {result.gait === 'walking' ? '보행' : '주행'}
        </span>
      </h2>

      <table>
        <thead>
          <tr>
            <th>지표</th>
            <th>ACSM</th>
            <th>Minetti</th>
            <th>차이</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>VO₂ ml/kg/min</td>
            <td>{num(result.vo2, 1)}</td>
            <td>{num(result.minetti.vo2, 1)}</td>
            <td className={gapPct >= 0 ? 'extrap' : undefined}>
              {delta(result.vo2, result.minetti.vo2)}
            </td>
          </tr>
          <tr>
            <td>MET</td>
            <td>{num(result.met, 1)}</td>
            <td>{num(result.minetti.met, 1)}</td>
            <td className={gapPct >= 0 ? 'extrap' : undefined}>
              {delta(result.met, result.minetti.met)}
            </td>
          </tr>
          <tr>
            <td>총 소비 열량 kcal</td>
            <td>{num(result.kcal, 0)}</td>
            <td>{num(result.minetti.kcal, 0)}</td>
            <td className={gapPct >= 0 ? 'extrap' : undefined}>
              {delta(result.kcal, result.minetti.kcal)}
            </td>
          </tr>
          <tr>
            <td>대사 출력 W</td>
            <td>{num(result.metabolicW, 0)}</td>
            <td>{num(result.minetti.metabolicW, 0)}</td>
            <td className={gapPct >= 0 ? 'extrap' : undefined}>
              {delta(result.metabolicW, result.minetti.metabolicW)}
            </td>
          </tr>
          <tr>
            <td>총효율 %</td>
            <td>{num(result.efficiency * 100, 1)}</td>
            <td>{num(altEfficiency * 100, 1)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      <p className="notes" style={{ marginTop: 10 }}>
        Minetti는 이동거리 1 m당 대사비용을 −45%~+45% 경사대에서 실측해 5차 다항식으로 적합한
        것입니다(현재 {num(result.minetti.costJPerKgM, 2)} J/kg/m). 우리 경사 도메인이 통째로 그 안에
        듭니다. 순수 증분값이라 ACSM과 같은 축에 놓으려고 안정시 3.5를 더했습니다.{' '}
        {gapPct >= 0 ? (
          <>
            지금 입력에서 <b>ACSM이 {num(gapPct, 1)}% 크게</b> 나옵니다.
          </>
        ) : (
          <>
            지금 입력에서는 <b>ACSM이 {num(-gapPct, 1)}% 작게</b> 나옵니다 — 주행식의 경사 계수가
            보행식의 절반(0.9 vs 1.8)이라 가파른 구간에서 부호가 뒤집힙니다.
          </>
        )}
      </p>
    </section>
  )
}
