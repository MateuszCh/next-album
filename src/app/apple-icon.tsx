import { ImageResponse } from 'next/og';

// Apple touch icons must be raster and opaque (iOS renders transparency as
// black) and iOS applies its own rounded mask, so this is the favicon's design
// (`icon.svg`) full-bleed: amber disc ring + play on the forest-green tile.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg, #2b8456 0%, #1c6641 100%)',
                }}
            >
                <svg width="180" height="180" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="18" fill="none" stroke="#ffb454" strokeWidth="4.6" />
                    <path
                        d="M27.5 23.5v17l14-8.5z"
                        fill="#ffb454"
                        stroke="#ffb454"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        ),
        size,
    );
}
