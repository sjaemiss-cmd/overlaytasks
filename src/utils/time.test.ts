import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { addMinutesToLocalDatetime, formatDeadline, minutesUntil } from "./time";

describe("minutesUntil", () => {
  it("returns positive minutes for future deadlines", () => {
    const now = dayjs("2026-01-01T00:00:00");
    const deadline = "2026-01-01T01:00:00";
    expect(minutesUntil(deadline, now)).toBe(60);
  });

  it("returns negative minutes for past deadlines", () => {
    const now = dayjs("2026-01-01T01:00:00");
    const deadline = "2026-01-01T00:00:00";
    expect(minutesUntil(deadline, now)).toBe(-60);
  });
});

describe("formatDeadline", () => {
  it("formats ISO string as expected", () => {
    expect(formatDeadline("2026-01-02T03:04:00")).toBe("2026/01/02 03:04");
  });
});

describe("addMinutesToLocalDatetime", () => {
  it("adds minutes to an existing local datetime value", () => {
    expect(addMinutesToLocalDatetime("2026-01-01T00:00", 60)).toBe("2026-01-01T01:00");
  });

  it("falls back to provided base when value is invalid", () => {
    const base = dayjs("2026-01-01T00:00");
    expect(addMinutesToLocalDatetime("", 60, base)).toBe("2026-01-01T01:00");
  });
});
