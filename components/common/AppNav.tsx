import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

export async function AppNav() {
  const { user } = await getCurrentUser();

  return (
    <header className="border-b bg-card">
      <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-sm font-bold text-primary">
          StyleTrip AI
        </Link>
        <nav className="flex flex-wrap gap-2">
          <Button asChildLike="link" variant="ghost" href="/dashboard">
            Dashboard
          </Button>
          <Button asChildLike="link" variant="ghost" href="/boards/new">
            New Board
          </Button>
          {user ? (
            <Button asChildLike="link" variant="outline" href="/logout">
              Logout
            </Button>
          ) : (
            <Button asChildLike="link" href="/login">
              Login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
