import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-5 py-10">
      {!isSupabaseConfigured() ? (
        <ConfigWarning>
          Supabase is not configured. Login UI is available, but authentication
          requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </ConfigWarning>
      ) : null}
      <AuthForm mode="login" />
      <p className="text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          Sign up
        </Link>
      </p>
    </main>
  );
}
