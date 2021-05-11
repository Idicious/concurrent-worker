import { pool } from "../src/pool";

const delay = <T>(ms: number, val: T) =>
  new Promise<T>((resolve) => {
    setTimeout(() => resolve(val), ms);
  });

describe("Pool", () => {
  it("Queus tasks", async () => {
    const worker = pool(delay, { workers: 1 });

    const time = performance.now();
    const res = await Promise.all([
      worker.run([500, 1]),
      worker.run([500, 10]),
      worker.run([500, 3]),
    ]);
    const totalTime = performance.now() - time;

    // Expect time to be roughly equivelent to sum
    expect(totalTime).toBeGreaterThan(1500);
    expect(totalTime).toBeLessThan(1700);
    expect(res).toEqual([1, 10, 3]);

    worker.kill();
  });

  it("Concurrently runs tasks it can", async () => {
    const worker = pool(delay, { workers: 3 });

    const time = performance.now();
    const res = await Promise.all([
      worker.run([500, 1]),
      worker.run([500, 10]),
      worker.run([500, 3]),
    ]);
    const totalTime = performance.now() - time;

    // Expect time to be roughly equivelent to longest
    expect(totalTime).toBeGreaterThan(500);
    expect(totalTime).toBeLessThan(700);
    expect(res).toEqual([1, 10, 3]);

    worker.kill();
  });

  it("Concurrently runs tasks it can and switches to new ones", async () => {
    const worker = pool(delay, { workers: 2 });

    const time = performance.now();
    const res = await Promise.all([
      worker.run([500, 1]),
      worker.run([500, 10]),
      worker.run([500, 3]),
    ]);
    const totalTime = performance.now() - time;

    // Expect time to be roughly equivelent to longest
    expect(totalTime).toBeGreaterThan(1000);
    expect(totalTime).toBeLessThan(1200);
    expect(res).toEqual([1, 10, 3]);

    worker.kill();
  });

  it("Times out jobs that take to long to start", (done) => {
    // Timeout is set shorter than first worker run time, second will timeout before starting
    const worker = pool(delay, { workers: 1, timeout: 30 });

    worker.run([100, 1]).catch(fail);
    worker
      .run([10, 10])
      .then(fail)
      .catch(() => {
        worker.kill();
        done();
      });
  });
});
