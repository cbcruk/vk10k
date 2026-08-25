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
import { WarningBadges, Warnings } from './components/Warnings.js'
import { BASIS_LABEL, duration, num } from './format.js'
import { useClimb } from './hooks/useClimb.js'
import { useShareableState } from './hooks/useShareableState.js'
import { SESSION_PRESETS } from './session-presets.js'

const DEFAULT_PARAMS: AscentParams = {
  gradePercent: 20,
  speedKmh: 5,
  speedBasis: 'belt',
  massKg: 65,
  targetGainM: 1000,
}

/** 기본은 인터벌 모드. 나머지 모드는 세션 빌더에서 전환한다. */
const DEFAULT_PLAN: SessionPlan = {
  speedBasis: 'belt',
  massKg: 65,
  blocks: structuredClone(SESSION_PRESETS[0]!.blocks),
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
        <div className="results">
          <div className="bigs">
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
          </div>
          <WarningBadges warnings={result.warnings} />
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
      <header className="vkhead">
        <div className="eyebrow">Vertical Kilometer · Treadmill Simulator</div>
        <div className="vkhead-top">
          <h1>
            VK<em>10K</em>
          </h1>
          <div className="seg tabs" role="tablist" aria-label="화면">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'calculator'}
              aria-pressed={tab === 'calculator'}
              onClick={() => setTab('calculator')}
            >
              계산기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'session'}
              aria-pressed={tab === 'session'}
              onClick={() => setTab('session')}
            >
              세션 빌더
            </button>
          </div>
        </div>
        {/* 좁은 화면에서는 리드가 넉 줄이라 결과를 밀어낸다. 같은 말을 한 줄로 줄이고
            뒷문장은 각주로 넘긴다. */}
        <p className="lede">
          <span className="lede-full">
            경사와 속도를 정하면 목표 고도를 쌓는 데 걸리는 시간, 실제로 밟아야 하는 거리, 그리고
            대사 부하를 계산합니다. 추정이 어디서부터 못 믿을 값이 되는지도 같이 표시합니다.
          </span>
          <span className="lede-short">
            경사·속도로 상승 시간과 거리, 대사 부하를 계산합니다. <a href="#notes">추정의 한계</a>
          </span>
        </p>
      </header>

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
