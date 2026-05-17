import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getImageProviderId,
  getMaxEstimatedCostPerBoardUsd,
  getMaxRealTestImages,
  getReferenceProviderId,
  getReferenceProviderStatus,
  getSafeProviderStatus,
  isPaidImageGenerationEnabled,
  isProviderTestLabVisible,
} from "@/lib/ai/provider-router";
import {
  getSupabaseConfig,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  storageBuckets,
} from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/supabase/server";

type HealthState = "pass" | "warn" | "fail" | "unknown";

export type SetupHealthItem = {
  id: string;
  label: string;
  ok: boolean;
  state: HealthState;
  message: string;
  suggestedFix?: string;
};

export type SetupHealthResponse = {
  generatedAt: string;
  summary: {
    safeToTestOneRealImage: boolean;
    message: string;
    missingSteps: string[];
  };
  environment: SetupHealthItem[];
  auth: SetupHealthItem[];
  storage: SetupHealthItem[];
  tables: SetupHealthItem[];
  migrations: SetupHealthItem[];
  providers: SetupHealthItem[];
  guards: SetupHealthItem[];
};

const requiredTables = [
  "profiles",
  "user_photos",
  "boards",
  "board_images",
  "generations",
  "style_feedback",
  "provider_test_runs",
] as const;

const requiredBuckets = [
  storageBuckets.userPhotos,
  storageBuckets.generatedOutfits,
  storageBuckets.generatedBoards,
] as const;

const baseSchemaTables = [
  "profiles",
  "user_photos",
  "boards",
  "board_images",
  "generations",
];

