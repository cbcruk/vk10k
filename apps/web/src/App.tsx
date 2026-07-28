import { computeAscent, kg, kmh, meters, percent } from '@vk10k/core'
import { useMemo, useState } from 'react'
import { ComparisonTable } from './components/ComparisonTable.js'
import { Controls, type ControlState } from './components/Controls.js'
import { Metrics } from './components/Metrics.js'
import { Notes } from './components/Notes.js'
import { Profile } from './components/Profile.js'
import { Transport } from './components/Transport.js'
import { Warnings } from './components/Warnings.js'
import { BASIS_LABEL, duration, num } from './format.js'
import { useClimb } from './hooks/useClimb.js'

const INITIAL: ControlState = {
  grade: 20,
  speed: 5,
  basis: 'belt',
  mass: 70,
  target: 1000,
}

export function App() {
  const [ctrl, setCtrl] = useState<ControlState>(INITIAL)

  const result = useMemo(
    () =>
      computeAscent({
        gradePercent: percent(ctrl.grade),
        speedKmh: kmh(ctrl.speed),
        speedBasis: ctrl.basis,
        massKg: kg(ctrl.mass),
        targetGainM: meters(ctrl.target),
      }),
    [ctrl],
  )

  const { elapsedSec, running, rate, setRate, toggle, reset } = useClimb(result.durationSec)
  const progress = Math.min(1, (elapsedSec * result.vamMh) / 3600 / ctrl.target)

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
      <div className="rule" />

      <Controls value={ctrl} onChange={(patch) => setCtrl((c) => ({ ...c, ...patch }))} />

      <div className="stage">
        <Profile result={result} targetGainM={ctrl.target} progress={progress} />
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
            표시 속도 {num(ctrl.speed, 1)} km/h를 <b>{BASIS_LABEL[result.speedBasis]} 거리</b> 기준으로
            읽음
            <br />
            벨트 {num(result.beltSpeedKmh, 2)} · 수평 {num(result.horizontalSpeedKmh, 2)} km/h
          </p>
        </div>
      </div>

      <Transport
        running={running}
        rate={rate}
        elapsedSec={elapsedSec}
        gainM={progress * ctrl.target}
        kcal={progress * result.kcal}
        onToggle={toggle}
        onReset={reset}
        onRate={setRate}
      />

      <Metrics result={result} />
      <Warnings warnings={result.warnings} />

      <ComparisonTable
        grade={ctrl.grade}
        speed={ctrl.speed}
        basis={ctrl.basis}
        mass={ctrl.mass}
        target={ctrl.target}
      />

      <Notes />
    </div>
  )
}
