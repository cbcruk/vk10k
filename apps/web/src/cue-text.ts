import type { CueSheet, SpeedBasis } from '@vk10k/core'
import { BASIS_LABEL, clock, num } from './format.js'

/**
 * 큐시트를 붙여넣을 수 있는 평문으로 뽑는다. 폰을 못 올려두는 상황(땀·진동)에서
 * 종이 한 장이나 메모 앱이 제일 확실한 매체다.
 *
 * 열 폭을 실제 내용에 맞춰 잡는다 — 고정 폭으로 박으면 45% 경사나 10 km/h에서
 * 자릿수가 밀려 세로줄이 무너진다.
 */
export function cueSheetToText(sheet: CueSheet, speedBasis: SpeedBasis): string {
  const rows = sheet.entries.map((entry) => ({
    at: `T+${clock(entry.atSec)}`,
    grade: `${num(entry.gradePercent, 1)}%`,
    speed: `${num(entry.speedKmh, 1)} km/h`,
    hold: clock(entry.durationSec),
  }))

  const width = (pick: (row: (typeof rows)[number]) => string): number =>
    rows.reduce((max, row) => Math.max(max, pick(row).length), 0)

  const atWidth = width((r) => r.at)
  const gradeWidth = width((r) => r.grade)
  const speedWidth = width((r) => r.speed)

  const lines = rows.map(
    (row) =>
      `${row.at.padEnd(atWidth)}  ${row.grade.padStart(gradeWidth)} · ` +
      `${row.speed.padStart(speedWidth)}   ${row.hold.padStart(5)}`,
  )

  return [
    'VK10K 세션 큐시트',
    `총 ${clock(sheet.totalSec)} · 상승 ${num(sheet.totalGainM, 0)} m · ` +
      `속도는 ${BASIS_LABEL[speedBasis]} 거리 기준`,
    '',
    ...lines,
    `${`T+${clock(sheet.totalSec)}`.padEnd(atWidth)}  종료`,
  ].join('\n')
}