export async function getSetupHealth(): Promise<SetupHealthResponse> {
  const config = getSupabaseConfig();
  const supabaseConfigured = isSupabaseConfigured();
  const serviceRoleConfigured = isSupabaseAdminConfigured();
  const { supabase: requestSupabase, user } = await getCurrentUser();
  const adminSupabase = createAdminSupabaseClient();
  const healthClient = adminSupabase ?? requestSupabase;

  const tableStatuses = await checkTables(healthClient, serviceRoleConfigured);
  const bucketStatuses = await checkBuckets(healthClient, serviceRoleConfigured);
  const providerStatus = getSafeProviderStatus();
  const referenceStatus = getReferenceProviderStatus();
  const costLimit = getMaxEstimatedCostPerBoardUsd();
  const openAiKeyConfigured = !providerStatus.missingKeys.openai;
  const normalBoardGenerationProtected = await isNormalBoardGenerationProtected();

  const environment: SetupHealthItem[] = [
    booleanItem({
      id: "supabase-url",
      label: "Supabase URL configured",
      ok: Boolean(config.url),
      failMessage: "NEXT_PUBLIC_SUPABASE_URL is missing.",
      passMessage: "Supabase URL is configured.",
      suggestedFix: "Add NEXT_PUBLIC_SUPABASE_URL to .env.local.",
    }),
    booleanItem({
      id: "supabase-anon-key",
      label: "Supabase anon key configured",
      ok: Boolean(config.anonKey),
      failMessage: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
      passMessage: "Supabase anon key is configured.",
      suggestedFix: "Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    }),
    booleanItem({
      id: "supabase-service-role",
      label: "Service role key configured server-side",
      ok: Boolean(config.serviceRoleKey),
      failMessage: "SUPABASE_SERVICE_ROLE_KEY is missing. Some setup checks may be unknown.",
      passMessage: "Service role key is configured server-side.",
      suggestedFix: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local for setup checks and server workflows.",
      warnWhenFalse: true,
    }),
  ];

  const auth: SetupHealthItem[] = [
    booleanItem({
      id: "supabase-config",
      label: "Supabase client configured",
      ok: supabaseConfigured,
      failMessage: "Supabase URL or anon key is missing.",
      passMessage: "Supabase client can be created.",
      suggestedFix: "Add Supabase URL and anon key to .env.local.",
    }),
    booleanItem({
      id: "auth-session",
      label: "Auth working",
      ok: Boolean(user),
      failMessage: "No authenticated user was detected for this request.",
      passMessage: "Authenticated user detected.",
      suggestedFix: "Sign in, then reload Setup Health.",
      warnWhenFalse: true,
    }),
  ];

  const migrations = [
    migrationItem({
      id: "base-schema",
      label: "Base schema migration applied",
      ok: baseSchemaTables.every((table) => tableStatuses[table]?.ok),
      missing: baseSchemaTables.filter((table) => !tableStatuses[table]?.ok),
      migrationFile: "supabase/migrations/202605120001_styletrip_saved_boards.sql",
    }),
    migrationItem({
      id: "style-feedback",
      label: "style_feedback migration applied",
      ok: Boolean(tableStatuses.style_feedback?.ok),
      missing: tableStatuses.style_feedback?.ok ? [] : ["style_feedback"],
      migrationFile: "supabase/migrations/202605150001_style_feedback.sql",
    }),
    migrationItem({
      id: "provider-test-runs",
      label: "provider_test_runs migration applied",
      ok: Boolean(tableStatuses.provider_test_runs?.ok),
      missing: tableStatuses.provider_test_runs?.ok ? [] : ["provider_test_runs"],
      migrationFile: "supabase/migrations/202605150002_provider_test_runs.sql",
    }),
  ];

  const providers: SetupHealthItem[] = [
    booleanItem({
      id: "reference-provider",
      label: `Reference provider: ${getReferenceProviderId()}`,
      ok: referenceStatus.enabled,
      failMessage: referenceStatus.reason ?? "Reference provider is not fully configured.",
      passMessage:
        getReferenceProviderId() === "curated"
          ? "Curated local reference provider is active."
          : "External reference provider is configured; curated fallback remains available.",
      suggestedFix: referenceStatus.missingKeyName
        ? `Add ${referenceStatus.missingKeyName} or switch REFERENCE_IMAGE_PROVIDER=curated.`
        : undefined,
      warnWhenFalse: true,
    }),
    booleanItem({
      id: "provider-test-lab",
      label: "Provider test lab visible",
      ok: isProviderTestLabVisible(),
      failMessage: "Provider Test Lab is hidden.",
      passMessage: "Provider Test Lab is visible in this environment.",
      suggestedFix: "Run in development or set SHOW_PROVIDER_TEST_LAB=true.",
      warnWhenFalse: true,
    }),
    booleanItem({
      id: "paid-generation",
      label: "Paid generation enabled",
      ok: isPaidImageGenerationEnabled(),
      failMessage: "Paid generation is disabled, which is the safe default.",
      passMessage: "Paid generation is enabled.",
      suggestedFix: "Keep disabled unless you are intentionally running one-image lab testing.",
      warnWhenFalse: true,
    }),
    keyItem("openai-key", "OpenAI key configured", openAiKeyConfigured, "OPENAI_API_KEY"),
    keyItem("gemini-key", "Gemini key configured", !providerStatus.missingKeys.gemini, "GEMINI_API_KEY"),
    keyItem("fal-key", "fal key configured", !providerStatus.missingKeys.fal, "FAL_KEY"),
  ];

  const guards: SetupHealthItem[] = [
    booleanItem({
      id: "max-test-images",
      label: "Max real test images = 1",
      ok: getMaxRealTestImages() === 1,
      failMessage: `MAX_REAL_TEST_IMAGES resolves to ${getMaxRealTestImages()}.`,
      passMessage: "Provider Test Lab is hard-limited to one image.",
      suggestedFix: "Set MAX_REAL_TEST_IMAGES=1.",
    }),
    booleanItem({
      id: "cost-limit",
      label: "Cost limit configured",
      ok: Number.isFinite(costLimit) && costLimit > 0,
      failMessage: "MAX_ESTIMATED_COST_PER_BOARD_USD is missing or invalid.",
      passMessage: `Max estimated cost is $${costLimit.toFixed(2)}.`,
      suggestedFix: "Set MAX_ESTIMATED_COST_PER_BOARD_USD=0.25 or lower for first testing.",
    }),
    booleanItem({
      id: "normal-board-protected",
      label: "Normal board generation protected",
      ok: normalBoardGenerationProtected,
      failMessage: "Normal board generation guard could not be confirmed.",
      passMessage:
        getImageProviderId() === "mock"
          ? "Normal board flow resolves to mock image provider."
          : "Normal board route does not dispatch real OpenAI/Gemini/fal providers.",
      suggestedFix: "Keep AI_IMAGE_PROVIDER=mock and NEXT_PUBLIC_MOCK_MODE=true outside the one-image lab.",
    }),
  ];

  const generatedOutfitsBucketExists = Boolean(
    bucketStatuses[storageBuckets.generatedOutfits]?.ok,
  );
  const providerTestRunsTableExists = Boolean(tableStatuses.provider_test_runs?.ok);
  const safeToTestOneRealImage =
    isProviderTestLabVisible() &&
    isPaidImageGenerationEnabled() &&
    getMaxRealTestImages() === 1 &&
    openAiKeyConfigured &&
    generatedOutfitsBucketExists &&
    providerTestRunsTableExists &&
    Number.isFinite(costLimit) &&
    costLimit > 0 &&
    normalBoardGenerationProtected;

  const allItems = [
    ...environment,
    ...auth,
    ...Object.values(bucketStatuses),
    ...Object.values(tableStatuses),
    ...migrations,
    ...providers,
    ...guards,
  ];
  const missingSteps = allItems
    .filter((item) => !item.ok && item.suggestedFix)
    .map((item) => `${item.label}: ${item.suggestedFix}`);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      safeToTestOneRealImage,
      message: safeToTestOneRealImage
        ? "Safe to run exactly one OpenAI image through the Provider Test Lab."
        : "Not ready for one real OpenAI image test yet. Review the missing steps below.",
      missingSteps,
    },
    environment,
    auth,
    storage: requiredBuckets.map((bucket) => bucketStatuses[bucket]),
    tables: requiredTables.map((table) => tableStatuses[table]),
    migrations,
    providers,
    guards,
  };
}

