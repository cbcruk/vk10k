import { GRADE_MAX, GRADE_MIN, type SessionBlock, type SessionPlan } from '@vk10k/core'
import { num } from '../format.js'

interface Props {
  plan: SessionPlan
  onChange: (plan: SessionPlan) => void
}

const NEW_STEP = { gradePercent: 15, speedKmh: 5, durationSec: 300 }

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item))
}

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value)
          // 빈 칸이나 도메인 밖 값이 코어로 흘러가면 계산이 통째로 던진다.
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next)
        }}
      />
    </label>
  )
}

/** 반복 1회짜리 양 끝 블록은 관례상 워밍업·쿨다운이다. 이름을 붙여야 눈이 본편을 찾는다. */
function blockLabel(index: number, blocks: SessionBlock[]): string {
  const block = blocks[index]
  if (block?.repeat === 1 && blocks.length > 1) {
    if (index === 0) return '워밍업'
    if (index === blocks.length - 1) return '쿨다운'
  }
  return `블록 ${index + 1}`
}

export function PlanEditor({ plan, onChange }: Props) {
  const setBlock = (index: number, block: SessionBlock) =>
    onChange({ ...plan, blocks: replaceAt(plan.blocks, index, block) })

  return (
    <div className="plan">
      {plan.blocks.map((block, blockIndex) => {
        const blockSec = block.steps.reduce((a, s) => a + s.durationSec, 0) * block.repeat

        return (
          <div className="block" key={blockIndex}>
            <div className="blockhead">
              <Field
                label="반복"
                value={block.repeat}
                min={1}
                max={999}
                step={1}
                onChange={(repeat) => setBlock(blockIndex, { ...block, repeat })}
              />
              <span className="eyebrow">
                {blockLabel(blockIndex, plan.blocks)} · {num(blockSec / 60, 1)} 분
              </span>
              <button
                type="button"
                className="mini"
                aria-label={`블록 ${blockIndex + 1} 삭제`}
                disabled={plan.blocks.length === 1}
                onClick={() =>
                  onChange({ ...plan, blocks: plan.blocks.filter((_, i) => i !== blockIndex) })
                }
              >
                블록 삭제
              </button>
            </div>

            {block.steps.map((step, stepIndex) => (
              <div className="steprow" key={stepIndex}>
                <Field
                  label="경사 %"
                  value={step.gradePercent}
                  min={GRADE_MIN}
                  max={GRADE_MAX}
                  step={0.5}
                  onChange={(gradePercent) =>
                    setBlock(blockIndex, {
                      ...block,
                      steps: replaceAt(block.steps, stepIndex, { ...step, gradePercent }),
                    })
                  }
                />
                <Field
                  label="속도 km/h"
                  value={step.speedKmh}
                  min={0.5}
                  max={20}
                  step={0.1}
                  onChange={(speedKmh) =>
                    setBlock(blockIndex, {
                      ...block,
                      steps: replaceAt(block.steps, stepIndex, { ...step, speedKmh }),
                    })
                  }
                />
                <Field
                  label="시간 분"
                  value={step.durationSec / 60}
                  min={0.5}
                  max={240}
                  step={0.5}
                  onChange={(minutes) =>
                    setBlock(blockIndex, {
                      ...block,
                      steps: replaceAt(block.steps, stepIndex, {
                        ...step,
                        durationSec: minutes * 60,
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  className="mini"
                  aria-label={`스텝 ${stepIndex + 1} 삭제`}
                  disabled={block.steps.length === 1}
                  onClick={() =>
                    setBlock(blockIndex, {
                      ...block,
                      steps: block.steps.filter((_, i) => i !== stepIndex),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              className="mini"
              onClick={() => setBlock(blockIndex, { ...block, steps: [...block.steps, NEW_STEP] })}
            >
              + 스텝
            </button>
          </div>
        )
      })}

      <button
        type="button"
        className="mini"
        onClick={() =>
          onChange({ ...plan, blocks: [...plan.blocks, { repeat: 4, steps: [NEW_STEP] }] })
        }
      >
        + 블록
      </button>
    </div>
  )
}
