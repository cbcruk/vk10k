import type { Warning, WarningCode } from '@vk10k/core'

/** 배지에 들어갈 짧은 이름. 전문은 아래 경고 블록이 그대로 들고 있다. */
const BADGE_LABEL: Record<WarningCode, string> = {
  GRADE_EXTRAPOLATED: '외삽 · ACSM 15% 밖',
  GAIT_BOUNDARY: '보행/주행 전환 구간',
  HANDRAIL_UNMODELED: '손잡이 미반영',
}

/**
 * 좁은 화면에서 경고 블록은 결과에서 한참 아래다. 숫자 옆에 짧은 배지로 먼저
 * 알린다 — 어디부터 못 믿는지가 이 앱의 존재 이유라 스크롤 뒤로 미룰 수 없다.
 */
export function WarningBadges({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null

  return (
    <div className="wbadges" aria-hidden="true">
      {warnings.map((w) => (
        <span key={w.code} className={`wbadge ${w.severity}`}>
          {BADGE_LABEL[w.code]}
        </span>
      ))}
    </div>
  )
}

/**
 * `warnings[]`가 비어 있지 않으면 반드시 노출한다.
 * 계산은 성공했지만 어디부터 못 믿는지를 같이 내보내는 게 이 프로젝트의 존재 이유다.
 */
export function Warnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null

  return (
    <div className="warnings" role="note" aria-label="추정 신뢰도 경고">
      <ul>
        {warnings.map((w) => (
          <li key={w.code} className={w.severity}>
            <span className="code">{w.code}</span>
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
