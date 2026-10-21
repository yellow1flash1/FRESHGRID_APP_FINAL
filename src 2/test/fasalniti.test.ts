import { describe, expect, it } from "vitest";
import {
  BENCHMARK_PROFILE,
  glutScore,
  inWindow,
  pickCards,
  rotationBonus,
  scoreBenchmark,
  scoreFarm,
} from "@/lib/fasalniti";

const r1 = (n: number) => Math.round(n * 10) / 10;

describe("FasalNiti benchmark (25% water deficit, potato +35%)", () => {
  const list = scoreBenchmark(25, 35);
  const by = (k: string) => list.find((x) => x.key === k)!;

  it("reproduces the benchmark sub-scores", () => {
    expect(r1(by("wheat").sub.climate)).toBe(78);
    expect(r1(by("mustard").sub.climate)).toBe(92);
    expect(r1(by("chana").sub.climate)).toBe(88);
    expect(r1(by("potato").sub.climate)).toBe(70);
    expect(r1(by("toria").sub.climate)).toBe(85);
    expect(Math.round(by("potato").sub.glut)).toBe(42);
    expect(by("potato").glutAlert).toBe(true);
    expect(r1(by("wheat").sub.glut)).toBe(90);
  });

  it("computes card totals with the given weight vectors", () => {
    expect(r1(by("wheat").total.safe)).toBe(81.3);
    expect(r1(by("chana").total.safe)).toBe(84.2);
    expect(r1(by("potato").total.profit)).toBe(71.2);
    expect(r1(by("toria").total.catch)).toBe(74.3);
    expect(r1(by("mustard").total.profit)).toBe(84.9);
  });

  it("de-duplicates the three cards and limits card 3 to ≤75-day crops", () => {
    const c = pickCards(list);
    expect(c.safe?.key).toBe("chana");
    expect(c.profit?.key).toBe("mustard");
    expect(c.catch?.key).toBe("toria");
  });

  it("drops thirsty crops when the water deficit is severe", () => {
    const dry = scoreBenchmark(40, 35);
    expect(dry.find((x) => x.key === "wheat")!.ok).toBe(false);
    expect(dry.find((x) => x.key === "potato")!.ok).toBe(false);
  });
});

describe("FasalNiti building blocks", () => {
  it("glut score is ~47.2 at 30% over-sowing", () => expect(r1(glutScore(0.3))).toBe(47.2));
  it("sowing windows wrap the year end", () => {
    expect(inWindow("2026-12-20", [["11-15", "01-15"]])).toBe(true);
    expect(inWindow("2027-01-10", [["11-15", "01-15"]])).toBe(true);
    expect(inWindow("2026-10-20", [["11-15", "01-15"]])).toBe(false);
  });
  it("rotation bonus rewards legumes after cereals and penalises repeats", () => {
    expect(rotationBonus("paddy", { family: "legume", deep: true })).toBe(20);
    expect(rotationBonus("paddy", { family: "oilseed", deep: true })).toBe(10);
    expect(rotationBonus("wheat", { family: "cereal", deep: false })).toBe(-30);
  });
  it("full farm pipeline gates out-of-season and over-budget crops", () => {
    const res = scoreFarm({ ...BENCHMARK_PROFILE, sowDate: "2026-11-05" });
    expect(res.find((x) => x.key === "paddy")!.gates.season).toBe(false);
    expect(res.find((x) => x.key === "potato")!.gates.budget).toBe(false); // ₹35,000 > ₹22,000
    expect(res.find((x) => x.key === "wheat")!.ok).toBe(true);
    const roi = res.filter((x) => x.ok).map((x) => x.sub.roi);
    expect(Math.max(...roi)).toBe(100);
    expect(Math.min(...roi)).toBe(0);
  });
});
