# 계산 모델 (정본)

`packages/core`가 구현하는 수식의 정본. README는 요약이고, 값이 갈리면 이 문서를 따른다.

기호: `G` = 경사율(소수, rise/run), `θ = atan(G)`, `H` = 목표 상승고도(m),
`v` = 표시 속도(km/h), `m` = 체중(kg), `g` = 9.80665 m/s².

## 1. 기하 — `src/geometry.ts`

```
run  = H / G                    # 수평거리, 속도와 무관한 순수 기하
belt = run · √(1 + G²)          # 사면(벨트) 거리
```

| 경사 | run | belt | 차이 |
|---:|---:|---:|---:|
| 15% | 6.67 km | 6.74 km | +1.1% |
| 20% | 5.00 km | 5.10 km | +2.0% |
| 30% | 3.33 km | 3.48 km | +4.4% |

`belt / run`은 속도·체중·목표고도 어느 것에도 의존하지 않는다. 테스트가 1e-12로 고정한다.

## 2. 속도 컨벤션

표시 속도 `v`를 무엇으로 읽느냐가 **시간을 가른다. 거리는 안 갈린다.**

```
basis = 'belt'        → vBelt = v,          vHoriz = v · cos θ
basis = 'horizontal'  → vHoriz = v,         vBelt  = v / cos θ
vVert = vHoriz · G                          # 두 경우 통합
VAM   = vVert × 1000                        # m/h
t     = H / VAM
```

`basis = 'belt'`에서 `vVert = v·cosθ·tanθ = v·sinθ`로 환원된다.

20% · 5 km/h → 61.2분(belt) vs 60.0분(horizontal).

**기본값은 `belt`** — 실제 트레드밀 계기판이 벨트 이동거리를 표시하기 때문이다.
인용되는 대부분의 표는 `horizontal` 가정이므로 UI에서 전환 가능해야 하고,
`AscentResult.speedBasis`로 결과에 항상 라벨링한다.

## 3. 대사 추정 (ACSM) — `src/metabolic.ts`

```
S = vBelt(m/min) = vBelt(km/h) · 1000 / 60
보행식: VO₂ = 0.1·S + 1.8·S·G + 3.5
주행식: VO₂ = 0.2·S + 0.9·S·G + 3.5
MET  = VO₂ / 3.5
kcal = VO₂ · m / 1000 · 5.0 · minutes
```

식 선택은 **벨트 속도** 기준이다. 입력이 `horizontal`이면 벨트로 환산한 뒤 판정하므로,
같은 표시 속도라도 basis에 따라 보행/주행이 갈릴 수 있다(20%, 6.95 km/h가 그 예).

### 전환점

두 식은 **G = 1/9 ≈ 11.1%** 에서 속도와 무관하게 정확히 만난다.

```
0.1S + 1.8SG = 0.2S + 0.9SG  →  0.9G = 0.1  →  G = 1/9
```

따라서 관례적 전환 속도 7 km/h에서 튀는 폭이 경사에 따라 **부호까지 바뀐다.**

| 경사 | 보행식 | 주행식 | 간극 |
|---:|---:|---:|---:|
| 0% | 15.2 | 26.8 | −43.5% |
| 10% | 36.2 | 37.3 | −3.1% |
| **11.1%** | — | — | **0%** |
| 20% | 57.2 | 47.8 | +19.5% |
| 30% | 78.2 | 58.3 | +34.0% |

VK 영역이 하필 간극이 가장 큰 쪽이다. v0.1은 **하드 전환 + 경고**로 간다.
블렌딩(6~8 km/h 선형 보간)은 실측 대조 후에 결정한다 —
근거 없는 보간은 정밀해 보이기만 하고 더 틀린다.

## 4. 일률과 효율 — `src/power.ts`

```
P_mech = m · g · (VAM / 3600)          # 순수 수직 일률, W
P_met  = VO₂ · m / 1000 · 348.3        # 1 L O₂ ≈ 20.9 kJ → 20900/60 W per L/min
η      = P_mech / P_met
```

`η`는 정밀 지표가 아니라 sanity check다. 경사 등반에서 18~25% 밖으로 나가면
입력이나 모델이 깨졌다는 신호. 낮은 경사에서 작게 나오는 건 정상 —
수평 이동에 쓴 일이 분자에 없다.

## 5. 경고 — 결과의 일부

경고는 예외가 아니다. 계산은 항상 성공하고, 신뢰도만 데이터로 딸려 나온다.
`warnings[]`가 비어 있지 않으면 UI가 반드시 노출한다.

| 코드 | 조건 | 심각도 | 의미 |
|---|---|---|---|
| `GRADE_EXTRAPOLATED` | 경사 > 15% | caution | ACSM 검증범위 밖. 통상 10~20% 과대추정 |
| `GAIT_BOUNDARY` | 벨트 속도 6~8 km/h | caution | 위 간극 구간. 7 km/h에서 불연속 |
| `HANDRAIL_UNMODELED` | 항상 | info | 손잡이 파지 시 실측 VO₂ 하락이 식에 없음 |

## 6. 도메인 — `src/units.ts`

브랜디드 타입 생성자에서 막는다. 도메인 밖 입력은 `DomainError`.

| 값 | 범위 | 이유 |
|---|---|---|
| `gradePercent` | 1 ~ 45 | 경사 0은 `VAM = 0` → `t = ∞` |
| `speedKmh` | 0.1 ~ 30 | |
| `massKg` | 20 ~ 250 | |
| `targetGainM` | 1 ~ 100,000 | |

## 7. 골든 케이스

`test/golden.test.ts`가 고정하는 회귀 기준선.

```
15% / 5 km/h / belt / 70kg / 1000m → run 6.67km, belt 6.74km, 80.9min, VAM 742, MET 9.8
20% / 5 km/h / belt / 70kg / 1000m → run 5.00km, belt 5.10km, 61.2min, VAM 981, MET 12.0
30% / 5 km/h / belt / 70kg / 1000m → run 3.33km, belt 3.48km, 41.8min, VAM 1437, MET 16.2
```

불변식:

- `run`은 `speedKmh`, `speedBasis`에 불변 (순수 기하)
- `belt / run === √(1+G²)` 오차 1e-12 이내
- `G = 1/9`에서 보행식 == 주행식
- `durationSec`은 경사에 대해 단조감소, `vamMh`는 단조증가
- 20~30%에서 `η ∈ [0.18, 0.25]`

## 참고

- ACSM's Guidelines for Exercise Testing and Prescription — 대사 방정식과 그 유효범위
- ISF Vertical Kilometer 규정 — 5 km 이내 1,000 m 상승(평균 20% 이상)
- Minetti et al. (2002), *Energy cost of walking and running at extreme uphill and downhill slopes*
  — ACSM 밖 경사대의 실측 기준선. v0.2에서 대안 모델로 검토
