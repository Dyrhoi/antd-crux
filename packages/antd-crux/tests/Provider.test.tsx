import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AntdCruxProvider, useAntdCrux } from "../src/Provider";

interface CapturedContext {
  queryClient: QueryClient;
  isUsingExternalQueryClient: boolean;
  reactQueryClient: QueryClient | null;
  hasQueryClientProvider: boolean;
}

// Helper component to capture context values for testing
const ContextInspector = ({
  onCapture,
}: {
  onCapture: (data: CapturedContext) => void;
}) => {
  const { queryClient, isUsingExternalQueryClient } = useAntdCrux();

  // Try to grab the client from React Query's context to verify wrapping
  let reactQueryClient: QueryClient | null = null;
  let hasQueryClientProvider = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    reactQueryClient = useQueryClient();
    hasQueryClientProvider = true;
  } catch {
    // No QueryClientProvider in tree
  }

  onCapture({
    queryClient,
    isUsingExternalQueryClient,
    reactQueryClient,
    hasQueryClientProvider,
  });

  return null;
};

describe("AntdCruxProvider", () => {
  it("should use the provided QueryClient in the context", () => {
    const externalClient = new QueryClient();
    let captured: CapturedContext;

    render(
      <AntdCruxProvider queryClient={externalClient}>
        <ContextInspector onCapture={(data) => (captured = data)} />
      </AntdCruxProvider>,
    );

    expect(captured!.isUsingExternalQueryClient).toBe(true);
    expect(captured!.queryClient).toBe(externalClient);
  });

  it("should create and use an internal QueryClient when none is provided", () => {
    let captured: CapturedContext;

    render(
      <AntdCruxProvider>
        <ContextInspector onCapture={(data) => (captured = data)} />
      </AntdCruxProvider>,
    );

    expect(captured!.isUsingExternalQueryClient).toBe(false);
    expect(captured!.queryClient).toBeInstanceOf(QueryClient);
  });

  it("should maintain the same internal QueryClient instance across re-renders (singleton behavior)", () => {
    const { result, rerender } = renderHook(() => useAntdCrux(), {
      wrapper: AntdCruxProvider,
    });

    const firstClient = result.current.queryClient;
    rerender();
    const secondClient = result.current.queryClient;

    expect(firstClient).toBe(secondClient);
  });

  it("should wrap children with QueryClientProvider when using internal client", () => {
    let captured: CapturedContext;

    render(
      <AntdCruxProvider>
        <ContextInspector onCapture={(data) => (captured = data)} />
      </AntdCruxProvider>,
    );

    // useQueryClient() should work because AntdCruxProvider wraps with QueryClientProvider
    expect(captured!.hasQueryClientProvider).toBe(true);
    // And the client from useQueryClient should be the same as the one from useAntdCrux
    expect(captured!.reactQueryClient).toBe(captured!.queryClient);
  });

  it("should NOT wrap children with QueryClientProvider when using external client", () => {
    const externalClient = new QueryClient();
    let captured: CapturedContext;

    // When an external client is passed, the user is expected to provide the QueryClientProvider
    // higher up the tree. AntdCruxProvider should NOT add its own QueryClientProvider.
    render(
      <AntdCruxProvider queryClient={externalClient}>
        <ContextInspector onCapture={(data) => (captured = data)} />
      </AntdCruxProvider>,
    );

    // Since we didn't wrap the test in a QueryClientProvider, useQueryClient() should throw
    expect(captured!.hasQueryClientProvider).toBe(false);
  });

  it("should allow useQueryClient to work when external client is wrapped with QueryClientProvider", () => {
    const externalClient = new QueryClient();
    let captured: CapturedContext;

    // This simulates the expected usage pattern: user provides their own QueryClientProvider
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={externalClient}>
        <AntdCruxProvider queryClient={externalClient}>
          {children}
        </AntdCruxProvider>
      </QueryClientProvider>
    );

    render(<ContextInspector onCapture={(data) => (captured = data)} />, {
      wrapper,
    });

    expect(captured!.isUsingExternalQueryClient).toBe(true);
    expect(captured!.hasQueryClientProvider).toBe(true);
    expect(captured!.reactQueryClient).toBe(captured!.queryClient);
  });

  it("useAntdCrux should return default internal client if used outside provider", () => {
    const { result } = renderHook(() => useAntdCrux());

    expect(result.current.queryClient).toBeInstanceOf(QueryClient);
    expect(result.current.isUsingExternalQueryClient).toBe(false);
  });
});
