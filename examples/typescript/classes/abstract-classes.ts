/**
 * Abstract classes: a partial implementation with holes the subclass fills.
 *
 * An interface says what a type can do. An abstract class says the same thing
 * *and* brings code with it - shared state, shared helpers, and a fixed order
 * of operations that subclasses cannot rearrange. That last part is the only
 * reason to prefer it over an interface plus a function.
 */

type ParsedRow = Record<string, string>;

// --- The template method pattern -----------------------------------------------

// `abstract` on the class means it cannot be constructed. `abstract` on a member
// means "no implementation here; a concrete subclass must provide one".
abstract class Importer {
  #imported = 0;

  constructor(protected readonly source: string) {}

  // The template method: concrete, `final` by convention, and the only entry
  // point. It owns the sequence; the subclass owns the steps.
  run(): number {
    const rows = this.read().map((line) => this.parseRow(line));
    for (const row of rows) {
      if (!this.isValid(row)) continue;
      this.write(row);
      this.#imported += 1;
    }
    this.onFinished(this.#imported);
    return this.#imported;
  }

  // Holes the subclass must fill. `protected` keeps them out of the public API:
  // callers get `run()`, subclasses get the steps.
  protected abstract read(): readonly string[];
  protected abstract parseRow(line: string): ParsedRow;
  protected abstract write(row: ParsedRow): void;

  // An abstract accessor works the same way.
  abstract get name(): string;

  // A hook with a default: overriding is optional, which is what separates a
  // hook from an abstract member.
  protected isValid(row: ParsedRow): boolean {
    return Object.keys(row).length > 0;
  }

  protected onFinished(count: number): void {
    console.log(`${this.name}: imported ${count} row(s) from ${this.source}`);
  }
}

// new Importer("x");   // ❌ Cannot create an instance of an abstract class

class CsvImporter extends Importer {
  readonly #rows: string[];
  readonly #columns: readonly string[];

  constructor(source: string, columns: readonly string[], rows: string[]) {
    super(source);
    this.#columns = columns;
    this.#rows = rows;
  }

  override get name(): string {
    return "csv";
  }

  protected override read(): readonly string[] {
    return this.#rows;
  }

  protected override parseRow(line: string): ParsedRow {
    const cells = line.split(",");
    // The tuple annotation matters: without it `map` infers `string[]`, which
    // only matches `Object.fromEntries`'s `any`-returning overload.
    return Object.fromEntries(
      this.#columns.map((column, index): [string, string] => [column, cells[index] ?? ""]),
    );
  }

  protected override write(row: ParsedRow): void {
    console.log("  ->", JSON.stringify(row));
  }

  // Narrowing a hook is allowed; widening the *sequence* is not, which is the
  // guarantee the base class is buying you.
  protected override isValid(row: ParsedRow): boolean {
    return super.isValid(row) && row["id"] !== "";
  }
}

const importer = new CsvImporter("orders.csv", ["id", "total"], ["1,500", ",0", "2,750"]);
console.log(importer.run());
//   -> {"id":"1","total":"500"}
//   -> {"id":"2","total":"750"}
// csv: imported 2 row(s) from orders.csv
// 2

// --- Abstract class as a type ---------------------------------------------------

// The class name is still a perfectly good *type* - it just cannot be `new`ed.
// A function that takes any importer takes the abstract type.
function describe(target: Importer): string {
  return `${target.name} importer`;
}

console.log(describe(importer)); // csv importer

// --- Abstract construct signatures ----------------------------------------------

// `typeof Importer` includes the abstract construct signature, so it cannot be
// called with `new`. A factory that must actually build something needs a
// *concrete* constructor type:
type ConcreteImporter = new (source: string, columns: readonly string[], rows: string[]) => Importer;

function importFrom(Ctor: ConcreteImporter, source: string, rows: string[]): number {
  return new Ctor(source, ["id", "total"], rows).run();
}

console.log(importFrom(CsvImporter, "refunds.csv", ["9,100"])); // 1

// The abstract form exists for the cases where you only need to *reference* the
// constructor - a registry of base classes, a mixin applied to an abstract base:
type AnyImporterClass = abstract new (...args: never[]) => Importer;

const importerClasses: readonly AnyImporterClass[] = [Importer, CsvImporter];
console.log(importerClasses.length); // 2

// --- When an interface is the better answer -------------------------------------

// If there is no shared code and no fixed sequence - only a contract - an
// interface says the same thing with less coupling, and a plain object or a
// factory function can satisfy it. Reach for `abstract class` when the base
// genuinely owns state or ordering that subclasses must not reimplement.
interface Sink {
  write(row: ParsedRow): void;
}

const consoleSink: Sink = { write: (row) => console.log(row["id"]) };
consoleSink.write({ id: "1" }); // 1

export { Importer, CsvImporter, describe, importFrom };
export type { ParsedRow, ConcreteImporter, AnyImporterClass, Sink };
