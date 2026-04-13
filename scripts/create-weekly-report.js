const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, ExternalHyperlink, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: '4F46E5' };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };
const cellMargin = { top: 100, bottom: 100, left: 160, right: 160 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: '4F46E5', font: 'Arial' })],
  });
}

function h2(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: '1e293b', font: 'Arial' })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e2e8f0' } },
    children: [new TextRun({ text, bold: true, size: 24, color: '334155', font: 'Arial' })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial', bold })],
  });
}

function gap(size = 120) {
  return new Paragraph({ spacing: { before: size, after: 0 }, children: [new TextRun('')] });
}

function workTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 5760, 1800],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('日付', 1800, '4F46E5', 'FFFFFF', true),
          cell('作業内容', 5760, '4F46E5', 'FFFFFF', true),
          cell('工数目安', 1800, '4F46E5', 'FFFFFF', true),
        ],
      }),
      ...rows.map(([date, content, hours], i) =>
        new TableRow({
          children: [
            cell(date, 1800, i % 2 === 0 ? 'F8F9FF' : 'FFFFFF'),
            cell(content, 5760, i % 2 === 0 ? 'F8F9FF' : 'FFFFFF'),
            cell(hours, 1800, i % 2 === 0 ? 'F8F9FF' : 'FFFFFF', '4F46E5'),
          ],
        })
      ),
    ],
  });
}

function cell(text, width, fill, color = '1e293b', bold = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargin,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20, font: 'Arial', bold, color })],
      }),
    ],
  });
}

function summaryTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'EEF2FF' : 'F8F9FF', type: ShadingType.CLEAR },
            margins: cellMargin,
            children: [new Paragraph({ children: [new TextRun({ text: label, size: 22, font: 'Arial', bold: true, color: '334155' })] })],
          }),
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F8F9FF', type: ShadingType.CLEAR },
            margins: cellMargin,
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 22, font: 'Arial', color: '1e293b' })] })],
          }),
        ],
      })
    ),
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } },
        }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '4F46E5' } },
            spacing: { after: 120 },
            children: [new TextRun({ text: 'Xpresso 開発週報', size: 20, color: '4F46E5', font: 'Arial' })],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e2e8f0' } },
            children: [
              new TextRun({ text: '社外秘　', size: 18, color: '94a3b8', font: 'Arial' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '94a3b8', font: 'Arial' }),
            ],
          }),
        ],
      }),
    },
    children: [

      // ── タイトル ───────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: 'Xpresso 開発週報', bold: true, size: 48, color: '4F46E5', font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: '2026年4月7日（火）〜 4月10日（金）', size: 24, color: '64748b', font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: '作成日：2026年4月10日', size: 20, color: '94a3b8', font: 'Arial' })],
      }),

      // ── サマリー ───────────────────────────
      h1('概要サマリー'),
      summaryTable([
        ['期間',         '2026年4月7日（火）〜 4月10日（金）'],
        ['合計工数目安', '約21.5時間'],
        ['デモ環境URL',  'https://xpresso-chi.vercel.app'],
        ['リポジトリ',   'https://github.com/SheepYokoyama/x-buzz-tool'],
        ['技術スタック', 'Next.js 16 / TypeScript / Tailwind CSS v4 / Supabase / Vercel'],
      ]),
      gap(240),

      // ── デモ環境 ───────────────────────────
      h1('デモ環境'),
      p('以下のURLより実際にお試しいただけます。'),
      gap(80),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({ text: 'デモURL：', size: 22, bold: true, font: 'Arial' }),
          new ExternalHyperlink({
            link: 'https://xpresso-chi.vercel.app',
            children: [new TextRun({ text: 'https://xpresso-chi.vercel.app', size: 22, color: '4F46E5', underline: {}, font: 'Arial' })],
          }),
        ],
      }),
      gap(80),
      p('主な確認ポイント：'),
      bullet('AI投稿生成（テーマ入力 → 生成 → 編集・下書き保存）'),
      bullet('ペルソナ切り替えによる文体変化'),
      bullet('予約投稿の登録・一覧'),
      bullet('リライト機能（ペルソナ反映 / X向け要約）'),
      bullet('Xアカウント管理（/x-accounts）'),
      gap(240),

      // ── 日別作業内容 ───────────────────────
      h1('日別作業内容'),

      // 4/8
      h2('4月7日（火）'),
      h3('Claude Code 環境整備 ＋ ツール骨子作成'),
      workTable([
        ['環境整備', 'Claude Code（AI駆動開発ツール）のセットアップと開発環境構築', '約2時間'],
        ['基盤構築', 'Next.js 16.2.2 / TypeScript / Tailwind CSS v4 / Supabaseを用いたプロジェクト基盤構築', '約2時間'],
        ['UIデザイン', 'グラスモーフィズムUIデザインシステムの実装（カラーテーマ・コンポーネント設計）', '約1時間'],
        ['画面骨子',  'ダッシュボード・AI投稿生成・予約投稿・投稿履歴・ペルソナ・ノート・リライト・ガイドの骨子作成', '約1時間'],
      ]),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: '小計：約6時間', size: 20, bold: true, color: '4F46E5', font: 'Arial' })],
      }),
      gap(160),

      // 4/9
      h2('4月8日（水）〜 4月9日（木）'),
      h3('AI生成・X API連携・各種機能実装'),
      workTable([
        ['AIプロバイダー選択', 'Gemini / Anthropic の切り替え機能実装（gemini-2.5-flash / claude-haiku-3-5）', '約1.5時間'],
        ['設定モーダル',      '⚙️ボタンからAIプロバイダー変更できる設定モーダルUIを実装', '約1.5時間'],
        ['ペルソナ管理',      'ペルソナのCRUD実装・サイドバーへのアクティブペルソナ表示', '約1時間'],
        ['リライト機能',      'リライトの実API化（Gemini/Anthropic対応・ペルソナ反映・X向け140文字要約）', '約1.5時間'],
        ['テキスト入力改善',  'VoiceTextarea にクリップボードペーストボタンを追加', '約20分'],
        ['X API連携基盤',     'twitter-api-v2を用いた投稿・インプレッション取得・ユーザー情報取得APIルートを作成', '約1.5時間'],
        ['サイドバー連携表示', 'X連携アカウント情報（名前・@ユーザー名・連携インジケーター）をサイドバーに表示', '約30分'],
        ['Gitコミット',       '全変更をコミット（24ファイル変更・+1253/-236行）', '約10分'],
      ]),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: '小計：約7.5時間', size: 20, bold: true, color: '4F46E5', font: 'Arial' })],
      }),
      gap(160),

      // 4/10
      h2('4月10日（金）'),
      h3('X準拠文字カウント・Xアカウント管理・Vercelデプロイ'),
      workTable([
        ['X準拠文字カウント', '全角2・半角1カウントをUI全体に適用（投稿生成・下書き・カードすべて）', '約1時間'],
        ['プラン別文字数制限', '無料280 / ベーシック4,000 / プレミアム25,000 cntに自動対応', '約30分'],
        ['生成カード編集・削除', '冒頭フック・本文・CTAをインライン編集・個別削除できるUIを実装', '約1時間'],
        ['下書き管理',         '投稿履歴に「下書き」タブを追加。AI生成後の保存済み下書きを一覧表示', '約1時間'],
        ['Xアカウント管理',    '複数Xアカウントをカード形式で管理。AES-256-CBC暗号化でトークンをDB保存。アカウント切り替えでサイドバー即時反映', '約3時間'],
        ['Vercelデプロイ',     'GitHub連携による自動デプロイ環境を構築。環境変数設定・cronジョブ設定', '約30分'],
        ['バグ修正',           'UUID型エラー・RLS権限問題・暗号化キー不一致の診断と解消', '約1時間'],
      ]),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: '小計：約8時間', size: 20, bold: true, color: '4F46E5', font: 'Arial' })],
      }),
      gap(240),

      // ── 今週の合計 ─────────────────────────
      h1('今週の合計'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: headerBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: '4F46E5', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4/7（火）', size: 24, bold: true, color: 'FFFFFF', font: 'Arial' })] })],
              }),
              new TableCell({
                borders: headerBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: '4F46E5', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4/8〜9（水・木）', size: 24, bold: true, color: 'FFFFFF', font: 'Arial' })] })],
              }),
              new TableCell({
                borders: headerBorders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: '4F46E5', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '4/10（金）', size: 24, bold: true, color: 'FFFFFF', font: 'Arial' })] })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '約6時間', size: 28, bold: true, color: '4F46E5', font: 'Arial' })] })],
              }),
              new TableCell({
                borders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '約7.5時間', size: 28, bold: true, color: '4F46E5', font: 'Arial' })] })],
              }),
              new TableCell({
                borders,
                width: { size: 3120, type: WidthType.DXA },
                shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 160, right: 160 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '約8時間', size: 28, bold: true, color: '4F46E5', font: 'Arial' })] })],
              }),
            ],
          }),
        ],
      }),
      gap(160),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: '週合計：約21.5時間', size: 26, bold: true, color: '4F46E5', font: 'Arial' })],
      }),
      gap(240),

      // ── 来週の予定 ─────────────────────────
      h1('来週以降の予定'),
      bullet('画像添付投稿機能（X API v1.1 メディアアップロード）'),
      bullet('Supabase Auth によるログイン機能'),
      bullet('投稿パフォーマンス分析ダッシュボード強化'),
      bullet('スレッド投稿対応'),
      gap(80),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('週報_Xpresso_20260410.docx', buffer);
  console.log('作成完了: 週報_Xpresso_20260410.docx');
});
