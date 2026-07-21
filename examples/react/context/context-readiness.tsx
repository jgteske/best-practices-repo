import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// "When is the API ready to use?" - model readiness explicitly as a
// discriminated union in the context value. Consumers can't accidentally call a
// method before it exists, because the ready methods only exist on the "ready"
// variant. The compiler forces the check.

type ApiClient = {
  getMessage: () => Promise<string>;
};

// The context value is a state machine, not a maybe-null client.
type ClientState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; client: ApiClient };

const ClientContext = createContext<ClientState | undefined>(undefined);

// Pretend async setup: opening a connection, fetching a token, etc.
async function connect(): Promise<ApiClient> {
  return { getMessage: async () => "hello from the API" };
}

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    connect()
      .then((client) => {
        if (!cancelled) setState({ status: "ready", client });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true; // ignore a late resolve after unmount.
    };
  }, []);

  return (
    <ClientContext.Provider value={state}>{children}</ClientContext.Provider>
  );
}

export function useApiClientState(): ClientState {
  const state = useContext(ClientContext);
  if (state === undefined) {
    throw new Error("useApiClientState must be used within <ApiClientProvider>");
  }
  return state;
}

export function MessageView() {
  const state = useApiClientState();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    // `client` is ONLY accessible after narrowing to status === "ready".
    if (state.status !== "ready") return;
    let cancelled = false;
    state.client.getMessage().then((m) => {
      if (!cancelled) setMessage(m);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.status === "loading") return <p>Connecting...</p>;
  if (state.status === "error") return <p>Failed: {state.error.message}</p>;
  return <p>{message ?? "Loading message..."}</p>;
}
