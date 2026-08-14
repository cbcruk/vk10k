import { useCallback, useEffect, useState } from 'react'

/**
 * 현재 URL을 클립보드에 넣는다. 입력은 이미 쿼리스트링에 실려 있으므로
 * 복사할 상태를 따로 만들 필요가 없다.
 */
export function ShareLink() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  const copy = useCallback(async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // clipboard API는 안전 컨텍스트에서만 산다. 실패하면 주소창을 쓰라고 말한다.
      window.prompt('링크를 복사하세요', url)
    }
  }, [])

  return (
    <button type="button" className="ghost" onClick={copy}>
      {copied ? '✓ 복사됨' : '⧉ 링크 복사'}
    </button>
  )
}
