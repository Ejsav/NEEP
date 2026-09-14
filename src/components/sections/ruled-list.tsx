import { Reveal } from "@/components/ui/reveal";

/**
 * A list of headed paragraphs, separated by a rule rather than boxed in cards.
 *
 * Cards were the first version and they were wrong here. Four items of very
 * different lengths in a two-column grid stretch to a common height, so a
 * three-line item sits in a box sized for a seven-line one and the section
 * fills with empty rectangles. Worse, a page made entirely of bordered boxes is
 * the default look of a generated site.
 *
 * A rule above each item costs one pixel, lets every item be exactly as tall as
 * its content, and reads as reference material - which is what this content is.
 * The homepage process steps use the same treatment, so the idiom is consistent
 * rather than per-page.
 */
export function RuledList({
  children,
  columns = 2,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
  as?: "div" | "ol" | "ul";
}) {
  return (
    <Tag
      className={[
        "grid gap-x-10 gap-y-10 sm:gap-x-12 lg:gap-x-16",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

export function RuledItem({
  heading,
  index,
  children,
  as = "div",
  headingAs: HeadingTag = "h3",
  delayMs,
}: {
  heading: string;
  /** Optional ordinal, e.g. "01". Decorative - hidden from assistive tech. */
  index?: string;
  children: React.ReactNode;
  as?: "div" | "li";
  headingAs?: "h3" | "h4";
  delayMs?: number;
}) {
  return (
    <Reveal
      as={as}
      delayMs={delayMs}
      className="flex flex-col gap-2 border-t-2 border-sage pt-4"
    >
      {index ? (
        <span className="eyebrow text-sage" aria-hidden="true">
          {index}
        </span>
      ) : null}
      <HeadingTag className="font-display text-heading-2 text-ink">
        {heading}
      </HeadingTag>
      <p className="text-small text-ink-muted">{children}</p>
    </Reveal>
  );
}
