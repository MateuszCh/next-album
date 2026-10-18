'use client';

import { useRouter } from 'next/navigation';
import { AlbumThumb, itemKey } from '@/components/AlbumThumb';
import { useAppData } from '@/components/AppDataProvider';
import { StarIcon } from '@/components/Icons';
import { TilesSkeleton } from '@/components/Skeleton';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { countLabel } from '@/lib/i18n';

/** Ulubione: the saved albums as a cover grid; a cover re-opens it on Losuj. */
export default function SavedPage() {
    const { t, lang } = useI18n();
    const { skin } = useTheme();
    const { dataReady, saved, showAlbum, removeSaved } = useAppData();
    const router = useRouter();

    return (
        <div className="screen">
            <header className="screen-head">
                <h1 className="screen-title">{t('nav.saved')}</h1>
                {saved.length > 0 && (
                    <span className="screen-count">
                        {countLabel(t, lang, 'count.albums', saved.length)}
                    </span>
                )}
            </header>

            {!dataReady ? (
                <TilesSkeleton />
            ) : (
                <>
                    {saved.length === 0 ? (
                        <p className="screen-empty">{t('saved.empty')}</p>
                    ) : (
                        <ul className="tiles">
                            {saved.map((album) => (
                                <li key={itemKey(album)} className="tile">
                                    <button
                                        type="button"
                                        className="tile__open"
                                        onClick={() => {
                                            showAlbum(album);
                                            router.push('/');
                                        }}
                                    >
                                        <span className="tile__art">
                                            <AlbumThumb album={album} />
                                        </span>
                                        <span className="tile__meta">
                                            <span className="tile__name">{album.name}</span>
                                            <span className="tile__sub">
                                                {album.artist}
                                                {album.year ? ` · ${album.year}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="tile__remove"
                                        onClick={() => removeSaved(album)}
                                        aria-label={t('saved.remove', { name: album.name })}
                                        title={t('saved.remove', { name: album.name })}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="screen-hint">
                        <StarIcon size={20} strokeWidth={1.8} />
                        {t(skin === 'tuner' ? 'saved.hintTuner' : 'saved.hint')}
                    </p>
                </>
            )}
        </div>
    );
}
