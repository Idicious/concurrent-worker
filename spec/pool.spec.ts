import { pool } from "../src/pool";

const delay = <T>(ms: number, val: T) =>
  new Promise<T>(resolve => {
    setTimeout(() => resolve(val), ms);
  });

describe("Pool", () => {
  it("Queus tasks", async () => {
    const worker = pool(delay, { workers: 1 });

    const time = performance.now();
    const res = await Promise.all([
      worker.run([100, 1]),
      worker.run([500, 10]),
      worker.run([300, 3])
    ]);
    const totalTime = performance.now() - time;

    expect(res).toEqual([1, 10, 3]);

    // Expect time to be roughly equivelent to sum
    expect(totalTime).toBeGreaterThan(850);
    expect(totalTime).toBeLessThan(950);
  });

  it("Concurrently runs tasks it can", async () => {
    const worker = pool(delay, { workers: 3 });

    const time = performance.now();
    const res = await Promise.all([
      worker.run([100, 1]),
      worker.run([500, 10]),
      worker.run([300, 3])
    ]);
    const totalTime = performance.now() - time;

    expect(res).toEqual([1, 10, 3]);

    // Expect time to be roughly equivelent to longest
    expect(totalTime).toBeGreaterThan(450);
    expect(totalTime).toBeLessThan(550);
  });
});
