import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'next-album — what should you listen to?',
    description: 'A random album to listen to, picked based on your Last.fm profile.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
