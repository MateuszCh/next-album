import { AppDataProvider } from '@/components/AppDataProvider';
import { BottomNav } from '@/components/BottomNav';

/** The four tabs (Losuj, Historia, Ulubione, Konto) share the app data and the bottom nav. */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppDataProvider>
            <div className="app">
                <main className="app-main">{children}</main>
                <BottomNav />
            </div>
        </AppDataProvider>
    );
}
