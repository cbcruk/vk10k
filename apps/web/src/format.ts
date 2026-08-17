export function num(value: number, digits: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * 트레드밀 계기판을 읽는 형식. 한 시간 미만이면 시 자리를 떼고 mm:ss로 준다 —
 * 큐시트는 한 줄에 시각이 반복해서 나오는데 `0:`가 계속 붙으면 자릿수만 밀린다.
 */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const BASIS_LABEL = { belt: '벨트', horizontal: '수평' } as const
