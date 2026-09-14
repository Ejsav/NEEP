/**
 * A spec list: short label, plain fact, hairline between each.
 *
 * Deliberately not a card grid. These are the two or three things a visitor
 * needs to know before anything else - where we work, what we take on, how fast
 * we answer - and dressing each one in its own bordered box makes three facts
 * look like a feature comparison. Ruled rows read as reference material, which
 * is what they are.
 *
 * Every entry must be a verifiable fact about how the company operates. Nothing
 * here may be a claim about past work. See docs/TRUST_STRATEGY.md.
 */
export function FactList({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col border-t border-line">{children}</dl>;
}

export function Fact({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-b border-line py-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
      <dt className="eyebrow pt-1 text-ink-subtle">{term}</dt>
      <dd className="text-small text-ink">{children}</dd>
    </div>
  );
}
