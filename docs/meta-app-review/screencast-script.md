# Meta App Review — スクリーンキャスト台本（本番録画用）

録画先: 本番 `https://xpresso-chi.vercel.app`
構成: 1本の動画で **Threads → Instagram** を続けて撮影。各権限が「実際に使われている」様子を映す。

## 録画前チェック（撮り直し防止）

- [ ] 本番に Threads アカウントが連携済み（アカウント管理に表示される）
- [ ] 本番に Instagram プロアカウントが連携済み（同上）
- [ ] 投稿に使う画像を1枚用意（Instagram は画像必須）
- [ ] 録画ソフト準備（Windows: Xbox Game Bar `Win+G`、または OBS）
- [ ] **URLバーを常に画面内に**（本番URLが映ることが重要）
- [ ] 通知・個人情報が映る他タブを閉じる
- [ ] 画面言語は日本語のままでOK（英語ナレーション/字幕は不要。操作が見えればよい）

---

## 動画の全体像（目安 3〜5分）

| パート | 見せる権限 | 時間目安 |
|---|---|---|
| 0. ログイン | （前提） | 20秒 |
| 1. 連携アカウント確認 | `threads_basic` / `instagram_business_basic` | 30秒 |
| 2. Threads 単発投稿 | `threads_content_publish` | 60秒 |
| 3. Threads スレッド投稿 | `threads_manage_replies` | 60秒 |
| 4. Instagram 画像投稿 | `instagram_business_content_publish` | 60秒 |
| 5. 公開結果の確認 | （証跡） | 30秒 |

---

## パート別 台本（操作手順）

### 0. ログイン（20秒）
1. `https://xpresso-chi.vercel.app` を開く（URLバーが映る状態で）
2. 合言葉ゲートを通過 → Google ログイン → ダッシュボード表示
   - ※ ログイン情報入力は早送り/カット可。ただし「ログインして本人のダッシュボードに入る」流れは見せる

### 1. 連携アカウント確認（30秒）→ `threads_basic` / `instagram_business_basic`
1. ダッシュボード上部の識別カードを映す
2. **Threads カード**（紫）に表示名・@ユーザー名・アイコンが出ていることを見せる → `threads_basic` でプロフィール取得していることの証跡
3. **Instagram カード**（ピンク）に表示名・@ユーザー名・アイコンが出ていることを見せる → `instagram_business_basic` の証跡
4. （任意）「アカウント管理」を開いて連携状態を見せる

### 2. Threads 単発投稿（60秒）→ `threads_content_publish`
1. 「ポスト作成」を開く
2. 投稿先で **Threads のみ** を選択
3. 本文を入力（例: 短いテキスト1件分）
4. 右側プレビューに反映されることを見せる
5. 「投稿」をクリック → 成功表示
6. （次パートのため画面はそのまま）

### 3. Threads スレッド投稿（60秒）→ `threads_manage_replies`
1. 同じ「ポスト作成」で、**1投稿に収まらない長文**を入力（自動でスレッド分割される）
2. プレビューで複数ポストに分割＆連結（返信）されることを見せる
3. 「投稿」をクリック → 1件目投稿 → 2件目以降が**返信として連結投稿**される様子・成功表示
   - ※ これが `threads_manage_replies`（reply_to_id で返信作成）の証跡

### 4. Instagram 画像投稿（60秒）→ `instagram_business_content_publish`
1. 「ポスト作成」で投稿先を **Instagram のみ** に切替
2. キャプションを入力
3. **画像を1枚添付**（Instagram は画像必須）
4. Instagram プレビュー（フィード風）に反映を見せる
5. 「投稿」をクリック → 成功表示

### 5. 公開結果の確認（30秒）→ 証跡
1. 別タブで実際の **Threads** を開き、たった今投稿した単発＋スレッドが公開されていることを見せる
2. 別タブで実際の **Instagram** を開き、画像投稿が公開されていることを見せる
   - ※ 「本当に本人アカウントに公開された」ことの最終証跡。審査員はここを重視

---

## 提出時メモ（Test Instructions 欄に書く想定）

### 審査員への渡し方（推奨方法）
**方針: スクリーンキャストを主証拠とし、テストアクセス情報は補助として提出メモに添える。**
理由: 本アプリはトークン手動登録方式（審査員が自分のアカウントを繋ぐ運用ではない）ため、動画で実動作を示すのが最も確実。ログイン情報は審査員が念のため自分で触れるよう添える。

提出前に用意するもの:
- [ ] **合言葉**（ゲート通過用パスフレーズ）
- [ ] **テスト用 Google アカウント**（email + password）
  - **2FA を OFF**にしておく（海外/別デバイスからのログインで Google の確認が入り審査員が弾かれるのを防ぐ）
  - 可能なら、そのアカウントで事前に Xpresso にログインし **Threads / Instagram を連携済み**にしておく（審査員がそのまま投稿を再現できる）
- ※ Instructions 欄は審査員のみ閲覧（非公開）なので、合言葉・パスワードを平文で書いてよい。審査通過後に合言葉をローテーションしたい場合は対応する。

### Instructions for reviewers（英文・そのまま貼る）

> This app connects a user's own Threads/Instagram account via a long-lived access token the user generates from Meta's token tools (manual token registration), not an in-app OAuth redirect. **The attached screencast demonstrates the complete flow** on production (https://xpresso-chi.vercel.app): viewing the connected account (threads_basic / instagram_business_basic), publishing a single post and a multi-part thread to the user's own Threads account (threads_content_publish / threads_manage_replies), and publishing an image post to the user's own Instagram professional account (instagram_business_content_publish). Each published post is then shown live on the respective platform.
>
> To reproduce yourself:
> 1. Open https://xpresso-chi.vercel.app
> 2. Enter the shared passphrase: 〔合言葉〕
> 3. Sign in with the test Google account — email: 〔email〕 / password: 〔password〕
> 4. The Threads and Instagram accounts are already connected. Open "ポスト作成" (Post create), choose a platform, write content (attach an image for Instagram), and click post.
>
> Note: the test Google account has 2FA disabled for review access.

---

## 注意・ハマりどころ

- **NGな撮り方**: 投稿ボタンを押す前後をカットして「成功画面だけ」見せる → 審査員に「本当に投稿した?」と疑われる。**ボタン押下→処理→成功→実際の公開ページ**まで一連で見せる
- BAN回避のソフトリミット表示が出ても無視でOK（投稿自体は可能）
- 万一どこかで失敗したら、その権限だけ撮り直し。動画は権限ごとに分けて提出することも可能
