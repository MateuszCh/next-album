'use client';

import { useTheme } from '@/components/ThemeProvider';

/** The wordmark: `next·album` in Okładka, `NEXT ALBUM [HI-FI]` on the Tuner faceplate. */
export function Logo() {
    const { skin } = useTheme();

    if (skin === 'tuner') {
        return (
            <span className="logo logo--tuner">
                Next Album <span className="logo__badge">Hi-Fi</span>
            </span>
        );
    }

    return (
        <span className="logo">
            next<span className="logo__dot">·</span>album
        </span>
    );
}
