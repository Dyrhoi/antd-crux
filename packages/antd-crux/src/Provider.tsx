// src/provider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";

interface AntdCruxContextValue {
  queryClient: QueryClient;
  isUsingExternalQueryClient: boolean;
}

const AntdCruxContext = createContext<AntdCruxContextValue | null>(null);

// Internal default client (lazy-created)
let internalQueryClient: QueryClient | null = null;
function getInternalQueryClient() {
  if (!internalQueryClient) {
    internalQueryClient = new QueryClient();
  }
  return internalQueryClient;
}

interface AntdCruxProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient; // Optional - user's client
}

export function AntdCruxProvider({
  children,
  queryClient,
}: AntdCruxProviderProps) {
  const value = useMemo<AntdCruxContextValue>(
    () => ({
      queryClient: queryClient ?? getInternalQueryClient(),
      isUsingExternalQueryClient: !!queryClient,
    }),
    [queryClient],
  );

  return (
    <AntdCruxContext.Provider value={value}>
      {/* Only wrap with QCP if using internal client */}
      {value.isUsingExternalQueryClient ? (
        children
      ) : (
        <QueryClientProvider client={value.queryClient}>
          {children}
        </QueryClientProvider>
      )}
    </AntdCruxContext.Provider>
  );
}

export function useAntdCrux() {
  const ctx = useContext(AntdCruxContext);
  if (!ctx) {
    return {
      queryClient: getInternalQueryClient(),
      isUsingExternalQueryClient: false,
    };
  }
  return ctx;
}
