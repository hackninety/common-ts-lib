/** 古图分支：图像元数据同步；文件本体在包内 assets/images/<file> */
import imagesRaw from './data/images.json';
import type { ImageCollection, ImageMeta } from './types';

const data = imagesRaw as { collections: Record<string, ImageCollection>; images: ImageMeta[] };

/** 画集（版本）登记：蒋应镐本/胡文焕本/汪绂本/图书集成/怪奇鳥獣図巻… */
export function getCollections(): Record<string, ImageCollection> {
  return data.collections;
}

/** 全部图像元数据 */
export function getImages(): ImageMeta[] {
  return data.images;
}

export function getImage(id: string): ImageMeta | undefined {
  return data.images.find((i) => i.id === id);
}

/** 某实体的全部图像（按画集年代序原样返回） */
export function getImagesByEntity(entityId: string): ImageMeta[] {
  return data.images.filter((i) => i.entity === entityId);
}

/** 某画集的全部图像 */
export function getImagesByCollection(collection: string): ImageMeta[] {
  return data.images.filter((i) => i.collection === collection);
}

/**
 * 拼图像 URL。宿主把包内 `assets/images/` 整目录拷到静态目录后，
 * 以该静态前缀为 base：`imageUrl(img, '/shj-images')`。
 * Vite 亦可直接 `new URL('shj-ts-lib/assets/images/'+img.file, import.meta.url)`。
 */
export function imageUrl(img: ImageMeta, base: string): string {
  return `${base.replace(/\/$/, '')}/${img.file}`;
}
