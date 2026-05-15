"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAuth();
  }

  async function submitAuth() {
    setMessage(null);
    setMessageTone("info");

    const validationMessage = validateAuthFields(email, password);
    if (validationMessage) {
      setMessageTone("error");
      setMessage(validationMessage);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessageTone("error");
      setMessage(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.",
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          setMessageTone("error");
          setMessage(formatSignupError(error.message));
          return;
        }

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMessageTone("error");
          setMessage("An account with this email already exists. Please log in.");
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMessageTone("success");
        setMessage("Check your email to confirm your account.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessageTone("error");
        setMessage(formatLoginError(error.message));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function showForgotPasswordPlaceholder() {
    setMessageTone("info");
    setMessage("Password reset is coming soon. For now, check your password or create a new account if you are new here.");
  }

  // TODO: Add Google OAuth here later with `supabase.auth.signInWithOAuth`.
  // Keep email/password as the only MVP provider for now.

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signup" ? "Create account" : "Log in"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" method="post" noValidate onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Optional"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              {mode === "login" ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={showForgotPasswordPlaceholder}
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              disabled={loading}
              minLength={minimumPasswordLength}
              required
            />
          </div>
          {message ? (
            <p
              className={
                messageTone === "error"
                  ? "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                  : messageTone === "success"
                    ? "rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
                    : "rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground"
              }
              role={messageTone === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {mode === "signup" ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Working" : mode === "signup" ? "Sign up" : "Log in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function validateAuthFields(email: string, password: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return "Enter your email address.";
  }
  if (!emailPattern.test(trimmedEmail)) {
    return "Enter a valid email address.";
  }
  if (!password) {
    return "Enter your password.";
  }
  if (password.length < minimumPasswordLength) {
    return `Password must be at least ${minimumPasswordLength} characters.`;
  }
  return null;
}

function formatLoginError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Invalid email or password. Please check your details or sign up.";
  }
  return message;
}

function formatSignupError(message: string) {
  if (/already|exists|registered|duplicate/i.test(message)) {
    return "An account with this email already exists. Please log in.";
  }
  return message || "If an account exists with this email, try logging in or reset your password.";
}