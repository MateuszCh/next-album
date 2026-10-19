import { ImageResponse } from 'next/og';

// The Apple touch icon, one for every skin. It must be raster and opaque (iOS
// renders transparency as black) and iOS applies its own rounded mask, so it is
// `icon.svg`'s artwork full-bleed, without the tile's corners, on the same
// 32-unit geometry. Prerendered at build time.
export const size = { width: 180, height: 180 };

export const contentType = 'image/png';

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', background: '#141216' }}>
                <svg width={size.width} height={size.height} viewBox="0 0 32 32">
                    {/* Coral disc with a faint record groove and the dark Next mark. */}
                    <circle cx="16" cy="16" r="12.5" fill="#ff7a59" />
                    <circle
                        cx="16"
                        cy="16"
                        r="9.6"
                        fill="none"
                        stroke="#1f0d07"
                        strokeOpacity="0.22"
                        strokeWidth="1"
                    />
                    <path d="M10.6 11v10l7.6-5z" fill="#1f0d07" />
                    <rect x="19.1" y="11" width="2.6" height="10" rx="1.3" fill="#1f0d07" />
                </svg>
            </div>
        ),
        size,
    );
}
