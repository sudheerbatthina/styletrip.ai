import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseConfig,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/config";

let adminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  if (!adminClient) {
    const { url, serviceRoleKey } = getSupabaseConfig();
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