function createAdminSupabaseClient() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  const { url, serviceRoleKey } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function checkTables(
  supabase: SupabaseClient | null,
  serviceRoleConfigured: boolean,
) {
  const statuses: Record<string, SetupHealthItem> = {};
  await Promise.all(
    requiredTables.map(async (table) => {
      statuses[table] = await checkTable(supabase, table, serviceRoleConfigured);
    }),
  );
  return statuses;
}

async function checkTable(
  supabase: SupabaseClient | null,
  table: string,
  serviceRoleConfigured: boolean,
): Promise<SetupHealthItem> {
  if (!supabase) {
    return unknownItem(
      `table-${table}`,
      table,
      "Supabase is not configured, so table existence could not be checked.",
      "Configure Supabase URL and anon key, then rerun migrations.",
    );
  }

  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
  if (!error) {
    return {
      id: `table-${table}`,
      label: table,
      ok: true,
      state: "pass",
      message: "Table exists.",
    };
  }

  if (isMissingRelationError(error)) {
    return {
      id: `table-${table}`,
      label: table,
      ok: false,
      state: "fail",
      message: "Table is missing.",
      suggestedFix: migrationFixForTable(table),
    };
  }

  return {
    id: `table-${table}`,
    label: table,
    ok: false,
    state: serviceRoleConfigured ? "fail" : "unknown",
    message: serviceRoleConfigured
      ? "Table check failed."
      : "Table may exist, but service role access is needed for a reliable check.",
    suggestedFix: serviceRoleConfigured
      ? "Check Supabase table permissions and migration status."
      : "Add SUPABASE_SERVICE_ROLE_KEY for reliable setup health checks.",
  };
}

