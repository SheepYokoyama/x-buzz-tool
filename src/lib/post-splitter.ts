import { countXChars } from './x-char-count';

// ─────────────────────────────────────────────────────────────
// 長文を X(Twitter) のカウント制限に収まる複数ポストへ分割する
//
// 参考: https://zenn.dev/saka1/articles/ed78d79ce3e030
//
// 動的計画法で「段落 > 文 > 文字」の優先順位で分割点を選び、
// 各ポストの充填率が低いほどペナルティを与えて自然な分割を行う。
// URL / メンション / ハッシュタグ の途中では分割しない。
// ─────────────────────────────────────────────────────────────

export type SplitMode = 'thread' | 'separate';

export type SplitLevel = 'paragraph' | 'sentence' | 'char';

export interface SplitPoint {
  /** テキスト上のオフセット（文字単位） */
  index: number;
  /** 分割レベル（コストに影響） */
  level: SplitLevel;
}

export interface PostChunk {
  /** 本文（番号プレフィクスなし） */
  text: string;
  /** X 準拠カウント（全角2・半角1） */
  charCount: number;
  /** 元テキスト上の開始オフセット */
  start: number;
  /** 元テキスト上の終了オフセット（exclusive） */
  end: number;
}

export interface SplitOptions {
  /** 1 ポストあたりの最大カウント。既定 280（X 無料 = 全角140字相当） */
  maxCount?: number;
  /** 番号プレフィクスを自動付与するか（例: "1/5 "）。既定 false */
  numbering?: boolean;
}

export interface SplitResult {
  chunks: PostChunk[];
  /** 分割後の合計カウント（番号付きの場合は番号込み） */
  totalCount: number;
  /** 上限超過などのエラー（分割不能な連続テキストがある場合など） */
  error?: string;
}

// ── 分割禁止範囲の抽出 ───────────────────────────────────────
// URL / メンション / ハッシュタグは内部分割を禁止する

const PROTECTED_REGEX = /(https?:\/\/[^\s]+)|(@[A-Za-z0-9_]{1,15})|(#[\p{L}\p{N}_]+)/gu;

function buildProtectedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const m of text.matchAll(PROTECTED_REGEX)) {
    if (m.index === undefined) continue;
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isInsideProtected(pos: number, ranges: Array<[number, number]>): boolean {
  // pos は「その位置で分割する（= pos の直前と直後を分ける）」という意味。
  // 保護範囲 [s, e) の内部（s < pos < e）に来た場合に禁止する。
  for (const [s, e] of ranges) {
    if (pos > s && pos < e) return true;
  }
  return false;
}

// ── 分割点の抽出 ─────────────────────────────────────────────

function collectSplitPoints(text: string): SplitPoint[] {
  const points: SplitPoint[] = [];
  const len = text.length;
  const protectedRanges = buildProtectedRanges(text);

  // 段落: 連続する改行の直後
  // 文: 「。！？!?」の直後
  // 文字: それ以外の全ての境界
  for (let i = 1; i < len; i++) {
    if (isInsideProtected(i, protectedRanges)) continue;

    const prev = text[i - 1];
    const prevPrev = i >= 2 ? text[i - 2] : '';

    // 段落区切り: 直前が改行
    if (prev === '\n') {
      // 2連続改行なら段落、1つなら文扱い
      const isParagraph = prevPrev === '\n' || i === 1;
      points.push({ index: i, level: isParagraph ? 'paragraph' : 'sentence' });
      continue;
    }

    // 文区切り
    if (prev === '。' || prev === '！' || prev === '？' || prev === '!' || prev === '?') {
      points.push({ index: i, level: 'sentence' });
      continue;
    }

    // 文字単位
    points.push({ index: i, level: 'char' });
  }
  return points;
}

// ── コスト関数 ───────────────────────────────────────────────

const LEVEL_COST: Record<SplitLevel, number> = {
  paragraph: 0,
  sentence: 2000,
  char: 10000,
};

function fillPenalty(used: number, max: number): number {
  if (used <= 0) return 1e9;
  const ratio = used / max;
  const deficit = 1 - ratio;
  // 低充填（短すぎる）ポストにペナルティ
  return deficit * deficit * deficit * 30000;
}

// ── prefix sum によるカウント計算 O(1) ──────────────────────

function buildPrefixCount(text: string): number[] {
  // prefix[i] = text[0..i) の X カウント
  const prefix = new Array<number>(text.length + 1);
  prefix[0] = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    prefix[i + 1] = prefix[i] + countXChars(ch);
  }
  return prefix;
}

