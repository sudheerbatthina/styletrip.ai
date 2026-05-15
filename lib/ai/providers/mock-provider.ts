import type { AiProviderId } from "@/lib/ai/provider-router";

export type MockProvider = {
  id: AiProviderId;
  kind: "mock";
};

export const mockProvider: MockProvider = {
  id: "mock",
  kind: "mock",
};