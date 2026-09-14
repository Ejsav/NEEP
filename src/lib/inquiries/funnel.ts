import "server-only";
import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { inquiryDrafts } from "@/lib/db/schema";
import { ABANDON_AFTER_MINUTES } from "@/lib/inquiries/drafts";
import { FINAL_STEP, PLANNER_STEPS } from "@/lib/domain/planner-steps";

/**
 * Funnel read model.
 *
 * The planner has been writing a row per visitor and an event per step since it
 * shipped, and nothing has ever read either. That makes the single riskiest
 * assumption in PLAN.md - that a five-step planner raises qualified submissions
 * rather than suppressing them - a belief rather than a measurement. This is
 * the measurement.
 *
 * Abandonment is DERIVED AT READ TIME rather than written by a scheduler: a
 * draft is abandoned when it is still active and has not been touched for
 * ABANDON_AFTER_MINUTES. No cron, nothing to fall behind, and the definition
 * lives in one place.
 *
 * Every query here is an aggregate. Nothing in this module returns a draft row,
 * because a draft is a record of a funnel rather than of a person and there is
 * nothing about an individual one worth looking at.
 */

export type StepRow = {
  step: number;
  legend: string;
  /** Visitors whose furthest step was at least this one. */
  reached: number;
  /** Of those, how many went on to the next step. */
  continued: number;
  /** continued / reached, or null when nobody reached it. */
  continuationRate: number | null;
  /** Visitors who stopped here and have not come back. */
  abandonedHere: number;
};

export type FunnelSummary = {
  started: number;
  converted: number;
  abandoned: number;
  /** Active and touched within the abandonment window: still filling it in. */
  live: number;
  /** converted / started, or null with no data. */
  conversionRate: number | null;
  steps: StepRow[];
  /** What the people who gave up were planning. Aggregate only. */
  abandonedByEventType: { eventType: string | null; value: number }[];
  /** How many abandoned drafts carry a usable answer beyond step 1. */
  abandonedWithDetail: number;
};

function cutoffFrom(now: Date): Date {
  return new Date(now.getTime() - ABANDON_AFTER_MINUTES * 60_000);
}

/** furthest_step -> count, for one slice of the table. */
async function stepCounts(where: SQL | undefined) {
  const rows = await db
    .select({ step: inquiryDrafts.furthestStep, value: count() })
    .from(inquiryDrafts)
    .where(where)
    .groupBy(inquiryDrafts.furthestStep);

  const map = new Map<number, number>();
  for (const row of rows) map.set(row.step, row.value);
  return map;
}

export async function funnelSummary(now: Date = new Date()): Promise<FunnelSummary> {
  const cutoff = cutoffFrom(now);

  const isConverted = eq(inquiryDrafts.status, "converted");
  const isAbandoned = and(
    eq(inquiryDrafts.status, "active"),
    lt(inquiryDrafts.updatedAt, cutoff),
  );
  const isLive = and(
    eq(inquiryDrafts.status, "active"),
    gte(inquiryDrafts.updatedAt, cutoff),
  );

  const [convertedSteps, abandonedSteps, liveSteps, byType, withDetail] =
    await Promise.all([
      stepCounts(and(isConverted)),
      stepCounts(isAbandoned),
      stepCounts(isLive),
      db
        .select({ eventType: inquiryDrafts.eventType, value: count() })
        .from(inquiryDrafts)
        .where(isAbandoned)
        .groupBy(inquiryDrafts.eventType)
        .orderBy(desc(count())),
      db
        .select({ value: count() })
        .from(inquiryDrafts)
        .where(and(isAbandoned, sql`${inquiryDrafts.furthestStep} > 1`)),
    ]);

  const total = (map: Map<number, number>) =>
    [...map.values()].reduce((sum, n) => sum + n, 0);

  const converted = total(convertedSteps);
  const abandoned = total(abandonedSteps);
  const live = total(liveSteps);
  const started = converted + abandoned + live;

  /*
   * A converted draft reached the final step by definition, so it counts toward
   * every step's "reached". Without that the conversion column and the step
   * columns tell contradictory stories about the same visitors.
   */
  const furthestOf = (step: number) => {
    const a = abandonedSteps.get(step) ?? 0;
    const l = liveSteps.get(step) ?? 0;
    const c = step === FINAL_STEP ? converted : 0;
    return a + l + c;
  };

  const reachedAtLeast = (step: number) => {
    let sum = 0;
    for (let s = step; s <= FINAL_STEP; s += 1) sum += furthestOf(s);
    return sum;
  };

  const steps: StepRow[] = PLANNER_STEPS.map((definition) => {
    const reached = reachedAtLeast(definition.step);
    const continued =
      definition.step === FINAL_STEP ? converted : reachedAtLeast(definition.step + 1);
    return {
      step: definition.step,
      legend: definition.legend,
      reached,
      continued,
      continuationRate: reached > 0 ? continued / reached : null,
      abandonedHere: abandonedSteps.get(definition.step) ?? 0,
    };
  });

  return {
    started,
    converted,
    abandoned,
    live,
    conversionRate: started > 0 ? converted / started : null,
    steps,
    abandonedByEventType: byType,
    abandonedWithDetail: withDetail[0]?.value ?? 0,
  };
}
