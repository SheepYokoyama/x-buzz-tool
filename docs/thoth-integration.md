# Thoth × Xpresso 連携 API（Phase 1）

「Thoth × Expresso 連携仕様書 v1.0」（2026-07-11）への Xpresso 側実装ドキュメント。
仕様書の ①予約登録 と ②状態通知 を実装済み。③実績通知（metrics）は Phase 2（未実装・後述）。

## セットアップ（Xpresso 側）

環境変数を 3 つ設定する。**3 つとも未設定の間、本連携は完全に無効**（既存機能への影響なし）。

| 変数 | 用途 |
|---|---|
| `THOTH_API_KEY` | Thoth→Xpresso 受け入れ API の Bearer キー。未設定なら受け入れ API は 503 |
| `THOTH_WEBHOOK_URL` | Xpresso→Thoth の Webhook 送信先（例: `https://thoth-q99b.onrender.com/api/webhooks/expresso`） |
| `THOTH_WEBHOOK_SECRET` | Webhook HMAC-SHA256 の共有シークレット |

キー生成（hex 限定・特殊文字禁止）:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`THOTH_API_KEY` と `THOTH_WEBHOOK_SECRET` を Thoth 側（横山直宏さん）へ安全な経路で共有する。

## 前提（会員の紐付け）

- 会員は **Thoth と同じメールアドレス（Google アカウント）で Xpresso に登録**していること
- 会員が Xpresso 上で X（または Threads）アカウントを接続済みであること
- 未登録・未接続の場合、予約登録はそれぞれ 404 / 422 で拒否される

## ① 予約登録

```
POST /api/v1/scheduled-posts
Authorization: Bearer <THOTH_API_KEY>
Content-Type: application/json
```

```jsonc
{
  "thothPostId": "tp_01J...",          // 必須・冪等キー
  "memberEmail": "member@example.com", // 必須・共通会員識別子
  "platform": "x",                     // 必須・"x" | "threads"
  "accountId": "…",                    // 任意。指定時は接続中アカウントと一致必須
  "body": "投稿本文",                   // body / thread はどちらか一方（排他）
  "thread": ["1本目", "2本目"],         // スレッド時（最大10件）
  "mediaUrls": ["https://..."],        // 任意・画像のみ・最大4枚・各5MB（動画はv1非対応）
  "scheduledAt": "2026-07-15T07:30:00+09:00", // 必須・ISO8601・未来日時
  "purpose": "line_registration",      // 任意（保存のみ）
  "campaignId": "c_...",               // 任意（保存のみ）
  "trackingUrl": "https://...",        // 任意（保存のみ）
  "contentVersion": 3                  // 任意（保存のみ）
}
```

### レスポンス

| ステータス | 意味 |
|---|---|
| `201 { "expressoPostId": "…", "status": "scheduled" }` | 新規受け付け |
| `200 { "expressoPostId": "…", "status": "…" }` | **同一 thothPostId の再送**（新規予約は作らない・仕様書の冪等性要件） |
| `404` | memberEmail に該当する会員が未登録 |
| `409` | 同一会員に同一文面の未消化予約あり／**他アカウントと同一文面**（下記ポリシー） |
| `422` | バリデーションエラー（本文長超過・アカウント未接続・過去日時・メディア不正 等） |
| `503` | Xpresso 側でキー未設定（連携無効） |

### 受け入れポリシー（409 になるケース）

1. **同一会員・同一文面の未消化予約**: 二重登録の疑いとして拒否
2. **他会員のアカウントと同一文面（直近7日）**: 「同一文面の複数アカウント横展開」は X のスパム/協調的不正（CIB）認定→凍結の最重要リスクのため、**文面が完全一致する投稿は会員をまたいで受け付けない**。Thoth 側で会員ごとに文面を変えて生成すること

### 本文長チェック

