import {
  computeAscent,
  toAscentInput,
  type AscentParams,
  type SessionPlan,
} from '@vk10k/core'
import { useMemo } from 'react'
import { ComparisonTable } from './components/ComparisonTable.js'
import { Controls } from './components/Controls.js'
import { Metrics } from './components/Metrics.js'
import { ModelComparison } from './components/ModelComparison.js'
import { Notes } from './components/Notes.js'
import { Profile } from './components/Profile.js'
import { RejectedParams } from './components/RejectedParams.js'
import { SessionBuilder } from './components/SessionBuilder.js'
import { ShareLink } from './components/ShareLink.js'
import { Transport } from './components/Transport.js'
import { Warnings } from './components/Warnings.js'
import { BASIS_LABEL, duration, num } from './format.js'
import { useClimb } from './hooks/useClimb.js'
import { useShareableState } from './hooks/useShareableState.js'

const DEFAULT_PARAMS: AscentParams = {
  gradePercent: 20,
  speedKmh: 5,
  speedBasis: 'belt',
  massKg: 70,
  targetGainM: 1000,
}

/**
 * 20% 3분 / 8% 2분 × 6, 워밍업·쿨다운 포함 — 43분 380 m.
 *
 * 최고 경사를 20%로 잡은 건 ISF VK 규정의 평균 경사이면서 ACSM 검증범위(15%) 밖이라
 * 첫 화면에서 `GRADE_EXTRAPOLATED`가 뜨기 때문이다. 그 경고가 이 앱의 요지다.
 *
 * 회복 구간은 8%다. 이전 기본값은 회복 자리에 15%를 뒀는데 그건 그 자체로 MET 9.8이라
 * 쉬는 구간이 아니었고, 결과적으로 48분을 MET 9.8 아래로 내려가지 않고 버티는 세션이었다.
 * 기본값은 시연이지 도전 과제가 아니다. VK 1,000 m는 목표 역산으로 늘리면 된다.
 */
const DEFAULT_PLAN: SessionPlan = {
  speedBasis: 'belt',
  massKg: 70,
  blocks: [
    { repeat: 1, steps: [{ gradePercent: 5, speedKmh: 5, durationSec: 480 }] },
    {
      repeat: 6,
      steps: [
        { gradePercent: 20, speedKmh: 4.5, durationSec: 180 },
        { gradePercent: 8, speedKmh: 4.5, durationSec: 120 },
      ],
    },
    { repeat: 1, steps: [{ gradePercent: 3, speedKmh: 4, durationSec: 300 }] },
  ],
}

function Calculator({
  params,
  onChange,
}: {
  params: AscentParams
  onChange: (patch: Partial<AscentParams>) => void
}) {
  const result = useMemo(() => computeAscent(toAscentInput(params)), [params])
  const { elapsedSec, running, rate, setRate, toggle, reset } = useClimb(result.durationSec)
  const progress = Math.min(1, (elapsedSec * result.vamMh) / 3600 / params.targetGainM)

  return (
    <>
      <Controls value={params} onChange={onChange} />

      <div className="stage">
        <Profile result={result} targetGainM={params.targetGainM} progress={progress} />
        <div>
          <div className="bigblk">
            <div className="bigcap">소요 시간</div>
            <div className="big">{duration(result.durationSec)}</div>
          </div>
          <div className="bigblk">
            <div className="bigcap">수직 상승 속도 (VAM)</div>
            <div className="big">
              {num(result.vamMh, 0)}
              <span>m/h</span>
            </div>
          </div>
          <p className="basis">
            표시 속도 {num(params.speedKmh, 1)} km/h를 <b>{BASIS_LABEL[result.speedBasis]} 거리</b>{' '}
            기준으로 읽음
            <br />
            벨트 {num(result.beltSpeedKmh, 2)} · 수평 {num(result.horizontalSpeedKmh, 2)} km/h
          </p>
        </div>
      </div>

      <Transport
        running={running}
        rate={rate}
        elapsedSec={elapsedSec}
        gainM={progress * params.targetGainM}
        kcal={progress * result.kcal}
        onToggle={toggle}
        onReset={reset}
        onRate={setRate}
        share={<ShareLink />}
      />

      <Metrics result={result} />
      <Warnings warnings={result.warnings} />

      <ComparisonTable params={params} />
      <ModelComparison result={result} />
    </>
  )
}

export function App() {
  const { tab, setTab, params, patchParams, plan, setPlan, rejected } = useShareableState({
    params: DEFAULT_PARAMS,
    plan: DEFAULT_PLAN,
  })

  return (
    <div className="vk">
      <div className="eyebrow">Vertical Kilometer · Treadmill Simulator</div>
      <h1>
        VK<em>10K</em>
      </h1>
      <p className="lede">
        경사와 속도를 정하면 목표 고도를 쌓는 데 걸리는 시간, 실제로 밟아야 하는 거리, 그리고 대사
        부하를 계산합니다. 추정이 어디서부터 못 믿을 값이 되는지도 같이 표시합니다.
      </p>

      <div className="seg tabs" role="tablist" aria-label="화면">
        <button type="button" role="tab" aria-selected={tab === 'calculator'} aria-pressed={tab === 'calculator'} onClick={() => setTab('calculator')}>
          계산기
        </button>
        <button type="button" role="tab" aria-selected={tab === 'session'} aria-pressed={tab === 'session'} onClick={() => setTab('session')}>
          세션 빌더
        </button>
      </div>

      <div className="rule" />

      <RejectedParams rejected={rejected} />

      {tab === 'calculator' ? (
        <Calculator params={params} onChange={patchParams} />
      ) : (
        <>
          <div className="sessionhead">
            <label className="field">
              <span>체중 kg</span>
              <input
                type="number"
                value={plan.massKg}
                min={20}
                max={250}
                step={1}
                onChange={(e) => {
                  const massKg = Number(e.target.value)
                  if (Number.isFinite(massKg) && massKg >= 20 && massKg <= 250) {
                    setPlan({ ...plan, massKg })
                  }
                }}
              />
            </label>
            <div className="seg" role="group" aria-label="속도 해석 기준">
              <button
                type="button"
                aria-pressed={plan.speedBasis === 'belt'}
                onClick={() => setPlan({ ...plan, speedBasis: 'belt' })}
              >
                벨트 거리
              </button>
              <button
                type="button"
                aria-pressed={plan.speedBasis === 'horizontal'}
                onClick={() => setPlan({ ...plan, speedBasis: 'horizontal' })}
              >
                수평 거리
              </button>
            </div>
            <ShareLink />
          </div>

          <SessionBuilder plan={plan} onChange={setPlan} />
        </>
      )}

      <Notes />
    </div>
  )
}
