# Forms

A form has to collect values, validate them, show errors that screen
readers announce, stop double submits, and handle errors that only the server
can detect. React has two ways to read inputs, and choosing between them is
the first decision.

Examples: [`examples/react/forms`](https://github.com/jgteske/best-practices-repo/tree/main/examples/react/forms).

## Controlled vs uncontrolled inputs

<<< ../../examples/react/forms/controlled-vs-uncontrolled.tsx

| | Uncontrolled (`defaultValue` + `FormData`) | Controlled (`value` + `onChange`) |
| --- | --- | --- |
| Who owns the value | the DOM | React state |
| Renders per keystroke | none | one |
| Read the values | once, on submit | always available |
| Use for | most forms: sign-up, settings, checkout | formatting as you type, live validation, dependent fields |

**Default to uncontrolled.** `new FormData(form)` reads every named field at
once, including checkbox groups (`getAll`). Switch a field to controlled when
the UI really must react to every keystroke, like the card number formatting above.

::: warning Don't switch modes
An input that starts with `value={undefined}` and later gets a string switches from
uncontrolled to controlled, and React warns about it. For controlled inputs,
initialise state to `""`, not `undefined`.
:::

## A complete form

<<< ../../examples/react/forms/signup-form.tsx

### Validation with one schema

`SignupSchema` validates on submit **and** provides the `Signup` type for
`onSubmit`, so the two can't drift apart. `z.flattenError` turns the issues into
`{ fieldErrors: { email: [...] } }`, ready to show next to each field.
`noValidate` turns off the browser's own popups, so every message comes from
one place and is styled and announced consistently. See
[Schema Validation with zod](/typescript/schema-validation).

### Errors that everyone can perceive

- **A real `<label htmlFor>`** gives each input its accessible name. A placeholder
  is not a label, because it disappears as soon as the user types.
- **`aria-invalid`** marks the field as invalid, and **`aria-describedby`** links it
  to its error message, so a screen reader reads the label, the value *and* the error.
- **Focus the first invalid field** after a failed submit, so keyboard and
  screen-reader users land where the problem is.
- `useId()` produces ids that are unique per component instance and stable
  across server rendering.

### Submitting

- A `status` union (`editing | submitting | done | failed`) drives the UI.
  While `submitting`, the button is **disabled** and its text says what is happening.
  That stops double submits.
- **Known server errors come back as data** (`{ ok: false, field, message }`)
  and land on the right field. Unexpected exceptions become a form-level
  `role="alert"` message. The [Error Handling page](./error-handling) covers
  escalating truly unexpected ones to a boundary.

## Testing the form

<<< ../../examples/react/forms/signup-form.test.tsx

The tests use the same names a user hears: `getByLabelText("Email")`,
`getByRole("button", { name: "Create account" })`. The accessible description
query (`{ description: "Enter a valid email address" }`) checks the
`aria-describedby` wiring itself, so if the error isn't connected to the field,
the test fails.

## Libraries

For long or dynamic forms (field arrays, wizards, async field validation),
**React Hook Form** (uncontrolled-first, with a zod resolver) or **TanStack Form**
save a lot of code. On React 19, `<form action={fn}>` with `useActionState` and
`useFormStatus` covers the pending state and server responses natively. The
rules on this page (one schema, labelled fields, linked errors, disabled submit)
apply whichever you use.

## Summary

- Default to uncontrolled inputs read with `FormData`. Make a field controlled only when it must react to typing.
- Validate with one schema that also provides the submitted type.
- Label every field, set `aria-invalid` and `aria-describedby` on errors, and focus the first invalid field.
- Disable the submit button while pending, and map known server errors onto fields.
