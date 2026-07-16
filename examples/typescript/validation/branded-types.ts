/**
 * Branded (nominal) types: making "a string that has been validated" a
 * different type than "any string," so the compiler stops accepting
 * un-validated data anywhere a validated value is required.
 *
 * TypeScript's type system is structural: a plain `string` and an
 * `EmailAddress` that's just `type EmailAddress = string` are completely
 * interchangeable, so validation performed once is easy to lose track of.
 * A brand fixes that by attaching a unique, uninhabited marker property
 * that only the validating function can produce.
 */

declare const emailBrand: unique symbol;
type EmailAddress = string & { readonly [emailBrand]: true };

declare const userIdBrand: unique symbol;
type UserId = string & { readonly [userIdBrand]: true };

function parseEmailAddress(raw: string): EmailAddress {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    throw new TypeError(`Invalid email address: ${raw}`);
  }
  return raw as EmailAddress;
}

function parseUserId(raw: string): UserId {
  if (!/^usr_[a-z0-9]{8,}$/.test(raw)) {
    throw new TypeError(`Invalid user id: ${raw}`);
  }
  return raw as UserId;
}

// Because `EmailAddress` and `UserId` are both branded `string`s, without
// brands these two functions would be able to accidentally swap arguments
// and TypeScript would never notice - both parameters are "just strings."
function sendWelcomeEmail(to: EmailAddress, userId: UserId): void {
  console.log(`sending welcome email to ${to} for user ${userId}`);
}

const email = parseEmailAddress("ada@example.com");
const userId = parseUserId("usr_4f8a9c21");

sendWelcomeEmail(email, userId);

// sendWelcomeEmail(userId, email);              // <- compile error: swapped args
// sendWelcomeEmail("ada@example.com", userId);   // <- compile error: raw string
//                                                    isn't known to be validated

export { parseEmailAddress, parseUserId, sendWelcomeEmail };
export type { EmailAddress, UserId };