function rangeCount(prefix: number[], start: number, end: number): number {
  return prefix[end] - prefix[start];
}

// ── メイン: 動的計画法で最適分割 ─────────────────────────────

export function splitPosts(text: string, options: SplitOptions = {}): SplitResult {
  const { maxCount = 280, numbering = false } = options;
  const trimmed = text.replace(/\s+$/g, '');
  if (!trimmed.trim()) {
    return { chunks: [], totalCount: 0 };
  }

  const prefix = buildPrefixCount(trimmed);
  const totalLen = trimmed.length;

  // 番号プレフィクスを使う場合は予算を確保。推定: 最大でも "10/10 " = 8 カウント分程度
  // 厳密には chunk 数確定後に再調整するが、ここでは粗い上限で十分
  const numberingReserve = numbering ? 8 : 0;
  const effectiveMax = Math.max(maxCount - numberingReserve, 20);

  // 分割候補点: 0（開始）と totalLen（終了）は必ず含む
  const points = collectSplitPoints(trimmed);
  const allPoints: SplitPoint[] = [
    { index: 0, level: 'paragraph' },
    ...points,
    { index: totalLen, level: 'paragraph' },
  ];

  const n = allPoints.length;
  // dp[i] = allPoints[0..i] まで到達する最小コスト, prev[i] = 直前のポイント index
  const dp = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
  const prevIdx = new Array<number>(n).fill(-1);
  dp[0] = 0;

  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(dp[i])) continue;
    for (let j = i + 1; j < n; j++) {
      const start = allPoints[i].index;
      const end = allPoints[j].index;
      const cnt = rangeCount(prefix, start, end);
      if (cnt > effectiveMax) break; // 以降はさらに長くなる一方
      if (cnt === 0) continue;

      const splitCost = LEVEL_COST[allPoints[j].level];
      const fill = fillPenalty(cnt, effectiveMax);
      // 最後の chunk（= j が終点）の充填率ペナルティは軽減
      const isLastChunk = j === n - 1;
      const cost = dp[i] + splitCost + (isLastChunk ? 0 : fill);

      if (cost < dp[j]) {
        dp[j] = cost;
        prevIdx[j] = i;
      }
    }
  }

  if (!Number.isFinite(dp[n - 1])) {
    // 到達不能 = 単一の連続列が上限超過（保護範囲により分割不可など）
    return {
      chunks: [],
      totalCount: 0,
      error: `1ポストに収まらない連続テキストがあります（${effectiveMax}カウント超）。URLや長い語を短くしてください。`,
    };
  }

  // 経路復元
  const path: number[] = [];
  for (let cur = n - 1; cur !== -1; cur = prevIdx[cur]) path.push(cur);
  path.reverse();

  const chunks: PostChunk[] = [];
  for (let k = 0; k + 1 < path.length; k++) {
    const start = allPoints[path[k]].index;
    const end = allPoints[path[k + 1]].index;
    const slice = trimmed.slice(start, end).replace(/^\s+|\s+$/g, '');
    if (!slice) continue;
    chunks.push({
      text: slice,
      charCount: countXChars(slice),
      start,
      end,
    });
  }

  // 番号プレフィクス付与
  if (numbering && chunks.length > 1) {
    const total = chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      const prefixStr = `${i + 1}/${total} `;
      const withPrefix = prefixStr + chunks[i].text;
      chunks[i] = {
        ...chunks[i],
        text: withPrefix,
        charCount: countXChars(withPrefix),
      };
    }
  }

  const totalCount = chunks.reduce((s, c) => s + c.charCount, 0);
  return { chunks, totalCount };
}
