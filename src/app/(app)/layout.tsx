import { cookies } from 'next/headers';
import { AppDataProvider, type Me } from '@/components/AppDataProvider';
import { BottomNav } from '@/components/BottomNav';
import { APP_MODE_COOKIE, parseAppMode } from '@/lib/appMode';
import { isGateEnabled } from '@/lib/gate';
import { getCurrentUser } from '@/lib/session';

/** The four tabs (Losuj, Historia, Ulubione, Konto) share the app data and the bottom nav. */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    // Seed the account from the session cookie (no upstream calls), so the first
    // paint already shows the right screen instead of waiting for `/api/me`.
    // The avatar and a Last.fm link made on another device arrive with `/api/me`.
    const user = await getCurrentUser();
    const gateEnabled = isGateEnabled();
    const initialMe: Me = user
        ? {
              loggedIn: true,
              lastfmUsername: user.lastfmUsername ?? null,
              email: user.email ?? null,
              imageUrl: null,
              gateEnabled,
          }
        : { loggedIn: false, gateEnabled };
    const initialMode = parseAppMode((await cookies()).get(APP_MODE_COOKIE)?.value);

    return (
        <AppDataProvider initialMe={initialMe} initialMode={initialMode}>
            <div className="app">
                <main className="app-main">{children}</main>
                <BottomNav />
            </div>
        </AppDataProvider>
    );
}
