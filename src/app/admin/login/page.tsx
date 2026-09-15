import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";
import { siteConfig } from "@/lib/site-config";
import { issueFormToken } from "@/lib/security/form-token";
import { LoginForm } from "./login-form";
import { LOGIN_FORM_SCOPE } from "./form-state";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  // Already signed in - no reason to show a login form.
  const existing = await getCurrentAdmin();
  if (existing) redirect("/admin/inquiries");

  const formToken = issueFormToken(LOGIN_FORM_SCOPE);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-1">
          <span className="eyebrow text-ink-subtle">{siteConfig.name}</span>
          <h1 className="font-display text-heading-1 text-ink">Admin sign in</h1>
        </div>

        <div className="rounded-xl border border-line bg-paper-raised p-6">
          <LoginForm formToken={formToken} />
        </div>
      </div>
    </div>
  );
}
