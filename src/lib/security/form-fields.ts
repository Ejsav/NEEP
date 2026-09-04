/**
 * Field names shared between the server action and the client form.
 *
 * Deliberately its own module with no `server-only` marker and no imports: the
 * client needs these two strings, and it must not have to pull in the crypto
 * and secret-reading modules to get them.
 */

/** Hidden input carrying the signed form token. */
export const FORM_TOKEN_FIELD = "_ft";

/** Honeypot input. Named to look plausible to a bot filling every field. */
export const HONEYPOT_FIELD = "company_website";
