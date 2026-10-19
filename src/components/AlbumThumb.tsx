import { canonicalLastfmImage } from '@/lib/coverUrl';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

/**
 * A list/grid cover: the native image (300px, already rendered by the CDN, so it
 * loads at once — a cold upscaled variant per tile would take seconds), lazy-loaded,
 * or ♪ without art.
 */
export function AlbumThumb({ album }: { album: AlbumRecommendation }) {
    return album.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={canonicalLastfmImage(album.imageUrl)} alt="" loading="lazy" />
    ) : (
        <span className="thumb-placeholder" aria-hidden>
            ♪
        </span>
    );
}

// React key: the raw name pair. History stored before keys were normalized can
// hold two editions of one album, which would collide on `albumKey`.
export function itemKey(album: AlbumRecommendation): string {
    return `${album.artist}::${album.name}`.toLowerCase();
}
