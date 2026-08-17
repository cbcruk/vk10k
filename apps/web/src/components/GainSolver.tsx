import { computeSession, solveRepeatsForGain, type SessionPlan } from '@vk10k/core'
import { useState } from 'react'
import { duration, num } from '../format.js'

const TARGETS = [
  { value: 1000, label: '1,000 VK' },
  { value: 8848, label: '8,848 에베레스팅' },
  { value: 10000, label: '10,000 VK10K' },
]

interface Props {
  plan: SessionPlan
  onApply: (plan: SessionPlan) => void
}

/**
 * 늘릴 블록의 기본값 — 한 바퀴에 가장 많이 오르는 블록이 본편이다.
 *
 * "마지막 블록"으로 잡으면 쿨다운이 붙은 순간 3% 5분짜리를 64바퀴 돌라는 답이 나온다.
 * 반복 횟수에 비례해 목표를 밀어올리는 양이 곧 그 블록이 본편인지를 말해준다.
 */
function mainBlockIndex(plan: SessionPlan): number {
  let best = 0
  let bestGain = -1

  for (const [index, block] of plan.blocks.entries()) {
    let gainM: number
    try {
      gainM = computeSession({ ...plan, blocks: [{ repeat: 1, steps: block.steps }] }).totals.gainM
    } catch {
      continue
    }
    if (gainM > bestGain) {
      bestGain = gainM
      best = index
    }
  }

  return best
}

/** VK 목표 역산 — 지정한 블록을 몇 바퀴 돌아야 목표 고도에 닿는지. */
export function GainSolver({ plan, onApply }: Props) {
  const [targetGainM, setTargetGainM] = useState(1000)
  const [blockIndex, setBlockIndex] = useState(() => mainBlockIndex(plan))

  const index = Math.min(blockIndex, plan.blocks.length - 1)
  let solution
  try {
    solution = solveRepeatsForGain(plan, index, targetGainM)
  } catch {
    return null
  }

  const current = plan.blocks[index]?.repeat ?? 1

  return (
    <section className="section">
      <h2>VK 목표 역산</h2>

      <div className="solver">
        <label className="field">
          <span>목표 상승 m</span>
          <input
            type="number"
            value={targetGainM}
            min={1}
            max={100000}
            step={100}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isFinite(next) && next >= 1 && next <= 100000) setTargetGainM(next)
            }}
          />
        </label>

        <label className="field">
          <span>반복할 블록</span>
          <select value={index} onChange={(e) => setBlockIndex(Number(e.target.value))}>
            {plan.blocks.map((block, i) => (
              <option key={i} value={i}>
                블록 {i + 1} ({block.steps.length} 스텝)
              </option>
            ))}
          </select>
        </label>

        <div className="chips">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={targetGainM === t.value}
              onClick={() => setTargetGainM(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {solution.reachable ? (
        <>
          <dl className="metrics">
            <div className="m">
              <dt>필요 반복</dt>
              <dd>
                {solution.repeat}
                <small>바퀴 (정확히 {num(solution.exactRepeat, 2)})</small>
              </dd>
            </div>
            <div className="m">
              <dt>그때 총 상승</dt>
              <dd>
                {num(solution.gainM, 0)}
                <small>m</small>
              </dd>
            </div>
            <div className="m">
              <dt>그때 총 시간</dt>
              <dd>{duration(solution.durationSec)}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="mini"
            disabled={solution.repeat === current}
            onClick={() =>
              onApply({
                ...plan,
                blocks: plan.blocks.map((b, i) =>
                  i === index ? { ...b, repeat: solution.repeat } : b,
                ),
              })
            }
          >
            블록 {index + 1} 반복을 {solution.repeat}회로 맞추기
          </button>
        </>
      ) : (
        <p className="notes">이 블록은 고도를 쌓지 않아 반복해도 목표에 닿지 않습니다.</p>
      )}
    </section>
  )
}
