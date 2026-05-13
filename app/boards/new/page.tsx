import { redirect } from "next/navigation";
import { AppNav } from "@/components/common/AppNav";
import { ConfigWarning } from "@/components/common/ConfigWarning";
import { NewBoardClient } from "@/app/boards/new/NewBoardClient";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewBoardPage() {
  const supabaseReady = isSupabaseConfigured();
  const { user } = await getCurrentUser();

  if (supabaseReady && !user) {
    redirect("/login");
  }

  return (
    <>
      <AppNav />
      {!supabaseReady ? (
        <div className="container pt-5">
          <ConfigWarning>
            Supabase is not configured, so this builder runs in local/mock mode and
            the save button is disabled. Add Supabase env vars to persist boards.
          </ConfigWarning>
        </div>
      ) : null}
      <NewBoardClient persistEnabled={Boolean(supabaseReady && user)} />
    </>
  );
}
