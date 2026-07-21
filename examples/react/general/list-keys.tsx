type Todo = { id: string; text: string };

// Keys must be STABLE and UNIQUE identity for the item - use a domain id, never
// the array index. Index keys break the moment the list is reordered, filtered,
// or has items inserted: React reuses the wrong DOM node and component state
// "teleports" to the wrong row.
export function TodoList({ todos }: { todos: readonly Todo[] }) {
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
