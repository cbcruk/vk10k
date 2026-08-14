import { type RejectedParam } from '@vk10k/core'

/**
 * 링크에 실려 왔지만 못 쓴 값. 조용히 클램프해서 다른 계산을 보여주는 대신,
 * 무엇을 왜 버렸는지 말하고 기본값으로 돌아갔다고 알린다.
 */
export function RejectedParams({ rejected }: { rejected: RejectedParam[] }) {
  if (rejected.length === 0) return null

  return (
    <div className="warnings" role="note" aria-label="무시된 URL 파라미터">
      <ul>
        {rejected.map((r) => (
          <li key={r.key} className="caution">
            <span className="code">URL {r.key}</span>
            <span>
              <code>
                {r.key}={r.value}
              </code>
              를 무시하고 기본값을 씁니다 — {r.reason}.
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
