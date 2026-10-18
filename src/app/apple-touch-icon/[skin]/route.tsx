import { ImageResponse } from 'next/og';
import { SKINS, type Skin } from '@/lib/skin';

// Apple touch icons, one per skin (`layout.tsx` links the saved skin's). They
// must be raster and opaque (iOS renders transparency as black) and iOS applies
// its own rounded mask, so each is its favicon's artwork full-bleed, without
// the tile's corners or frame, on the same 32-unit geometry. iOS keeps the icon
// it reads when the shortcut is added.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
    return SKINS.map((skin) => ({ skin }));
}

const SIZE = 180;

const ARTWORK: Record<Skin, { background: string; mark: React.ReactNode[] }> = {
    // Coral disc with a faint record groove and a dark play.
    okladka: {
        background: '#141216',
        mark: [
            <circle key="disc" cx="16" cy="16" r="12.5" fill="#ff7a59" />,
            <circle
                key="groove"
                cx="16"
                cy="16"
                r="8.75"
                fill="none"
                stroke="#1f0d07"
                strokeOpacity="0.3"
                strokeWidth="1"
            />,
            <path key="play" d="M13.6 11.2v9.6l7.4-4.8z" fill="#1f0d07" />,
        ],
    },
    // Amber ring and play on the LCD black, with the red LED.
    tuner: {
        background: '#0d0c0a',
        mark: [
            <circle
                key="ring"
                cx="16"
                cy="16"
                r="9.5"
                fill="none"
                stroke="#ffb000"
                strokeWidth="3"
            />,
            <path key="play" d="M14 12v8l6.4-4z" fill="#ffb000" />,
            <circle key="led" cx="26.25" cy="5.75" r="2" fill="#e03e2e" />,
        ],
    },
};

export async function GET(_request: Request, { params }: { params: Promise<{ skin: string }> }) {
    const { skin } = await params;
    const art = ARTWORK[skin as Skin];
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    background: art.background,
                }}
            >
                <svg width={SIZE} height={SIZE} viewBox="0 0 32 32">
                    {art.mark}
                </svg>
            </div>
        ),
        { width: SIZE, height: SIZE },
    );
}
