import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional class names", () => {
    expect(cn("px-2", false && "hidden", "text-sm")).toBe("px-2 text-sm");
  });

  it("lets later Tailwind classes override earlier classes", () => {
    expect(cn("p-2 text-sm", "p-4")).toBe("text-sm p-4");
  });
});