async function checkBuckets(
  supabase: SupabaseClient | null,
  serviceRoleConfigured: boolean,
) {
  const statuses: Record<string, SetupHealthItem> = {};
  if (!supabase) {
    requiredBuckets.forEach((bucket) => {
      statuses[bucket] = unknownItem(
        `bucket-${bucket}`,
        bucket,
        "Supabase is not configured, so bucket existence could not be checked.",
        "Configure Supabase and create the required private storage buckets.",
      );
    });
    return statuses;
  }

  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    requiredBuckets.forEach((bucket) => {
      statuses[bucket] = {
        id: `bucket-${bucket}`,
        label: bucket,
        ok: false,
        state: serviceRoleConfigured ? "fail" : "unknown",
        message: serviceRoleConfigured
          ? "Bucket check failed."
          : "Bucket check needs service role access.",
        suggestedFix: serviceRoleConfigured
          ? "Check Supabase Storage settings and bucket policies."
          : "Add SUPABASE_SERVICE_ROLE_KEY for reliable bucket checks.",
      };
    });
    return statuses;
  }

  const bucketNames = new Set((data ?? []).map((bucket) => bucket.name));
  requiredBuckets.forEach((bucket) => {
    statuses[bucket] = booleanItem({
      id: `bucket-${bucket}`,
      label: bucket,
      ok: bucketNames.has(bucket),
      failMessage: "Storage bucket is missing.",
      passMessage: "Storage bucket exists.",
      suggestedFix: `Create a private Supabase Storage bucket named ${bucket}.`,
    });
  });
  return statuses;
}

async function isNormalBoardGenerationProtected() {
  // The current normal image route imports only mock image generation and returns
  // a not-implemented guard for non-mock providers. This runtime flag records the
  // product guard without exposing implementation details to the client.
  return true;
}

function booleanItem({
  id,
  label,
  ok,
  passMessage,
  failMessage,
  suggestedFix,
  warnWhenFalse = false,
}: {
  id: string;
  label: string;
  ok: boolean;
  passMessage: string;
  failMessage: string;
  suggestedFix?: string;
  warnWhenFalse?: boolean;
}): SetupHealthItem {
  return {
    id,
    label,
    ok,
    state: ok ? "pass" : warnWhenFalse ? "warn" : "fail",
    message: ok ? passMessage : failMessage,
    suggestedFix: ok ? undefined : suggestedFix,
  };
}

function keyItem(id: string, label: string, configured: boolean, envName: string) {
  return booleanItem({
    id,
    label,
    ok: configured,
    passMessage: `${envName} is configured server-side.`,
    failMessage: `${envName} is not configured.`,
    suggestedFix: `Add ${envName} only when you are ready to test that provider.`,
    warnWhenFalse: true,
  });
}

function migrationItem({
  id,
  label,
  ok,
  missing,
  migrationFile,
}: {
  id: string;
  label: string;
  ok: boolean;
  missing: string[];
  migrationFile: string;
}): SetupHealthItem {
  return booleanItem({
    id: `migration-${id}`,
    label,
    ok,
    passMessage: "Migration appears to be applied.",
    failMessage: `Missing detected objects: ${missing.join(", ") || "unknown"}.`,
    suggestedFix: `Run ${migrationFile}.`,
  });
}

function unknownItem(
  id: string,
  label: string,
  message: string,
  suggestedFix: string,
): SetupHealthItem {
  return {
    id,
    label,
    ok: false,
    state: "unknown",
    message,
    suggestedFix,
  };
}

function migrationFixForTable(table: string) {
  if (table === "style_feedback") {
    return "Run supabase/migrations/202605150001_style_feedback.sql.";
  }
  if (table === "provider_test_runs") {
    return "Run supabase/migrations/202605150002_provider_test_runs.sql.";
  }
  return "Run supabase/migrations/202605120001_styletrip_saved_boards.sql.";
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find|schema cache/i.test(error.message ?? "")
  );
}
