import { describe, expect, it } from "vitest"
import { dayKeyBefore, localDate, startOfToday } from "./date"

describe("localDate", () => {
  it("formats the local calendar day, not UTC", () => {
    // 23:30 local on Jan 15. In UTC this is already Jan 16, and using the UTC
    // date here would file a late-night session under the wrong day.
    expect(localDate(new Date(2026, 0, 15, 23, 30).getTime())).toBe("2026-01-15")
  })

  it("zero-pads month and day", () => {
    expect(localDate(new Date(2026, 2, 5).getTime())).toBe("2026-03-05")
  })
})

describe("dayKeyBefore", () => {
  it("steps back one calendar day", () => {
    expect(dayKeyBefore(new Date(2026, 0, 15), 1)).toBe("2026-01-14")
  })

  it("rolls across a month boundary", () => {
    expect(dayKeyBefore(new Date(2026, 2, 1), 1)).toBe("2026-02-28")
  })

  it("rolls across a leap day", () => {
    expect(dayKeyBefore(new Date(2028, 2, 1), 1)).toBe("2028-02-29")
  })

  it("survives the start of DST, where the day is only 23 hours long", () => {
    // The failing case. US DST began 2025-03-09, so that day is 23 hours.
    // Subtracting a flat 86,400,000 ms from midnight on the 10th overshoots to
    // 23:00 on the 8th, skipping the 9th entirely — which is what made the
    // streak read as broken the day after the clocks changed.
    const mar10 = new Date(2025, 2, 10)
    expect(dayKeyBefore(mar10, 1)).toBe("2025-03-09")

    const naive = localDate(mar10.getTime() - 86_400_000)
    expect(naive).toBe("2025-03-08")     // documents the old behaviour
    expect(naive).not.toBe(dayKeyBefore(mar10, 1))
  })

  it("survives the end of DST, where the day is 25 hours long", () => {
    // The 25-hour day lands the naive version at 01:00 rather than past
    // midnight, so it happens to keep the right date. Pinned so a future
    // refactor can't quietly regress it.
    expect(dayKeyBefore(new Date(2025, 10, 3), 1)).toBe("2025-11-02")
    expect(dayKeyBefore(new Date(2025, 10, 2), 1)).toBe("2025-11-01")
  })

  it("counts back multiple days across a DST boundary without drifting", () => {
    expect(dayKeyBefore(new Date(2025, 2, 12), 4)).toBe("2025-03-08")
    expect(dayKeyBefore(new Date(2025, 10, 4), 4)).toBe("2025-10-31")
  })

  it("returns today at offset 0", () => {
    expect(dayKeyBefore(new Date(2026, 0, 15, 18, 0), 0)).toBe("2026-01-15")
  })
})

describe("startOfToday", () => {
  it("strips the time", () => {
    const d = startOfToday(new Date(2026, 0, 15, 18, 42, 13))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(localDate(d.getTime())).toBe("2026-01-15")
  })
})
