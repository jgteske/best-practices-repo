/**
 * Reaching for built-in utility types instead of hand-rolling variants of
 * an existing type. Every variant below is derived from one `interface`,
 * so all of them stay in sync automatically when `Product` changes.
 */

interface Product {
  id: string;
  name: string;
  priceCents: number;
  description: string;
  tags: string[];
}

// "Same shape, everything optional" - e.g. a PATCH request body.
type ProductPatch = Partial<Product>;

function updateProduct(id: string, patch: ProductPatch): void {
  console.log(`updating ${id} with`, patch);
}

// "Same shape, minus fields the server assigns" - e.g. a creation payload.
type NewProduct = Omit<Product, "id">;

function createProduct(input: NewProduct): Product {
  return { id: crypto.randomUUID(), ...input };
}

// "Only these fields" - e.g. a lightweight list-view row.
type ProductSummary = Pick<Product, "id" | "name" | "priceCents">;

function toSummary(product: Product): ProductSummary {
  const { id, name, priceCents } = product;
  return { id, name, priceCents };
}

// "A lookup table keyed by id" - avoids writing `{ [id: string]: Product }`
// by hand, and reads as intent ("a Record of Product, keyed by string")
// rather than index-signature syntax.
type ProductCatalog = Record<string, Product>;

function findProduct(catalog: ProductCatalog, id: string): Product | undefined {
  return catalog[id];
}

// "Every field required, even ones declared optional elsewhere" - the
// inverse of Partial, useful once defaults have been applied.
interface ProductFormState {
  name: string;
  priceCents?: number;
  description?: string;
}

type CompleteProductForm = Required<ProductFormState>;

function submitForm(form: CompleteProductForm): void {
  console.log(`submitting ${form.name} at ${form.priceCents}`);
}

// "Remove a value from a union" - e.g. every status except the terminal one.
type Status = "draft" | "published" | "archived";
type EditableStatus = Exclude<Status, "archived">;

function canEdit(status: Status): status is EditableStatus {
  return status !== "archived";
}

export {
  updateProduct,
  createProduct,
  toSummary,
  findProduct,
  submitForm,
  canEdit,
};
export type {
  Product,
  ProductPatch,
  NewProduct,
  ProductSummary,
  ProductCatalog,
  ProductFormState,
  CompleteProductForm,
  Status,
  EditableStatus,
};
