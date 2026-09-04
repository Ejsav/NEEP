/**
 * Shared shapes for the admin login form. Kept out of actions.ts because a
 * "use server" module may only export async functions.
 */

export const LOGIN_FORM_SCOPE = "admin-login";

export type LoginFormState = {
  status: "idle" | "error";
  message?: string;
  /**
   * Echoed back after a failed attempt so a mistyped password does not also
   * cost the user their email address. The password is never echoed.
   */
  email?: string;
};

export const initialLoginState: LoginFormState = { status: "idle" };
