import { useEffect, useState } from "react";

type User = { id: string; name: string };

// An effect that fetches must (1) list every reactive value it reads in the
// dependency array, and (2) ignore results from a stale request. Without the
// cleanup guard, a fast switch from userId "a" to "b" can let "a"'s slower
// response arrive last and overwrite "b" - a classic race condition.

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // `ignore` is captured per-effect-run. When userId changes, the previous
    // run's cleanup sets its own `ignore` to true, neutralising its response.
    let ignore = false;

    fetch(`/api/users/${userId}`)
      .then((res) => res.json() as Promise<User>)
      .then((data) => {
        if (!ignore) setUser(data);
      });

    return () => {
      ignore = true;
    };
    // userId is the only reactive dependency; setUser is guaranteed stable.
  }, [userId]);

  return <div>{user ? user.name : "Loading..."}</div>;
}
