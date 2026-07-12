/**
 * B 站视频索引子入口 —— `import { getVideoSeries, bilibiliUrl } from 'nhx-ts-lib/videos'`
 *
 * 倪海厦课程视频的 Bilibili 直链索引（6 系列 139 集：人纪五部 + 天纪）。
 * 底本为汉唐中医网（hantang.org.cn）视频页快照（docs/corpus/_videos/），
 * 索引轻量（约 12KB）随入口同步内联。本库仅收录链接与标题，不含视频内容。
 */
import data from './data/videos.json';

export interface VideoEpisode {
  /** 集序（标题尾号） */
  n: number;
  title: string;
  /** Bilibili BV 号 */
  bv: string;
}

export interface VideoSeries {
  id: string;
  title: string;
  /** 对应讲稿库书 slug（深链 docs 用） */
  book?: string;
  /** 来源采集页 */
  page: string;
  episodes: VideoEpisode[];
}

const store = data as unknown as { collectedAt: string; source: string; series: VideoSeries[] };

/** 全部视频系列（人纪五部 + 天纪） */
export function getVideoSeries(): VideoSeries[] {
  return store.series;
}

/** 按讲稿书 slug 取对应视频系列（如 'shanghan'） */
export function getVideoSeriesFor(bookSlug: string): VideoSeries | undefined {
  return store.series.find((s) => s.book === bookSlug || s.id === bookSlug);
}

/** BV 号 → Bilibili 播放页 URL */
export function bilibiliUrl(bv: string): string {
  return `https://www.bilibili.com/video/${bv}/`;
}

/** 采集信息（来源与日期） */
export function getVideoSourceInfo(): { collectedAt: string; source: string } {
  return { collectedAt: store.collectedAt, source: store.source };
}
