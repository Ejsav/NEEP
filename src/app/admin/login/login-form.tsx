"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { FORM_TOKEN_FIELD } from "@/lib/security/form-fields";
import { submitLogin } from "./actions";
import { initialLoginState, type LoginFormState } from "./form-state";

export function LoginForm({ formToken }: { formToken: string }) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    submitLogin,
    initialLoginState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name={FORM_TOKEN_FIELD} value={formToken} />

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          data-login-error
          className="rounded-md border border-critical bg-critical-soft px-4 py-3 text-small text-ink"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-small font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          defaultValue={state.email ?? ""}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-small font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={400}
          className={inputClasses}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
