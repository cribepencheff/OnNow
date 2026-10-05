// A dedicated test query client for hook tests (ADR 0009, ADR 0008):
// retries are disabled so failing fixtures fail fast instead of retrying.
// gcTime is Infinity so the client schedules no cache-cleanup timers; with
// the 5-minute default, those timers outlive the test and keep the Jest
// worker alive (CRI-109).

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
}

export function wrapperWithQueryClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}
