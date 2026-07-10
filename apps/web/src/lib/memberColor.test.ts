import { describe, expect, it } from "vitest";

import { MEMBER_COLORS, colorForUserId, initials } from "./memberColor";

describe("colorForUserId", () => {
  it("returns the same color for the same id every time", () => {
    expect(colorForUserId("user-1")).toBe(colorForUserId("user-1"));
  });

  it("returns a color from the fixed palette", () => {
    expect(MEMBER_COLORS).toContain(colorForUserId("user-1"));
    expect(MEMBER_COLORS).toContain(colorForUserId("some-other-user"));
  });
});

describe("initials", () => {
  it("returns the first letter of a single-word name, uppercased", () => {
    expect(initials("ana")).toBe("A");
  });

  it("returns first+last initials for a multi-word name", () => {
    expect(initials("Ana Silva")).toBe("AS");
  });

  it("ignores extra whitespace between words", () => {
    expect(initials("  Ana   Maria Silva  ")).toBe("AS");
  });
});
