"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type HealthState = "pass" | "warn" | "fail" | "unknown";

type SetupHealthItem = {
  id: string;
  label: string;
  ok: boolean;
  state: HealthState;
  message: string;
  suggestedFix?: string;
};

type SetupHealthResponse = {
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

export function SetupHealthCard({ compact = false }: { compact?: boolean }) {
  const [health, setHealth] = useState<SetupHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const items = health ? getAllItems(health) : [];
    return {
      pass: items.filter((item) => item.state === "pass").length,
      warn: items.filter((item) => item.state === "warn" || item.state === "unknown").length,
      fail: items.filter((item) => item.state === "fail").length,
    };
  }, [health]);

  async function loadHealth() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/setup-health", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setError("Setup Health failed to load.");
        return;
      }
      setHealth((await response.json()) as SetupHealthResponse);
    } catch {
      setError("Setup Health failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadHealth();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const summary = health?.summary;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Setup Health</p>
            <h2 className="text-xl font-bold">Real-provider readiness</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Checks Supabase, migrations, storage, providers, and safety guards without exposing secrets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {compact ? (
              <Button type="button" variant="outline" size="sm" asChildLike="link" href="/dashboard/setup-health">
                <ExternalLink className="h-4 w-4" />
                Full health
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void loadHealth()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div
          className={`rounded-md border p-3 ${
            summary?.safeToTestOneRealImage
              ? "border-emerald-300 bg-emerald-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-2">
            {summary?.safeToTestOneRealImage ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            ) : (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            )}
            <div>
              <p className="font-semibold">
                Safe to test one real image: {summary?.safeToTestOneRealImage ? "yes" : "no"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {loading ? "Loading setup health..." : summary?.message ?? "Setup Health has not loaded yet."}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-100 text-emerald-900">Passing: {counts.pass}</Badge>
          <Badge className="bg-amber-100 text-amber-950">Warnings: {counts.warn}</Badge>
          <Badge className="bg-destructive/10 text-destructive">Missing: {counts.fail}</Badge>
        </div>

        {health ? (
          compact ? (
            <CompactHealth health={health} />
          ) : (
            <FullHealth health={health} />
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

function CompactHealth({ health }: { health: SetupHealthResponse }) {
  const criticalItems = [
    ...health.migrations,
    ...health.storage.filter((item) => item.label === "generated-outfits"),
    ...health.providers.filter((item) =>
      ["provider-test-lab", "paid-generation", "openai-key"].includes(item.id),
    ),
    ...health.guards,
  ];

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {criticalItems.map((item) => (
        <HealthLine key={item.id} item={item} />
      ))}
    </div>
  );
}

function FullHealth({ health }: { health: SetupHealthResponse }) {
  return (
    <div className="space-y-5">
      <HealthSection title="Environment" items={health.environment} />
      <HealthSection title="Auth" items={health.auth} />
      <HealthSection title="Storage Buckets" items={health.storage} />
      <HealthSection title="Tables" items={health.tables} />
      <HealthSection title="Migration Checklist" items={health.migrations} />
      <HealthSection title="Providers" items={health.providers} />
      <HealthSection title="Safety Guards" items={health.guards} />

      {health.summary.missingSteps.length ? (
        <div className="rounded-md border bg-muted/25 p-3">
          <p className="text-sm font-semibold">Missing setup steps</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
            {health.summary.missingSteps.slice(0, 12).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function HealthSection({ title, items }: { title: string; items: SetupHealthItem[] }) {
  return (
    <section>
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <HealthLine key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function HealthLine({ item }: { item: SetupHealthItem }) {
  const Icon =
    item.state === "pass"
      ? CheckCircle2
      : item.state === "fail"
        ? AlertTriangle
        : ShieldAlert;
  const tone =
    item.state === "pass"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : item.state === "fail"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`rounded-md border p-3 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{item.label}</p>
          <p className="mt-1 text-xs leading-5 opacity-85">{item.message}</p>
          {item.suggestedFix ? (
            <p className="mt-1 text-xs leading-5 opacity-85">Fix: {item.suggestedFix}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getAllItems(health: SetupHealthResponse) {
  return [
    ...health.environment,
    ...health.auth,
    ...health.storage,
    ...health.tables,
    ...health.migrations,
    ...health.providers,
    ...health.guards,
  ];
}
