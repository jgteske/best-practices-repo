// When some props only make sense together, model them as a discriminated
// union instead of a bag of optional props. This makes illegal combinations
// impossible to type - the compiler enforces the contract, not a code review.

type ButtonProps = {
  children: React.ReactNode;
} & (
  // A link button REQUIRES an href and forbids onClick...
  | { as: "link"; href: string; onClick?: never }
  // ...an action button REQUIRES onClick and forbids href.
  | { as: "action"; onClick: () => void; href?: never }
);

export function Button(props: ButtonProps) {
  if (props.as === "link") {
    // Inside this branch TypeScript knows `href` exists and `onClick` does not.
    return <a href={props.href}>{props.children}</a>;
  }
  return <button onClick={props.onClick}>{props.children}</button>;
}

// Legal uses:
export const examples = (
  <>
    <Button as="link" href="/docs">
      Read the docs
    </Button>
    <Button as="action" onClick={() => console.log("saved")}>
      Save
    </Button>
  </>
);

// Illegal uses are compile errors, e.g. `<Button as="link" onClick={...} />`
// or a link with no href - you cannot even construct the bad combination.
