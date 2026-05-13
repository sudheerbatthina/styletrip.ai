import type { ReactNode } from "react";

export function ConfigWarning({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      {children}
    </div>
  );
}
