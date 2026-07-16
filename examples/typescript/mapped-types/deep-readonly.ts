/**
 * A recursive mapped type: DeepReadonly.
 *
 * The built-in `Readonly<T>` is shallow - it freezes the top level but nested
 * objects and arrays stay mutable. A recursive mapped type applies the
 * transformation all the way down, which is what you usually want for config
 * objects and immutable state.
 */

type DeepReadonly<T> = T extends (infer E)[]
  ? ReadonlyArray<DeepReadonly<E>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T; // primitives are already immutable - stop recursing

interface Config {
  name: string;
  server: {
    host: string;
    ports: number[];
  };
}

const config: DeepReadonly<Config> = {
  name: "app",
  server: { host: "localhost", ports: [80, 443] },
};

// Every level is now read-only, not just the top:
// config.name = "x";             // error (shallow Readonly catches this too)
// config.server.host = "x";      // error (only DeepReadonly catches this)
// config.server.ports.push(8080) // error (only DeepReadonly catches this)

console.log(config.server.ports.length);

export type { DeepReadonly, Config };
