// Prefer composition (passing JSX through `children` or render props) over
// threading data down through many layers ("prop drilling"). A generic layout
// component shouldn't know or care what it wraps.

type CardProps = {
  title: string;
  // `React.ReactNode` is the correct type for "anything renderable": elements,
  // strings, numbers, arrays, null. Don't invent your own.
  children: React.ReactNode;
  // A "slot": let the caller inject an element into a named region.
  actions?: React.ReactNode;
};

export function Card({ title, children, actions }: CardProps) {
  return (
    <section className="card">
      <header>
        <h3>{title}</h3>
        {actions}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

// The caller composes freely; Card stays ignorant of its contents.
export const usage = (
  <Card title="Invoice #1042" actions={<button>Export</button>}>
    <p>Amount due: $240.00</p>
  </Card>
);
