import { Reveal } from "@/components/ui/reveal";

/**
 * The section masthead used across the public site.
 *
 * A display heading constrained to a readable measure leaves roughly a third of
 * a 68rem container empty, and repeated down a page that reads as a draft
 * rather than a decision. Pairing the heading with its standfirst in a second
 * column uses the width for something a reader actually wants - the sentence
 * that tells them whether this section is for them - instead of filling it with
 * ornament.
 *
 * Top-aligned, with the standfirst nudged down by the difference in cap height.
 * Bottom alignment was tried first and looks wrong the moment the two columns
 * have different line counts: a one-line heading beside a three-line standfirst
 * ends up sitting near the floor of the block with a hole above it. Anchoring
 * both to the top keeps the section's top edge straight whatever the copy does.
 *
 * Collapses to a single column below `lg`, heading first, which is the reading
 * order either way.
 */
export function SectionHeader({
  title,
  lede,
  eyebrow,
  as: Tag = "h2",
}: {
  title: string;
  lede?: string;
  eyebrow?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Reveal
      as="header"
      className="grid gap-x-16 gap-y-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start"
    >
      <div className="flex flex-col gap-3">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <Tag className="text-display-2 font-display text-ink">{title}</Tag>
      </div>
      {lede ? (
        <p className="max-w-measure text-body-lg text-ink-muted lg:pt-2">{lede}</p>
      ) : null}
    </Reveal>
  );
}
