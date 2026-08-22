# vk10k

트레드밀 경사에서 수직 상승(Vertical Kilometer)을 계산·시뮬레이션한다.
기존 인클라인 계산기들이 얼버무리는 두 지점 — **거리 컨벤션**과 **추정식의 유효범위** — 을 명시적으로 드러내는 것이 이 프로젝트의 존재 이유다.

## 왜

웹에 널린 incline calculator는 대체로 이렇다.

- `거리 = 목표고도 ÷ 경사율` 로 끝낸다. 이건 **수평거리(run)** 인데, 정작 트레드밀이 화면에 찍는 건 **벨트 거리(사면)** 다. 30%에서 4.4% 어긋난다.
- ACSM 대사식을 경사 제한 없이 그대로 돌린다. 그 식이 검증된 범위는 경사 15%까지다. VK 영역(20~30%)은 전부 외삽인데 아무도 그렇게 표시하지 않는다.
- 보행식/주행식 전환을 속도만 보고 자른다. 경사가 가파를수록 전환점에서 값이 크게 튄다(아래 참조).

목표는 "더 그럴듯한 숫자"가 아니라 **어디부터 못 믿는지 같이 내보내는 계산기**다.

## 시작하기

```bash
pnpm install
pnpm test     # 코어 골든/불변식 테스트
pnpm dev      # 웹 UI (http://localhost:5173/vk10k/)
pnpm build    # core 빌드 → web 번들
```

## 배포

`main`에 푸시되면 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)이
테스트 → 타입체크 → 빌드를 돌리고 `apps/web/dist`를 GitHub Pages에 올린다.
골든 테스트가 배포 게이트다 — 계산이 깨진 채로는 올라가지 않는다.

Pages는 `https://<user>.github.io/vk10k/` 하위에 얹히므로 Vite `base`가 `/vk10k/`다.
dev·preview도 같은 base를 쓴다(`vite preview`의 command는 `serve`라 빌드에만 걸면
preview가 배포와 다른 경로를 서빙한다). 커스텀 도메인으로 옮기면
`apps/web/vite.config.ts`의 `BASE_PATH` 한 줄만 바꾸면 된다.

리포지토리 설정에서 **Settings → Pages → Source를 "GitHub Actions"** 로 한 번 바꿔줘야
워크플로가 실제로 배포할 수 있다.

## 계산 모델

정본은 [`docs/model.md`](docs/model.md). 아래는 요약이다.

기호: `G` = 경사율(소수, rise/run), `θ = atan(G)`, `H` = 목표 상승고도(m), `v` = 표시 속도(km/h), `m` = 체중(kg).

### 1. 기하

```
run  = H / G                    # 수평거리, 속도와 무관한 순수 기하
belt = run · √(1 + G²)          # 사면(벨트) 거리
```

| 경사 | run | belt | 차이 |
|---:|---:|---:|---:|
| 15% | 6.67 km | 6.74 km | +1.1% |
| 20% | 5.00 km | 5.10 km | +2.0% |
| 30% | 3.33 km | 3.48 km | +4.4% |

### 2. 속도 컨벤션 — 명시적 결정 사항

표시 속도 `v`를 벨트 기준으로 볼지 수평 기준으로 볼지에 따라 **소요 시간이 갈린다**. 거리는 안 갈린다.

```
basis = 'belt'        → vVert = v · sin θ
basis = 'horizontal'  → vVert = v · G
VAM   = vVert × 1000  # m/h
t     = H / VAM
```

20% · 5 km/h 기준 61.2분(belt) vs 60.0분(horizontal).
**기본값은 `belt`** — 실제 트레드밀 계기판이 벨트 이동거리를 표시하기 때문이다. 다만 인용되는 대부분의 표는 `horizontal` 가정이므로 UI에서 전환 가능해야 하고, 어느 쪽인지 결과에 항상 라벨링한다.

### 3. 대사 추정 (ACSM)

```
S = beltSpeed(m/min)
보행식: VO₂ = 0.1·S + 1.8·S·G + 3.5
주행식: VO₂ = 0.2·S + 0.9·S·G + 3.5
MET  = VO₂ / 3.5
kcal = VO₂ · m / 1000 · 5.0 · minutes
```

### 4. 일률과 효율

```
P_mech = m · g · (VAM / 3600)          # 순수 수직 일률, W
P_met  = VO₂ · m / 1000 · 348.3        # 1 L O₂ ≈ 20.9 kJ, W
η      = P_mech / P_met
```

