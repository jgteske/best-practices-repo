import { z } from "zod";
import { HttpError, useQuery } from "./use-query";

// Module-level schema: a stable identity, so it is safe in the hook's deps.
const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.email() });

export function UserCard({ userId }: { userId: string }) {
  const user = useQuery(`/api/users/${encodeURIComponent(userId)}`, UserSchema);

  // The status union forces every state to be handled - no `data && !error && ...`.
  switch (user.status) {
    case "pending":
      return <p role="status">Loading user…</p>;
    case "error":
      return (
        <div role="alert">
          <p>{user.error instanceof HttpError && user.error.status === 404 ? "No such user." : "Could not load the user."}</p>
          <button type="button" onClick={user.reload}>
            Retry
          </button>
        </div>
      );
    case "success":
      return (
        <article aria-busy={user.isFetching}>
          <h2>{user.data.name}</h2>
          <p>{user.data.email}</p>
          <button type="button" onClick={user.reload} disabled={user.isFetching}>
            Refresh
          </button>
        </article>
      );
  }
}
