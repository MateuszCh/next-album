import { redirect } from 'next/navigation';

/** Logging in moved to Konto (the guest tab of /account); keep old links working. */
export default function LoginPage() {
    redirect('/account');
}
