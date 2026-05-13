import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SignupPage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-5 py-10">
      {!isSupabaseConfigured() ? (
        <ConfigWarning>
          Supabase is not configured. Signup UI is available, but account creation
          requires Supabase environment variables.
        </ConfigWarning>
      ) : null}
      <AuthForm mode="signup" />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </main>
  );
}
