// 開発週報 2026-06-09〜06-12（聴くtoノート＋Xpresso）を生成する。
// 実行: node scripts/create-weekly-report-20260612.js（x-buzz-tool ルートで）
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

function subtotal(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 20, bold: true, color: '4F46E5', font: 'Arial' })],
  });
}

function workTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 5760, 1800],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('区分', 1800, '4F46E5', 'FFFFFF', true),
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

function totalCell(text, fill, color, size, bold) {
  return new TableCell({
    borders: headerBorders,
    width: { size: 3120, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 160, bottom: 160, left: 160, right: 160 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, size, bold, color, font: 'Arial' })] })],
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
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
            children: [new TextRun({ text: '開発週報（聴くtoノート／Xpresso）', size: 20, color: '4F46E5', font: 'Arial' })],
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
        children: [new TextRun({ text: '開発週報', bold: true, size: 48, color: '4F46E5', font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: '2026年6月9日（火）〜 6月12日（金）', size: 24, color: '64748b', font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: '作成日：2026年6月12日', size: 20, color: '94a3b8', font: 'Arial' })],
      }),

      // ── サマリー ───────────────────────────
      h1('概要サマリー'),
      summaryTable([
        ['期間',         '2026年6月9日（火）〜 6月12日（金）'],
        ['対象プロジェクト', '聴くtoノート（議事録アプリ）／ Xpresso（SNS運用支援ツール）'],
        ['合計工数目安', '約33.5時間（聴くtoノート 約29時間／Xpresso 約4.5時間）'],
        ['今週のトピック', '聴くtoノート：4日間で骨格〜主要機能一式（端末内文字起こし・AI議事録・リアルタイム表示）を実装'],
        ['リポジトリ',   'github.com/SheepYokoyama/kaiwa_log ／ github.com/SheepYokoyama/x-buzz-tool'],
      ]),
      gap(240),

      // ════════════════════════════════════════
      h1('1. 聴くtoノート（議事録アプリ・新規開発）'),
      p('録音した会話を端末内で文字起こしし、AIで議事録に整形するスマホアプリ（Android/iOS・Flutter製）。音声を外部に送らない設計が特徴。今週火曜にゼロから開発を開始し、4日間で主要機能が一通り動く状態まで到達。'),
      gap(120),

      h2('6月9日（火）— 方針決定・アプリの骨格'),
      workTable([
        ['設計',     'iPhone優先・Flutter採用の方針決定。設計書・実装計画の作成（文字起こしエンジン選定含む）', '約2時間'],
        ['基盤実装', '録音 → 文字起こし → 保存 → 一覧表示の骨格（たたき台）を実装', '約4時間'],
        ['動作確認', 'Androidエミュレータのビルド問題を解消し、実動作を確認', '約1時間'],
      ]),
      subtotal('小計：約7時間'),
      gap(160),

      h2('6月10日（水）— 文字起こしの本実装と機能ラッシュ'),
      workTable([
        ['音声認識', '端末内文字起こしエンジン（sherpa-onnx／SenseVoice）を統合。日本語認識を実機確認', '約2時間'],
        ['長時間対応', '発話区間の自動分割＋バックグラウンド処理で長尺録音に対応（進捗表示・中断再開つき）', '約2時間'],
        ['モデル配信', '認識モデル（約228MB）のアプリ内ダウンロード＋展開を実装', '約1.5時間'],
        ['データ基盤', '保存方式をSQLiteデータベースへ移行', '約1時間'],
        ['機能追加',  'テキスト編集／AI議事録生成（Gemini・キー持ち込み式）／文字起こしへのQ&A／フォルダ整理／音声再生（文字と同期）／エクスポート・共有', '約2.5時間'],
      ]),
      subtotal('小計：約9時間'),
      gap(160),

      h2('6月11日（木）— 仕上げ機能と目玉のリアルタイム表示'),
      workTable([
        ['通知・外観', '録音リマインダー（ローカル通知）、アプリアイコン設定とテーマ統一', '約2時間'],
        ['不具合対応', 'モデル展開時のクラッシュ修正、エミュレータのマイク無音問題の解明', '約2時間'],
        ['単語帳ほか', '音声認識の補正用単語帳（CSVインポート対応）、録音の削除機能', '約2時間'],
        ['小粒改善5点', 'アプリ表示名／通知タップで録音画面／議事録のMarkdown表示／CSVのShift-JIS対応／Wi-Fi自動判定', '約1.5時間'],
        ['リアルタイム文字起こし', '録音と同時に文字が画面に出る逐次テキスト化（目玉機能）。アプリ名を「聴くtoノート」に決定しロゴ反映', '約2.5時間'],
      ]),
      subtotal('小計：約10時間'),
      gap(160),

      h2('6月12日（金）— ロゴ確定とフォルダ整理の完成'),
      workTable([
        ['ロゴ・公開', '新ロゴ（白背景版）の透過処理と反映、GitHubへのプッシュ', '約1時間'],
        ['フォルダ整理', '未分類タブ・フォルダのドラッグ並び替え・件数バッジを実装（テスト108件・実機確認込み）', '約2時間'],
      ]),
      subtotal('小計：約3時間'),
      gap(240),

      // ════════════════════════════════════════
      h1('2. Xpresso（SNS運用支援ツール・保守改善）'),
      p('運用ガイドの刷新と不具合対応を実施。'),
      gap(120),

      h2('6月9日（火）夜 〜 6月10日（水）'),
      workTable([
        ['ガイド刷新', 'X（旧Twitter）API取得マニュアルを最新の開発者ポータルの流れに全面更新＋画面模式図を追加', '約2時間'],
        ['ガイド刷新', 'Threads API取得マニュアルを最新のアプリ作成フローに刷新。「登録方法」リンクの導線改善', '約1.5時間'],
        ['不具合修正', 'Threadsツリー投稿の2件目以降で発生する「Media Not Found」エラーに対応', '約1時間'],
      ]),
      subtotal('小計：約4.5時間'),
      gap(240),

      // ── 今週の合計 ─────────────────────────
      h1('今週の合計'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              totalCell('聴くtoノート', '4F46E5', 'FFFFFF', 24, true),
              totalCell('Xpresso', '4F46E5', 'FFFFFF', 24, true),
              totalCell('合計', '4F46E5', 'FFFFFF', 24, true),
            ],
          }),
          new TableRow({
            children: [
              totalCell('約29時間', 'EEF2FF', '4F46E5', 28, true),
              totalCell('約4.5時間', 'EEF2FF', '4F46E5', 28, true),
              totalCell('約33.5時間', 'EEF2FF', '4F46E5', 28, true),
            ],
          }),
        ],
      }),
      gap(240),

      // ── 来週の予定 ─────────────────────────
      h1('来週以降の予定'),
      h3('聴くtoノート'),
      bullet('AI整形プロバイダの追加（Claude／GPT。共通インターフェース実装済みで追加しやすい構造）'),
      bullet('PDF出力・フォルダ単位の一括エクスポート'),
      bullet('新アプリアイコン（ランチャー）の反映'),
      bullet('iOS実機テスト（Mac環境が使えるタイミングで実施）'),
      gap(80),
      h3('Xpresso'),
      bullet('運用中の不具合対応・ガイド拡充（発生ベースで随時）'),
      gap(80),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('週報_20260612.docx', buffer);
  console.log('作成完了: 週報_20260612.docx');
});
