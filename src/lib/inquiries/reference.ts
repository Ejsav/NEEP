import { randomInt } from "node:crypto";

/**
 * Human-readable inquiry reference, e.g. "NEEP-7K3F2A".
 *
 * Crockford base32 minus I, L, O, U: no character pair that gets confused when
 * a customer reads it back over the phone, and no accidental profanity from a
 * vowel-free alphabet.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

export function generateReference(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `NEEP-${out}`;
}

export function isValidReference(value: string): boolean {
  return new RegExp(`^NEEP-[${ALPHABET}]{${LENGTH}}$`).test(value);
}
