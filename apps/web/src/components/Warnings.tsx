import type { Warning } from '@vk10k/core'

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
