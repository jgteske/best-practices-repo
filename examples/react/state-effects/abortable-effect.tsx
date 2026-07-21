import { useEffect, useState } from "react";

type User = { id: string; name: string };

// The AbortController version of race-safe fetching in an effect. A boolean
// `ignore` flag only *hides* a stale response; passing the effect's signal to
// fetch actually CANCELS the in-flight request when the effect re-runs or the
// component unmounts - freeing the connection and stopping the download too.

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<User>)
      .then(setUser)
      .catch((err: unknown) => {
        // A cancelled request rejects with AbortError - expected on re-run or
        // unmount, so ignore it. Anything else is a genuine failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load user");
      });

    // Cleanup runs before the next effect and on unmount: cancel the request.
    return () => controller.abort();
  }, [userId]);

  if (error) return <div role="alert">{error}</div>;
  return <div>{user ? user.name : "Loading..."}</div>;
}
