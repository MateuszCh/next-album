import { ImageResponse } from 'next/og';

// Apple touch icons must be raster — render the brand "play" mark as a 180×180 PNG.
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
                    background: '#e8821a',
                }}
            >
                <svg width="100" height="100" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 10.5 L22 16 L13 21.5 Z" fill="#1a1206" />
                </svg>
            </div>
        ),
        size,
    );
}
