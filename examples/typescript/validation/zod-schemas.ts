/**
 * Runtime validation with zod: one schema, both the check and the type.
 *
 * Hand-written guards (type-guards.ts) are fine for a few fields. Once data
 * has nesting, optional parts and value rules, a schema library keeps the
 * runtime check and the static type from drifting apart: the type is derived
 * *from* the schema, so there is nothing to keep in sync.
 */
import { z } from "zod";

// The schema is the single source of truth...
const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
  tags: z.array(z.string()).max(10).optional(),
});

// ...and the type is derived from it.
type User = z.infer<typeof UserSchema>;
// = { id: number; email: string; name: string; role: "admin" | "member"; tags?: string[] }

// parse() returns a typed value or throws; safeParse() returns a result object.
const ada: User = UserSchema.parse({ id: 1, email: "ada@example.com", name: "Ada" });
console.log(ada.role); // member  (the default was applied)

const result = UserSchema.safeParse({ id: -5, email: "not-an-email", name: "" });
if (!result.success) {
  // One readable message per problem, with the path to the field.
  console.log(z.prettifyError(result.error));
  // ✖ Too small: expected number to be >0
  //   → at id
  // ✖ Invalid email address
  //   → at email
  // ✖ Too small: expected string to have >=1 characters
  //   → at name
}

// Unknown keys are stripped by default: the output only has the fields you declared.
const stripped = UserSchema.parse({ id: 2, email: "b@example.com", name: "Bo", isAdmin: true });
console.log("isAdmin" in stripped); // false

// --- composing schemas -------------------------------------------------------
// Derive variants instead of writing near-duplicate schemas.
const NewUserSchema = UserSchema.omit({ id: true });
const UserPatchSchema = UserSchema.partial().required({ id: true });
type UserPatch = z.infer<typeof UserPatchSchema>;
const patch: UserPatch = { id: 1, name: "Ada L." };

// Discriminated unions validate *and* narrow, like the hand-written versions.
const EventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("signup"), user: NewUserSchema }),
  z.object({ type: z.literal("delete"), id: z.number() }),
]);
type AppEvent = z.infer<typeof EventSchema>;

function handle(event: AppEvent): string {
  return event.type === "signup" ? `welcome ${event.user.name}` : `deleted ${event.id}`;
}
console.log(handle(EventSchema.parse({ type: "delete", id: 7 }))); // deleted 7

// --- transforms and refinements ---------------------------------------------
// A schema can also convert: here, input is a string and output is a Date.
const DateRangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .transform(({ from, to }) => ({ from: new Date(from), to: new Date(to) }))
  .refine(({ from, to }) => from <= to, { message: "`from` must not be after `to`" });

type DateRangeInput = z.input<typeof DateRangeSchema>; // { from: string; to: string }
type DateRange = z.output<typeof DateRangeSchema>; // { from: Date; to: Date }
const input: DateRangeInput = { from: "2026-01-01", to: "2026-01-31" };
const range: DateRange = DateRangeSchema.parse(input);
console.log(range.to.getUTCDate()); // 31
console.log(DateRangeSchema.safeParse({ from: "2026-02-01", to: "2026-01-01" }).success); // false

export { UserSchema, NewUserSchema, UserPatchSchema, EventSchema, DateRangeSchema, patch };
export type { User, UserPatch, AppEvent, DateRange };
