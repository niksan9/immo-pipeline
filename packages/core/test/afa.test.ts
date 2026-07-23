import { describe, it, expect } from "vitest";
import { suggestedAfaSatz } from "../src/index.js";

describe("suggestedAfaSatz — rate boundaries", () => {
  it("2.5 % for buildings before 1925", () => {
    expect(suggestedAfaSatz(1900)).toBe(2.5);
    expect(suggestedAfaSatz(1924)).toBe(2.5); // boundary
  });

  it("2.0 % from 1925 up to 2022", () => {
    expect(suggestedAfaSatz(1925)).toBe(2.0); // boundary
    expect(suggestedAfaSatz(1998)).toBe(2.0);
    expect(suggestedAfaSatz(2022)).toBe(2.0); // boundary
  });

  it("3.0 % from 2023 onward", () => {
    expect(suggestedAfaSatz(2023)).toBe(3.0); // boundary
    expect(suggestedAfaSatz(2025)).toBe(3.0);
  });
});
