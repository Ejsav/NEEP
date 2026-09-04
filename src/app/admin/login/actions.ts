"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/lib/auth/session";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getRequestContext, rateLimitKey } from "@/lib/security/request-context";
import {
  FORM_TOKEN_FIELD,
  verifyFormToken,
} from "@/lib/security/form-token";
import { hmac } from "@/lib/security/hash";
import { LOGIN_FORM_SCOPE, type LoginFormState } from "./form-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(400),
});

/**
 * Admin login.
 *
 * Rate limited on two axes: per source IP, and per submitted account. The
 * per-account limit is what stops a distributed attack from spreading its
 * guesses across many IPs against one known inbox. The account key is hashed so
 * the rate-limit table does not become a list of admin email addresses.
 *
 * Every failure returns the same message. Nothing here tells a caller whether
 * an account exists, is deactivated, or simply had the wrong password.
 */
export async function submitLogin(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const context = await getRequestContext();

  const submittedEmail = formData.get("email");
  const email = typeof submittedEmail === "string" ? submittedEmail.slice(0, 254) : "";

  const generic: LoginFormState = {
    status: "error",
    message: "Those credentials didn't work.",
    email,
  };

  const tokenVerdict = verifyFormToken(
    formData.get(FORM_TOKEN_FIELD)?.toString(),
    LOGIN_FORM_SCOPE,
  );
  if (!tokenVerdict.ok && tokenVerdict.reason !== "too_fast") {
    return {
      status: "error",
      message: "Your login session expired. Reload the page and try again.",
      email,
    };
  }

  const perIp = await consumeRateLimit(
    rateLimitKey("login-ip", context.ipHash),
    RATE_LIMITS.loginPerIp,
  );
  if (!perIp.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Wait a few minutes and try again.",
      email,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return generic;

  const perAccount = await consumeRateLimit(
    `login-account:${hmac(`login:${parsed.data.email}`).slice(0, 32)}`,
    RATE_LIMITS.loginPerAccount,
  );
  if (!perAccount.allowed) {
    return {
      status: "error",
      message: "Too many attempts for this account. Wait a few minutes.",
      email,
    };
  }

  const result = await login(parsed.data.email, parsed.data.password, context);
  if (!result.ok) return generic;

  redirect("/admin/inquiries");
}
