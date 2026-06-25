import { ImageResponse } from 'next/og';

// Apple touch icons must be raster (and opaque — iOS renders transparency as
// black), so the CD sits on the dark-theme background.
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
                    background: '#0d3321',
                }}
            >
                {/* CD disc */}
                <div
                    style={{
                        width: 124,
                        height: 124,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle at 44% 38%, #fdfefe 0%, #d3dae1 42%, #a9b2bd 72%, #ccd3da 100%)',
                        border: '1px solid rgba(0,0,0,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* hub ring */}
                    <div
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#eef2f5',
                            border: '1px solid rgba(0,0,0,0.14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {/* center hole */}
                        <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#0d3321' }} />
                    </div>
                </div>
            </div>
        ),
        size,
    );
}
