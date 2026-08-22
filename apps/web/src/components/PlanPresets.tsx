import type { SessionPlan } from '@vk10k/core'
import { SESSION_PRESETS } from '../session-presets.js'

interface Props {
  plan: SessionPlan
  onChange: (plan: SessionPlan) => void
}

/**
 * 모드 전환 — 프리셋을 눌러 세션 구성을 통째로 갈아끼운다.
 *
 * 체중과 속도 해석 기준은 사용자 설정이라 건드리지 않고 블록만 바꾼다.
 * 한 칸이라도 손대면 어느 프리셋도 눌린 상태가 아니게 되는데, 그게 맞다 —
 * 편집한 세션을 "지구력 모드"라고 이름 붙여두면 그때부터 거짓말이 된다.
 */
export function PlanPresets({ plan, onChange }: Props) {
  const current = JSON.stringify(plan.blocks)
  const active = SESSION_PRESETS.find((preset) => JSON.stringify(preset.blocks) === current)

  return (
    <div className="presets">
      <div className="chips" role="group" aria-label="세션 모드">
        {SESSION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active?.id === preset.id}
            onClick={() => onChange({ ...plan, blocks: structuredClone(preset.blocks) })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <span className="presethint">
        {active ? active.summary : '프리셋에서 편집한 세션입니다. 모드를 누르면 되돌아갑니다.'}
      </span>
    </div>
  )
}
