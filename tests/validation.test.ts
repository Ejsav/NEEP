import { describe, expect, it } from "vitest";
import {
  inquiryInputSchema,
  looksLikeSpam,
  toFieldErrors,
} from "@/lib/validation/inquiry";

/**
 * Server validation is the authority for what reaches the database. These tests
 * exist because a regression here either loses real customers (over-strict) or
 * lets junk through (under-strict), and both are expensive.
 */

function futureDate(daysAhead = 200): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

const validBase = {
  eventType: "wedding",
  firstName: "Dana",
  lastName: "Whitfield",
  email: "dana@example.com",
  phone: "(860) 555-0134",
  contactPreference: "either",
  eventDate: futureDate(),
  eventDateFlexible: false,
  guestCountMin: 80,
  guestCountMax: 120,
  venueStatus: "shortlisted",
  venueName: "Saint Clements Castle",
  eventTown: "Portland",
  budgetBand: "25k_50k",
  servicesNeeded: ["vendor_sourcing", "venue_sourcing"],
  message: "Looking for help with the whole weekend.",
};

describe("inquiryInputSchema", () => {
  it("accepts a complete, realistic submission", () => {
    const result = inquiryInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts the minimum viable submission", () => {
    const result = inquiryInputSchema.safeParse({
      eventType: "corporate",
      firstName: "Sam",
      lastName: "Ortiz",
      email: "sam@example.com",
      eventDateFlexible: "on",
      servicesNeeded: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown event type", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      eventType: "party_bus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a service value that is not in the canonical list", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      servicesNeeded: ["venue_sourcing", "definitely_not_a_service"],
    });
    expect(result.success).toBe(false);
  });

  it("normalises email case and surrounding whitespace", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      email: "  DANA@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("dana@example.com");
  });

  it("rejects a malformed email", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      email: "dana@@example",
    });
    expect(result.success).toBe(false);
  });

  it("requires a date unless the customer says they are flexible", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      eventDate: "",
      eventDateFlexible: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).eventDate).toBeDefined();
    }
  });

  it("accepts no date when the flexible box is ticked", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      eventDate: "",
      eventDateFlexible: "on",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a date in the past", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      eventDate: "2019-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a date beyond the planning horizon", () => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + 9);
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      eventDate: d.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a guest range where the maximum is below the minimum", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      guestCountMin: 300,
      guestCountMax: 50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).guestCountMax).toBeDefined();
    }
  });

  it("parses guest counts typed with separators", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      guestCountMin: "1,200",
      guestCountMax: "1,500",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.guestCountMin).toBe(1200);
  });

  it("requires a phone number when the customer asks to be phoned", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      phone: "",
      contactPreference: "phone",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).phone).toBeDefined();
    }
  });

  it("rejects a phone number with too few digits", () => {
    const result = inquiryInputSchema.safeParse({ ...validBase, phone: "555-01" });
    expect(result.success).toBe(false);
  });

  it("accepts the ways people actually type US phone numbers", () => {
    for (const phone of [
      "8605550134",
      "(860) 555-0134",
      "860.555.0134",
      "+1 860 555 0134",
    ]) {
      const result = inquiryInputSchema.safeParse({ ...validBase, phone });
      expect(result.success, `expected ${phone} to be accepted`).toBe(true);
    }
  });

  it("strips control characters from free text", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      firstName: "Da\u0000n\u0007a",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firstName).toBe("Dana");
  });

  it("rejects free text beyond the column limit", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      message: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("treats empty optional strings as absent rather than empty", () => {
    const result = inquiryInputSchema.safeParse({
      ...validBase,
      venueName: "",
      eventTown: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.venueName).toBeUndefined();
      expect(result.data.eventTown).toBeUndefined();
    }
  });
});

describe("looksLikeSpam", () => {
  const base = {
    eventType: "wedding",
    firstName: "Dana",
    lastName: "Whitfield",
    email: "dana@example.com",
    contactPreference: "either" as const,
    eventDateFlexible: true,
    servicesNeeded: [] as string[],
  };

  function parse(overrides: Record<string, unknown>) {
    const result = inquiryInputSchema.safeParse({ ...base, ...overrides });
    if (!result.success) throw new Error("fixture failed to parse");
    return result.data;
  }

  it("passes a normal inquiry", () => {
    expect(
      looksLikeSpam(
        parse({ message: "We're planning a September wedding in Mystic." }),
      ),
    ).toBeNull();
  });

  it("passes a message containing one legitimate link", () => {
    expect(
      looksLikeSpam(
        parse({ message: "Here's the venue: https://example.com/venue" }),
      ),
    ).toBeNull();
  });

  it("flags a message stuffed with links", () => {
    expect(
      looksLikeSpam(
        parse({
          message: "https://a.com https://b.com https://c.com https://d.com",
        }),
      ),
    ).toBe("message_link_count");
  });

  it("flags embedded markup", () => {
    expect(looksLikeSpam(parse({ message: '<a href="http://x.com">buy</a>' }))).toBe(
      "message_markup",
    );
  });

  it("flags an SEO solicitation by keyword", () => {
    expect(
      looksLikeSpam(parse({ message: "We offer SEO services and backlinks." })),
    ).toBe("message_keyword");
  });

  it("flags a URL in the name field", () => {
    expect(looksLikeSpam(parse({ firstName: "https://spam.example" }))).toBe(
      "name_url",
    );
  });
});
