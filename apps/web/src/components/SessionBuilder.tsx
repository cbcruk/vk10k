import { computeSession, type SessionPlan, type SessionResult } from '@vk10k/core'
import { useMemo } from 'react'
import { duration, num } from '../format.js'
import { CueSheet } from './CueSheet.js'
import { GainSolver } from './GainSolver.js'
import { PlanEditor } from './PlanEditor.js'

interface Props {
  plan: SessionPlan
  onChange: (plan: SessionPlan) => void
}

/**
 * 편집 중에는 도메인 밖 값이 잠깐 스칠 수 있다(칸을 비우거나 지우는 중).
 * 코어는 그때 던지는 게 맞고, UI는 그걸 화면 붕괴 대신 한 줄로 보여준다.
 */
function safeCompute(plan: SessionPlan): { result?: SessionResult; error?: string } {
  try {
    return { result: computeSession(plan) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export function SessionBuilder({ plan, onChange }: Props) {
  const { result, error } = useMemo(() => safeCompute(plan), [plan])

  if (error || !result) {
    return (
      <div className="warnings" role="alert">
        <ul>
          <li className="caution">
            <span className="code">INVALID</span>
            <span>{error}</span>
          </li>
        </ul>
      </div>
    )
  }

  const { totals } = result
  let cumulativeGain = 0
  let cumulativeSec = 0

  return (
    <>
      <section className="section">
        <h2>
          세션 구성 <span className="cap">— 블록 = 스텝의 나열 × 반복</span>
        </h2>
        <PlanEditor plan={plan} onChange={onChange} />
      </section>

      <dl className="metrics">
        <div className="m">
          <dt>총 상승</dt>
          <dd>
            {num(totals.gainM, 0)}
            <small>m</small>
          </dd>
        </div>
        <div className="m">
          <dt>총 시간</dt>
          <dd>{duration(totals.durationSec)}</dd>
        </div>
        <div className="m">
          <dt>벨트 거리</dt>
          <dd>
            {num(totals.beltKm, 2)}
            <small>km</small>
          </dd>
        </div>
        <div className="m">
          <dt>평균 VAM</dt>
          <dd>
            {num(totals.averageVamMh, 0)}
            <small>m/h</small>
          </dd>
        </div>
        <div className="m">
          <dt>평균 MET</dt>
          <dd>
            {num(totals.averageMet, 1)}
            <small>시간가중</small>
          </dd>
        </div>
        <div className="m">
          <dt>열량 (ACSM)</dt>
          <dd>
            {num(totals.kcal, 0)}
            <small>kcal</small>
          </dd>
        </div>
        <div className="m">
          <dt>열량 (Minetti)</dt>
          <dd>
            {num(totals.minettiKcal, 0)}
            <small>kcal</small>
          </dd>
        </div>
        <div className="m">
          <dt>최고 경사</dt>
          <dd>
            {num(totals.peakGradePercent, 1)}
            <small>%</small>
          </dd>
        </div>
      </dl>

      {result.warnings.length > 0 && (
        <div className="warnings" role="note" aria-label="세션 신뢰도 경고">
          <ul>
            {result.warnings.map((w) => (
              <li key={w.code} className={w.severity}>
                <span className="code">{w.code}</span>
                <span>
                  {w.message}{' '}
                  <b>
                    ({w.sources.length}/{totals.stepCount} 스텝)
                  </b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CueSheet result={result} speedBasis={plan.speedBasis} />

      <section className="section">
        <h2>
          구간 전개 <span className="cap">— {totals.stepCount} 스텝</span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>블록·바퀴</th>
              <th>경사</th>
              <th>속도</th>
              <th>시간</th>
              <th>상승</th>
              <th>누적 상승</th>
              <th>누적 시간</th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((s, i) => {
              cumulativeGain += s.gainM
              cumulativeSec += s.durationSec
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    {s.blockIndex + 1}·{s.repetition}
                  </td>
                  <td>{num(s.step.gradePercent, 1)} %</td>
                  <td>{num(s.step.speedKmh, 1)} km/h</td>
                  <td>{num(s.durationSec / 60, 1)} 분</td>
                  <td>{num(s.gainM, 0)} m</td>
                  <td>{num(cumulativeGain, 0)} m</td>
                  <td>{duration(cumulativeSec)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <GainSolver plan={plan} onApply={onChange} />
    </>
  )
}
