'use client';

import { useTheme } from '@/components/ThemeProvider';
import { SparkleIcon, Stripes } from '@/components/Icons';

/** The wordmark, set in each skin's own voice. Always live text, never an image. */
export function Logo() {
    const { skin } = useTheme();

    switch (skin) {
        case 'tuner':
            return (
                <span className="logo logo--tuner">
                    Next Album <span className="logo__badge">Hi-Fi</span>
                </span>
            );
        case 'kaseta':
            return (
                <span className="logo logo--kaseta">
                    <Stripes className="stripes--logo" />
                    Next Album
                </span>
            );
        case 'rave':
            return (
                <span className="logo logo--rave">
                    Next<span className="logo__dot">/</span>Album
                </span>
            );
        case 'ambient':
            return <span className="logo logo--ambient">next album</span>;
        case 'guma':
            return (
                <span className="logo logo--guma">
                    <SparkleIcon className="logo__spark" />
                    next album
                </span>
            );
        default:
            return (
                <span className="logo">
                    next<span className="logo__dot">·</span>album
                </span>
            );
    }
}