`η`는 추정식의 sanity check로 쓴다. 경사 등반에서 18~25% 밖으로 나가면 입력이나 모델이 깨졌다는 신호다(낮은 경사에서 작게 나오는 건 정상 — 수평 이동에 쓴 일이 분자에 없다).

## 알려진 결함

문서화하고 코드에서 `warnings[]`로 방출한다. 조용히 삼키지 않는다.

**보행식/주행식 교차점은 G = 1/9 ≈ 11.1%다.** 속도와 무관하게 정확히 여기서 두 식이 만난다.

```
0.1S + 1.8SG = 0.2S + 0.9SG  →  0.9G = 0.1  →  G = 1/9
```

따라서 전환 속도(관례상 7 km/h)에서 튀는 폭이 경사에 따라 부호까지 바뀐다.

| 경사 | 보행식 | 주행식 | 간극 |
|---:|---:|---:|---:|
| 0% | 15.2 | 26.8 | −43.5% |
| 10% | 36.2 | 37.3 | −3.1% |
| **11.1%** | — | — | **0%** |
| 20% | 57.2 | 47.8 | +19.5% |
| 30% | 78.2 | 58.3 | +34.0% |

VK 영역이 하필 간극이 가장 큰 쪽이다. v0.1은 하드 전환 + 경고로 가고, 블렌딩(6~8 km/h 선형 보간)은 실측 대조 후에 결정한다. 근거 없는 보간은 정밀해 보이기만 하고 더 틀린다.

**과대추정은 경사에 비례하지 않고, 주행식에서는 부호가 뒤집힌다.** Minetti 실측 기준선과
대조한 결과다(MET 차이, 양수 = ACSM이 크게 나옴).

| 경사 | 5 km/h (보행식) | 8 km/h (주행식) |
|---:|---:|---:|
| 15% | +19.3% | −5.2% |
| 20% | **+19.8%** | −11.2% |
| 30% | +18.2% | −21.0% |
| 45% | +7.4% | **−34.0%** |

