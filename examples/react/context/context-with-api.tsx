import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Context isn't just for values - it's the idiomatic way to pass an *API*
// (state + the functions that mutate it) down a tree. Bundle them into one
// object, MEMOIZE it, and expose it through a custom hook.

type User = { id: string; name: string };

// The shape of the API the context provides: data AND behaviour (functions).
type AuthApi = {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthApi | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Create the functions once with useCallback so their identity is stable.
  const login = useCallback((name: string) => {
    setUser({ id: crypto.randomUUID(), name });
  }, []);
  const logout = useCallback(() => setUser(null), []);

  // Memoize the API object: without this, a NEW object every render forces every
  // consumer to re-render even when nothing they use changed.
  const api = useMemo<AuthApi>(
    () => ({ user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

// One hook exposes the whole API; consumers destructure what they need.
export function useAuth(): AuthApi {
  const api = useContext(AuthContext);
  if (api === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return api;
}

export function LoginButton() {
  const { user, login, logout } = useAuth();
  return user ? (
    <button onClick={logout}>Log out {user.name}</button>
  ) : (
    <button onClick={() => login("Ada")}>Log in</button>
  );
}
