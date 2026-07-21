import { useEffect } from "react";

// Effects fire CHILD-FIRST (bottom-up): a parent's effect runs only after all
// of its children's effects have run. Rendering, by contrast, is top-down: the
// parent renders first and produces the children. Understanding both orders
// explains why a parent can safely assume its children have already mounted.

function Child({ name }: { name: string }) {
  useEffect(() => {
    console.log(`  child mounted: ${name}`);
  }, [name]);
  return <li>{name}</li>;
}

export function Parent() {
  useEffect(() => {
    // Runs AFTER both children's effects above.
    console.log("parent mounted");
  }, []);

  return (
    <ul>
      <Child name="a" />
      <Child name="b" />
    </ul>
  );
}

// Render (top-down):  Parent -> Child a -> Child b
// Effects (bottom-up): child a -> child b -> parent
// Unmount cleanup also runs child-first, then parent.
