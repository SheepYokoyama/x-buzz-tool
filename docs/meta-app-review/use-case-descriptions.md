# Meta App Review — 用途説明文ドラフト

Xpresso の Meta App Review（権限申請）で、各権限の「How does your app use this permission?」欄に貼り付けるテキスト。
**申請欄には英語（English）を貼り付け**、日本語は内容確認用。

- アプリ概要（共通の前提）:
  Xpresso is a web tool that helps a logged-in user create, schedule, and manage posts to their **own** social media accounts (X, Threads, Instagram) that the user has explicitly connected. Posts are published only to accounts the user owns and has authorized. Xpresso never accesses other users' content.
- 連携方式: ユーザーが Meta のトークン生成ツールで発行した**長期アクセストークンを Xpresso に登録**する方式（manual token registration）。Xpresso 自身はトークンを暗号化保存し、ユーザー本人のアカウントへの投稿にのみ使用する。

---

## Threads

### threads_basic

**English (申請欄に貼る):**
> Xpresso uses `threads_basic` to read the connected user's own Threads profile (username and profile picture) right after the user registers their access token. This lets Xpresso (1) confirm the token is valid, and (2) display which Threads account is connected in the account-management screen and dashboard, so the user can confirm they are posting from the correct account. We only read the profile of the account the user has connected; we do not read other users' data.

**日本語（確認用）:**
> ユーザーが自分の Threads アクセストークンを登録した直後に、本人の Threads プロフィール（ユーザー名・アイコン）を取得します。目的は (1) トークンの有効性確認、(2) アカウント管理画面・ダッシュボードに「連携中のアカウント」を表示し、正しいアカウントから投稿することをユーザー本人が確認できるようにするため。取得するのは本人の連携アカウントのみ。

### threads_content_publish

**English:**
> Xpresso uses `threads_content_publish` to publish posts (text and optional images) to the user's own connected Threads account, on the user's explicit action. The user writes or AI-generates post content in Xpresso, reviews it, and clicks "post" (or schedules it). Xpresso then creates a media container and publishes it to the user's own Threads account via the Threads API. Single posts and image posts (single image or carousel) are supported. Publishing only happens to the account the user connected and only when the user initiates it.

**日本語:**
> ユーザー本人の操作に基づき、本人の連携 Threads アカウントへ投稿（テキスト＋任意で画像）を公開します。ユーザーが Xpresso 上で本文を作成（または AI 生成）→ 確認 → 「投稿」または「予約」を実行すると、Threads API でメディアコンテナを作成し本人のアカウントに公開します。単体投稿・画像投稿（単一/カルーセル）に対応。投稿先は本人の連携アカウントのみ・本人の起動時のみ。

### threads_manage_replies

**English:**
> Xpresso uses `threads_manage_replies` to publish threaded posts ("trees"). When a user's content is longer than a single Threads post, Xpresso splits it into multiple posts and publishes the first one, then publishes each subsequent post as a reply to the previous post under the user's own account, forming a connected thread. This permission is required to create reply posts (reply_to_id). It is used only on the user's own account and only when the user chooses to post a multi-part thread.

**日本語:**
> ツリー投稿（スレッド）を公開するために使用。本文が1投稿に収まらない場合、Xpresso が複数に分割して1件目を投稿し、2件目以降を直前の投稿への返信として本人アカウントに連結投稿します。返信投稿（reply_to_id）の作成にこの権限が必須。本人アカウントのみ・本人がツリー投稿を選んだ時のみ使用。

---

## Instagram

### instagram_business_basic

**English:**
> Xpresso uses `instagram_business_basic` to read the connected user's own Instagram professional account profile (username and profile picture) after the user registers their access token. This lets Xpresso (1) confirm the token is valid and (2) display the connected Instagram account in the account-management screen and dashboard so the user can confirm the correct posting account. Only the user's own connected account is read.

**日本語:**
> ユーザーが自分の Instagram アクセストークンを登録した後、本人の Instagram プロアカウントのプロフィール（ユーザー名・アイコン）を取得。目的は (1) トークン有効性確認、(2) アカウント管理画面・ダッシュボードに連携アカウントを表示し、正しい投稿先を本人が確認できるようにするため。取得は本人の連携アカウントのみ。

### instagram_business_content_publish

**English:**
> Xpresso uses `instagram_business_content_publish` to publish image posts to the user's own connected Instagram professional account, on the user's explicit action. The user prepares a caption (typed or AI-generated) and attaches one or more images in Xpresso, reviews the result, and clicks "post" (or schedules it). Xpresso uploads the image(s) to a temporary public URL, creates a media container (single image, or a carousel for 2–10 images) and publishes it to the user's own Instagram account via the API, then removes the temporary file. Publishing only happens to the connected account and only when the user initiates it.

**日本語:**
> ユーザー本人の操作で、本人の連携 Instagram プロアカウントへ画像投稿を公開。ユーザーがキャプション（手入力 or AI 生成）と画像を用意 → 確認 → 「投稿」または「予約」を実行すると、画像を一時的な公開URLにアップロードしメディアコンテナ（単一画像、または2〜10枚のカルーセル）を作成して本人アカウントに公開、その後一時ファイルを削除します。投稿先は連携アカウントのみ・本人起動時のみ。

---

## 審査員向けテスト手順（Screencast / Test instructions の下書き）

**English:**
> Note: Xpresso connects a Threads/Instagram account by having the user register a long-lived access token generated from Meta's token tools (manual token registration), rather than an in-app OAuth redirect. The screencast demonstrates the full publishing flow.
>
> 1. Log in to Xpresso (test credentials provided separately) at https://xpresso-chi.vercel.app
> 2. Go to "Account management" and confirm the connected Threads/Instagram account is shown (username + profile picture) — demonstrates `threads_basic` / `instagram_business_basic`.
> 3. Open "Post create", type post content (and attach an image for Instagram), and review the preview.
> 4. Click "Post" to publish to the connected account — demonstrates `threads_content_publish` / `instagram_business_content_publish`.
> 5. For Threads, enter content longer than one post so it is split into a thread; the follow-up posts are published as replies — demonstrates `threads_manage_replies`.
> 6. Show the published post(s) live on the Threads/Instagram account.

**日本語:**
> 注: Xpresso は Meta のトークン生成ツールで発行した長期トークンを登録する方式（アプリ内OAuthリダイレクトではない）。スクリーンキャストで投稿フロー全体を見せる。
>
> 1. Xpresso にログイン（テスト用認証情報は別途提供）— https://xpresso-chi.vercel.app
> 2. 「アカウント管理」で連携中の Threads/Instagram アカウント（ユーザー名＋アイコン）が表示されることを見せる → `threads_basic`/`instagram_business_basic`
> 3. 「ポスト作成」で本文入力（Instagram は画像添付）→ プレビュー確認
> 4. 「投稿」で連携アカウントに公開 → `threads_content_publish`/`instagram_business_content_publish`
> 5. Threads は1投稿に収まらない長さを入力しスレッド分割、後続が返信として投稿される → `threads_manage_replies`
> 6. 実際に Threads/Instagram 上で投稿が公開されたことを見せる

---

## チェックリスト

- [ ] 上記 English を各権限の用途説明欄に貼り付け
- [ ] テスト用ログイン情報（Google ログイン or 共通パスワード＋テストアカウント）を申請に添付
- [ ] スクリーンキャスト動画を録画（手順 1〜6）
- [ ] App を Live モードに切替（必要に応じて）
- [ ] ビジネス認証（Advanced Access に必要な場合）
