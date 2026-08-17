import { buildCueSheet, type SessionResult, type SpeedBasis } from '@vk10k/core'
import { useMemo, useState } from 'react'
import { cueSheetToText } from '../cue-text.js'
import { BASIS_LABEL, clock, num } from '../format.js'

interface Props {
  result: SessionResult
  speedBasis: SpeedBasis
}

function arrow(current: number, previous: number | undefined): string {
  if (previous === undefined || current === previous) return ''
  return current > previous ? '▲' : '▼'
}

/**
 * 큐시트 — 구간 전개표를 절대 시각 기준으로 뒤집은 것.
 *
 * 싣는 건 조작 변수(시각·경사·속도)뿐이다. 열량과 MET은 VK 영역에서 전부 외삽이라
 * 여기 크게 박으면 "따라야 할 목표"로 읽힌다. 상승고도는 순수 기하라 신뢰도가
 * 다르니 누계만 옆에 둔다.
 */
export function CueSheet({ result, speedBasis }: Props) {
  const sheet = useMemo(() => buildCueSheet(result), [result])
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')

  if (sheet.entries.length === 0) return null

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(cueSheetToText(sheet, speedBasis))
      setCopied('done')
    } catch {
      setCopied('failed')
    }
  }

  const merged = sheet.stepCount - sheet.entries.length

  return (
    <section className="section cuesheet">
      <h2>
        큐시트{' '}
        <span className="cap">
          — {sheet.entries.length}회 조작
          {merged > 0 && `, 설정이 같은 ${merged}구간은 합침`}
        </span>
      </h2>

      <p className="cueprint">
        총 {clock(sheet.totalSec)} · 상승 {num(sheet.totalGainM, 0)} m · 속도는{' '}
        {BASIS_LABEL[speedBasis]} 거리 기준
      </p>

      <div className="cueactions noprint">
        <button type="button" className="mini" onClick={copy}>
          {copied === 'done' ? '복사됨' : copied === 'failed' ? '복사 실패' : '평문 복사'}
        </button>
        <button type="button" className="mini" onClick={() => window.print()}>
          인쇄
        </button>
        <span className="cuehint">경과 시간이 아래 시각에 닿으면 바뀐 값만 맞추면 됩니다.</span>
      </div>

      <table className="cuetable">
        <thead>
          <tr>
            <th>시각</th>
            <th>경사</th>
            <th>속도</th>
            <th>유지</th>
            <th>누적 상승</th>
          </tr>
        </thead>
        <tbody>
          {sheet.entries.map((entry, i) => {
            const previous = sheet.entries[i - 1]
            return (
              <tr key={entry.atSec}>
                <td className="cueat">T+{clock(entry.atSec)}</td>
                <td className={entry.gradeChanged ? 'chg' : undefined}>
                  {num(entry.gradePercent, 1)} % {arrow(entry.gradePercent, previous?.gradePercent)}
                </td>
                <td className={entry.speedChanged ? 'chg' : undefined}>
                  {num(entry.speedKmh, 1)} km/h {arrow(entry.speedKmh, previous?.speedKmh)}
                </td>
                <td>{clock(entry.durationSec)}</td>
                <td>{num(entry.cumulativeGainM, 0)} m</td>
              </tr>
            )
          })}
          <tr className="cueend">
            <td className="cueat">T+{clock(sheet.totalSec)}</td>
            <td colSpan={3}>종료</td>
            <td>{num(sheet.totalGainM, 0)} m</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
