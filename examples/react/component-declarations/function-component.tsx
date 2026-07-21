// A component is just a function that returns JSX. Prefer a plain function
// declaration with an explicit, named props type. This gives the best stack
// traces, hoisting, and the clearest signature at the definition site.

export type AvatarProps = {
  /** Absolute or relative image URL. */
  src: string;
  /** Alt text is required, not optional - accessibility is not a nice-to-have. */
  alt: string;
  /** Rendered size in pixels. Defaults to 40. */
  size?: number;
};

// Destructure props in the parameter list and apply defaults there. This keeps
// the "what does this component accept, and what are the defaults" answer in a
// single place - the signature - instead of a `defaultProps` object elsewhere.
export function Avatar({ src, alt, size = 40 }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
    />
  );
}

// Avoid `React.FC`: it historically forced an implicit `children` prop, makes
// generic components awkward, and adds nothing a plain typed function lacks.
// The return type is inferred as `JSX.Element`, so you don't annotate it.
