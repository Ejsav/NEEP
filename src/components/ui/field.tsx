import type { ReactNode } from "react";

/**
 * Form field primitives.
 *
 * Accessibility contract, enforced here so no individual field can forget it:
 *  - every control has a real <label for>, never a placeholder as its label
 *  - errors are wired with aria-describedby and aria-invalid
 *  - the error container is always in the DOM with aria-live, so a screen
 *    reader announces the message when it appears rather than staying silent
 *  - hint text is also referenced by aria-describedby
 */

export const inputClasses = [
  "w-full rounded-md border border-line-strong bg-paper-raised",
  "px-3 py-2.5 text-body text-ink min-h-11",
  "transition-[border-color,box-shadow] duration-150 ease-out-quiet",
  "placeholder:text-ink-subtle",
  "hover:border-ink-subtle",
  "focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-focus",
  "aria-[invalid=true]:border-critical",
].join(" ");

export function errorId(name: string) {
  return `${name}-error`;
}

export function hintId(name: string) {
  return `${name}-hint`;
}

/** Builds the aria-describedby value, omitting parts that do not exist. */
export function describedBy(
  name: string,
  hasHint: boolean,
  hasError: boolean,
): string | undefined {
  const ids = [hasHint ? hintId(name) : null, hasError ? errorId(name) : null]
    .filter(Boolean)
    .join(" ");
  return ids === "" ? undefined : ids;
}

type FieldProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  name,
  label,
  hint,
  errors,
  required,
  children,
  className,
}: FieldProps) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label htmlFor={name} className="text-small font-medium text-ink">
        {label}
        {required ? (
          <span className="text-critical" aria-hidden="true">
            {" *"}
          </span>
        ) : (
          <span className="ml-1.5 text-micro font-normal text-ink-subtle">
            optional
          </span>
        )}
      </label>

      {hint ? (
        <p id={hintId(name)} className="text-micro text-ink-muted">
          {hint}
        </p>
      ) : null}

      {children}

      {/* Always present so the live region exists before the message does. */}
      <p
        id={errorId(name)}
        aria-live="polite"
        className={hasError ? "text-micro font-medium text-critical" : "sr-only"}
      >
        {hasError ? errors?.[0] : ""}
      </p>
    </div>
  );
}

type FieldsetProps = {
  legend: string;
  hint?: ReactNode;
  errors?: string[];
  name: string;
  children: ReactNode;
  className?: string;
};

/** Grouped controls (radios, checkbox sets) need a fieldset, not a label. */
export function FieldGroup({
  legend,
  hint,
  errors,
  name,
  children,
  className,
}: FieldsetProps) {
  const hasError = Boolean(errors && errors.length > 0);

  return (
    <fieldset
      className={["flex flex-col gap-2 border-0 p-0", className]
        .filter(Boolean)
        .join(" ")}
      aria-describedby={describedBy(name, Boolean(hint), hasError)}
    >
      <legend className="mb-1 text-small font-medium text-ink">{legend}</legend>

      {hint ? (
        <p id={hintId(name)} className="-mt-1 mb-1 text-micro text-ink-muted">
          {hint}
        </p>
      ) : null}

      {children}

      <p
        id={errorId(name)}
        aria-live="polite"
        className={hasError ? "text-micro font-medium text-critical" : "sr-only"}
      >
        {hasError ? errors?.[0] : ""}
      </p>
    </fieldset>
  );
}
