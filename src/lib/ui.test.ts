import { describe, it, expect } from "vitest";

import {
  badgeClass,
  badgeToneClass,
  buttonClass,
  compactSelectClass,
  cx,
  inputClass,
  segmentClass,
  selectedFillClass,
  textareaClass,
} from "./ui";

const tokens = (s: string) => s.split(/\s+/);

describe("cx", () => {
  it("joins truthy parts and skips falsy ones", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
});

describe("buttonClass", () => {
  it("defaults to the large gradient CTA", () => {
    const c = tokens(buttonClass());
    expect(c).toEqual(
      expect.arrayContaining(["btn-brand", "h-12", "rounded-full"]),
    );
    expect(c).toContain("font-semibold");
  });

  it("defaults non-primary variants to the medium size", () => {
    for (const variant of ["solid", "outline", "danger"] as const) {
      expect(tokens(buttonClass(variant))).toContain("h-11");
    }
  });

  it("honors an explicit size", () => {
    expect(tokens(buttonClass("primary", "sm"))).toContain("h-9");
    expect(tokens(buttonClass("outline", "lg"))).toContain("h-12");
  });

  it("gives every variant a disabled and keyboard-focus state", () => {
    for (const variant of ["primary", "solid", "outline", "danger"] as const) {
      const c = tokens(buttonClass(variant));
      expect(c).toContain("disabled:opacity-60");
      expect(c).toContain("focus-visible:ring-2");
    }
  });

  it("only the danger variant is red", () => {
    expect(buttonClass("danger")).toContain("text-red-600");
    expect(buttonClass("outline")).not.toContain("red");
  });
});

describe("field classes", () => {
  // iOS Safari zooms the page when focusing a field with text under 16px.
  it("keep 16px text on every field so iOS doesn't zoom", () => {
    for (const c of [inputClass, textareaClass, compactSelectClass]) {
      expect(tokens(c)).toContain("text-base");
      expect(tokens(c)).not.toContain("text-sm");
    }
  });
});

describe("badges", () => {
  it("share one pill shape across tones", () => {
    for (const tone of ["neutral", "durak", "success", "warning"] as const) {
      const c = badgeClass(tone);
      expect(c).toContain("rounded-full");
      expect(c).toContain(badgeToneClass(tone));
    }
  });

  it("uses the aurora durak badge for the durak tone", () => {
    expect(badgeToneClass("durak")).toBe("badge-durak");
  });
});

describe("segmentClass", () => {
  it("fills the active segment with the shared selected fill", () => {
    expect(segmentClass(true)).toContain(selectedFillClass);
    expect(segmentClass(false)).not.toContain(selectedFillClass);
  });
});