"가파를수록 더 틀린다"가 아니다 — 보행식 오차는 20% 부근에서 최대고 45%로 갈수록 좁아진다.
그리고 주행식의 경사 계수는 보행식의 절반(0.9 vs 1.8)이라 7 km/h 위에서는 ACSM이 오히려
**과소**추정한다. 자세한 건 [`docs/model.md`](docs/model.md#7-대안-모델--minetti-et-al-2002--srcminettits).

- `GRADE_EXTRAPOLATED` — 경사 > 15%. ACSM 검증범위 밖, 보행식 기준 통상 10~20% 과대추정.
- `GAIT_BOUNDARY` — 속도 6~8 km/h. 위 간극 구간.
- `HANDRAIL_UNMODELED` — 손잡이 파지 시 실측 VO₂가 유의하게 떨어지지만 식에 반영 안 됨. 고정 경고.
- 경사 0은 `VAM = 0` → `t = ∞`. 도메인에서 배제(min 1%)하고 타입으로 막는다.

## 구조

```
vk10k/
├─ packages/core/          # 의존성 0, 순수 TS. 브라우저/노드/워커 공용
│  ├─ src/units.ts         # 브랜디드 타입 (Percent, Kmh, Meters, Kg)
│  ├─ src/geometry.ts      # run / belt / angle / VAM / time
│  ├─ src/metabolic.ts     # ACSM, 경고 방출
│  ├─ src/minetti.ts       # 실측 기준선 대안 모델
│  ├─ src/power.ts         # P_mech / P_met / η
│  ├─ src/serialize.ts     # URL 인코딩/디코딩
│  ├─ src/session.ts       # 인터벌 세션 누적 · VK 목표 역산
│  ├─ src/cuesheet.ts      # 세션 → 절대 시각 큐시트
│  ├─ src/ascent.ts        # computeAscent — 코어 진입점
│  └─ test/                # golden / minetti / serialize / session / cuesheet
├─ apps/web/               # Vite + React + TS. 계산기 / 세션 빌더 두 탭
│  ├─ src/session-presets.ts # 장비 프리셋 — 6|9|12 퀵버튼 세션
│  └─ src/components/      # Controls / Profile / Metrics / Warnings /
│                          # ComparisonTable / ModelComparison / ShareLink /
│                          # SessionBuilder / PlanEditor / PlanPresets /
│                          # GainSolver / CueSheet
└─ docs/model.md           # 수식 정본
```

계산은 전부 `core`에 몰아두고 UI는 렌더링만 한다. 나중에 FIT 배치 처리를 노드에서 돌릴 때 그대로 재사용하기 위한 분리다.

## 코어 API

```ts
export interface AscentInput {
  gradePercent: Percent      // 1 ~ 45
  speedKmh: Kmh
  speedBasis: 'belt' | 'horizontal'
  massKg: Kg
  targetGainM: Meters
}

export interface AscentResult {
  angleDeg: number
  horizontalKm: number
  beltKm: number
  beltSpeedKmh: number
  horizontalSpeedKmh: number
  vamMh: number
  durationSec: number
  vo2: number
  met: number
  kcal: number
  mechanicalW: number
  metabolicW: number
  efficiency: number
  gait: 'walking' | 'running'
  speedBasis: 'belt' | 'horizontal'   // 어느 컨벤션으로 읽었는지 항상 라벨링
  minetti: MinettiEstimate            // 같은 입력을 실측 기준선으로 다시 푼 값
  warnings: Warning[]                 // 빈 배열이 아니면 UI가 반드시 노출
}

export function computeAscent(input: AscentInput): AscentResult

// 날 숫자 ↔ 브랜디드 타입. UI 상태·URL 쿼리·FIT 파싱 결과가 사는 곳.
export function toAscentInput(params: AscentParams): AscentInput

// URL 직렬화. 디코딩은 망가진 필드만 골라 버리고 이유를 같이 낸다.
export function encodeAscentParams(params: AscentParams): string
export function decodeAscentParams(query: string, fallback: AscentParams): DecodeResult
```

세션은 반대 방향으로 푼다 — 시간이 입력이고 상승고도가 결과다.

```ts
export interface SessionPlan {
  speedBasis: 'belt' | 'horizontal'
  massKg: number
  blocks: SessionBlock[]           // 블록 = 스텝의 나열 × 반복
}

export function computeSession(plan: SessionPlan): SessionResult

// VK 목표 역산 — 지정 블록을 몇 바퀴 돌아야 목표 고도에 닿는지.
// 상승고도는 반복 횟수에 선형이라 해석적으로 푼다.
export function solveRepeatsForGain(
  plan: SessionPlan, blockIndex: number, targetGainM: number,
): GainSolution
```

큐시트는 그 결과를 트레드밀 앞에서 읽는 순서로 한 번 더 뒤집는다.

```ts
// 구간 길이 → 절대 시각(T+), 그리고 설정이 같은 연속 구간은 하나로 합친다.
export function buildCueSheet(result: SessionResult): CueSheet
```

구간 전개표는 구간 중심이라 "이 구간 3분"을 말한다. 그런데 계기판에 찍히는 건 경과 시간
하나뿐이라, 필요한 정보는 "지금 몇 분이니 뭘 눌러야 하나"다. 그 변환을 사람 머리에 맡기지
않는다. 큐가 서는 곳은 구간의 **시작**이고(누계는 끝 시각이라 조작 시점이 아니다), 경사·속도가
그대로인 연속 구간은 합친다 — 조작할 게 없는 큐가 섞이면 오히려 진짜 큐를 놓친다.

큐시트에 싣는 건 조작 변수(시각·경사·속도)와 상승고도까지다. 열량과 MET은 VK 영역에서 전부
외삽이라(위 [알려진 결함](#알려진-결함)) 나란히 크게 박으면 "따라야 할 목표"로 읽힌다. 세션 요약에만 둔다.

경고를 예외가 아니라 **결과의 일부**로 둔다. 계산은 항상 성공하고, 신뢰도만 데이터로 딸려 나온다.
도메인 밖 입력만 예외다 — `percent()` / `kmh()` / `kg()` / `meters()` 생성자가 `DomainError`로 막는다.

```ts
import { computeAscent, kg, kmh, meters, percent } from '@vk10k/core'

const r = computeAscent({
  gradePercent: percent(20),
  speedKmh: kmh(5),
  speedBasis: 'belt',
  massKg: kg(70),
  targetGainM: meters(1000),
})
// r.beltKm 5.10 · r.durationSec 3671 · r.vamMh 981 · r.met 12.0
// r.warnings → GRADE_EXTRAPOLATED, HANDRAIL_UNMODELED
```

## 테스트

골든 케이스로 회귀를 고정한다.

```
15% / 5 km/h / belt / 70kg / 1000m → run 6.67km, belt 6.74km, 80.9min, VAM 742, MET 9.8
20% / 5 km/h / belt / 70kg / 1000m → run 5.00km, belt 5.10km, 61.2min, VAM 981, MET 12.0
30% / 5 km/h / belt / 70kg / 1000m → run 3.33km, belt 3.48km, 41.8min, VAM 1437, MET 16.2
```

불변식 테스트도 같이 건다.

- `run`은 `speedKmh`, `speedBasis`에 불변이다 (순수 기하)
- `belt / run === √(1+G²)` 오차 1e-12 이내
- `G = 1/9`에서 보행식 == 주행식
- `durationSec`은 경사에 대해 단조감소
- Minetti 평지 절편 `Cw(0) = 2.5`, `Cr(0) = 3.6` J/(kg·m)
- URL 인코딩 → 디코딩 왕복이 입력을 보존하고, 망가진 필드만 골라 버린다

## 로드맵

**v0.1 — 계산 코어 + 웹 UI** ✅
HTML 프로토타입에서 계산부를 뜯어 `core`로 옮기고 골든 테스트를 붙인다. UI는 단면도(실제 경사각), 경사별 비교표, 배속 시뮬레이션.

**v0.4 — 상태 공유** ✅
입력을 URL로 직렬화. 계산기 링크 하나로 재현 가능하게. 도메인 밖 값은 조용히 클램프하지 않고
그 항목만 폴백으로 되돌린 뒤 무엇을 버렸는지 UI에 알린다.

**대안 모델 대조** ✅
Minetti et al. (2002)를 코어에 넣고 ACSM 추정과 나란히 내보낸다. v0.2 캘리브레이션의 대조군.

**v0.2 — 실측 캘리브레이션**
ACSM 외삽을 개인 실측으로 보정한다. 주의: **트레드밀 세션의 FIT에는 상승고도가 안 남는다.** 실내 기압계는 변화가 없고 GPS도 없다. 따라서 검증은 실외 업힐 세션(기압 고도계 유효)으로 하고, 거기서 얻은 보정계수 `k`를 트레드밀 추정에 이식한다.

- 실외 업힐 구간에서 `VAM_actual`, HR, Garmin running power 추출
- HR → VO₂ 는 %HRR ↔ %VO₂R 개인 회귀로 근사 (안정/최대 HR 필요)
- `k = VO₂_est / VO₂_inferred` 를 경사 구간별로 적합
- Garmin의 GAP·러닝 파워를 독립 baseline으로 대조

기존 FIT 파싱 워크플로를 그대로 입력단으로 쓴다.

**v0.3 — 세션 빌더** ✅
경사 인터벌 프로그램(예: 15% 5분 / 25% 3분 × N)을 짜면 총 상승고도·시간·부하를 누적 계산. VK 목표 역산.
계산기가 "목표 고도 → 시간"이라면 세션은 "시간 → 고도"로 반대 방향이다. 플랜도 URL에 실린다.

**v0.3.2 — 모드 전환** ✅
경사·속도 퀵버튼이 6/9/12뿐인 트레드밀을 전제로 세 세션을 프리셋으로 싣는다.
인터벌(심폐) · 지구력(등반 특이성) · 템포(상승량)는 하나로 합쳐지지 않아 모드로 가른다.

앞의 둘은 아홉 칸(경사 3 × 속도 3) 안에 닫혀 있어 모든 조작이 한 탭이다. 12%가
보행식·주행식 교차점(11.1%) 바로 위라, `GAIT_BOUNDARY`가 뜨는 그 지점에서 오히려
두 식의 간극이 2.4%로 가장 좁다.

템포만 15%를 쓴다 — 퀵버튼 밖이라 세션당 다이얼 2회가 든다. 대신 15%는
`GRADE_EXTRAPOLATED`가 뜨지 않는 마지막 경사이고(경고 조건이 `> 15`),
MET 1당 VAM이 12%보다 좋다: 15% · 9 km/h가 12% · 12 km/h와 거의 같은 VAM을
MET 3.2 낮게 낸다. 대가는 신뢰도다 — 두 식의 간극이 2.4%에서 9.6%로 벌어진다.

**v0.3.1 — 큐시트** ✅
짠 세션을 절대 시각(T+) 기준으로 뒤집어 트레드밀 앞에서 시간 계산 없이 따라갈 수 있게 한다.
평문 복사와 인쇄(큐시트만 남기는 print 스타일)를 붙였다.

## 참고

- ACSM's Guidelines for Exercise Testing and Prescription — 대사 방정식과 그 유효범위
- ISF Vertical Kilometer 규정 — 5 km 이내 1,000 m 상승(평균 20% 이상)
- Minetti et al. (2002), *Energy cost of walking and running at extreme uphill and downhill slopes* — ACSM 밖 경사대의 실측 기준선. `packages/core/src/minetti.ts`에 구현, 결과에 항상 동봉