- X: weighted length 近似で 280 換算（日本語≒140字・URLは23換算）を超えると 422
- Threads: 500 文字超で 422
- 近似のため僅かにすり抜ける可能性あり。その場合は投稿時に X 側が拒否し `post.failed` で通知される

### 配信タイミングの注意（重要）

Xpresso の配信 cron は現在 **1日1回（JST 9:00 / UTC 0:00）+ 実行あたり最大2件**の安全設計。
`scheduledAt` は「この時刻以降の直近の cron 実行で配信」となり、**分単位の正確な配信時刻は保証されない**。
時刻精度・件数スループットの引き上げは規模拡大（Phase 2 以降）の課題として別途調整。

## ② 状態通知 Webhook（Xpresso → Thoth）

`THOTH_WEBHOOK_URL` へ POST。ヘッダー `X-Expresso-Signature: sha256=<hex>`（body の HMAC-SHA256、`THOTH_WEBHOOK_SECRET` で署名）。body 内 `timestamp` で ±5 分のリプレイ検証が可能。

```jsonc
{
  "event": "post.posted",       // post.scheduled | post.posted | post.failed
  "thothPostId": "tp_01J...",
  "expressoPostId": "…",
  "xPostId": "1834...",         // posted 時（X）
  "threadsPostId": null,        // posted 時（Threads）
  "postedAt": "2026-07-15T07:30:12.000Z",
  "postUrl": "https://x.com/i/web/status/...",
  "error": null,                // failed 時にメッセージ
  "timestamp": "…"              // 署名検証用
}
```

- `post.scheduled` は登録受理直後（再送最大2回）
- `post.posted` / `post.failed` は配信 cron の確定直後（再送最大2回・5秒タイムアウト）
- **到達保証は best-effort**。cron の実行時間制約（60秒）内で送るため、恒久リトライキューは持たない。
  欠落時は下記 GET でフォールバック照会できる

## 補助 API

```
GET    /api/v1/scheduled-posts/{expressoPostId}   … 状態照会（Webhook 欠落時のフォールバック）
PATCH  /api/v1/scheduled-posts/{expressoPostId}   … 日時変更 body: { "scheduledAt": "ISO8601" }
DELETE /api/v1/scheduled-posts/{expressoPostId}   … 予約キャンセル（行は cancelled で保持）
GET    /api/v1/accounts?memberEmail=…             … 会員の接続済みアカウント一覧（トークンは返さない）
```

- PATCH / DELETE は未消化（scheduled かつ配信処理前）の予約のみ。処理中・確定済みは 409
- これらの API から操作できるのは Thoth 経由で作られた予約のみ（Xpresso UI 起点の予約は対象外）

## 仕様書 v1.0 からの差分・未実装（v2 打ち合わせ事項）

| 項目 | 状態 |
|---|---|
| ③実績通知（metrics 1h/24h/72h/7d） | **未実装**。現行のメトリクス同期は1日1回のため 1h 粒度が構造的に不可。cron 高頻度化（インフラ変更）とセットで Phase 2 |
| 動画メディア | 未対応（画像 jpeg/png/gif/webp のみ） |
| 配信時刻の分単位精度 | 未対応（上記「配信タイミングの注意」） |
| 600会員スケール | 未対応。現行は少数会員の PoC 前提。スループット・X API 費用（Pay-Per-Use）・OAuth オンボーディングの整理が先 |
| Webhook の恒久リトライ | best-effort（GET 照会でフォールバック） |

## 内部実装メモ

- 受け入れた予約は `scheduled_posts.payload.partner`（`source:'thoth'`・thothPostId 等）で識別
- 冪等性は `payload->partner->>thothPostId` の照合 + INSERT 後の最古行勝ち取り下げ（同時再送レース対策）
- 既存のセーフティ層（claim・冪等ガード・24h 上限 `post-safety.ts`）はそのまま適用される
- 実装: `src/lib/thoth-partner.ts` / `src/app/api/v1/**` / cron 通知は `src/app/api/cron/route.ts`
