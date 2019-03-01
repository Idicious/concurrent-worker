import { pool } from "../src/pool";
import { concurrent, serial } from "../src/task";

const context = {
  a: "a",
  b: 5,
  c: true,
  d: {
    deep: "a"
  }
};

const contextFunc = function(this: typeof context) {
  return {
    a: this.a,
    b: this.b,
    c: this.c,
    d: this.d
  };
};

const rootUrl = "http://localhost:9876";
const sumScript = "/js/sum.js";
const lodashScript =
  "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js";

const square = (x: number) => x * x;
const sum = (x: number, y: number) => x + y;
const promise = (x: number) => Promise.resolve(x);

const delayedPromise = (ms: number) => {
  return new Promise<number>(resolve => {
    setTimeout(() => resolve(ms), ms);
  });
};

const transferrableFunc = (n: number, arr: Float32Array) => arr.map(x => x * n);

describe("Call chains", () => {
  it("Handles combinations of sync and async workers in a promise chain", () => {
    const syncWorker = serial(sum);
    const asyncWorkerA = concurrent(delayedPromise);
    const asyncWorkerB = concurrent(transferrableFunc, {
      inTransferable: ([_, arr]) => [arr.buffer],
      outTransferable: res => [res.buffer]
    });

    return syncWorker
      .run([1, 2])
      .then(res => asyncWorkerA.run([res]))
      .then(res => asyncWorkerB.run([res, new Float32Array([res])]))
      .then(res => {
        expect(res).toEqual(new Float32Array([9]));

        syncWorker.kill();
        asyncWorkerA.kill();
        asyncWorkerB.kill();
      });
  });
});

describe("Workers", () => {
  const workers = [
    { name: "Serial", workerType: serial },
    { name: "Concurrent", workerType: concurrent },
    { name: "Pool", workerType: pool }
  ];

  workers.forEach(({ name, workerType }) => {
    describe(name, () => {
      it("Creates a simple worker", async () => {
        const worker = workerType(sum);
        const result = await worker.run([1, 2]);

        expect(result).toBe(3);
        return await worker.kill();
      });

      it("Resolves a promise", async () => {
        const worker = workerType(promise);
        const result = await worker.run([5]);

        expect(result).toBe(5);
        return await worker.kill();
      });

      it("Can use a function as context", async () => {
        const worker = workerType(
          function(x: number) {
            const y = this.sum(x, 5);
            return this.square(y);
          },
          {
            context: { sum, square }
          }
        );
        const result = await worker.run([5]);

        expect(result).toBe(100);
        return await worker.kill();
      });

      it("Propagates thrown exception back to main thread", () => {
        const worker = workerType(() => {
          throw new Error("Test error");
        });

        return worker
          .run()
          .then(fail)
          .catch(error => {
            expect(error.message).toBe("Test error");
            worker.kill();
          });
      });

      it("Propogates promise rejection back to main thread", () => {
        const worker = workerType(() => Promise.reject("Test error"));

        return worker
          .run()
          .then(fail)
          .catch(error => {
            expect(error).toBe("Test error");
            worker.kill();
          });
      });

      it("Propogates thrown exceptions in promises back to main thread", () => {
        const worker = workerType(() => fetch("invalidUrl"));

        return worker
          .run()
          .then(fail)
          .catch(error => {
            expect(error).toBeDefined();
            worker.kill();
          });
      });

      it("Resolved different timed workers correctly", () => {
        const worker = workerType(delayedPromise);

        const long = worker.run([50]);
        const short = worker.run([10]);

        return Promise.all([long, short]).then(([longRes, shortRes]) => {
          expect(longRes).toBe(50);
          expect(shortRes).toBe(10);

          worker.kill();
        });
      });

      it("Works with transferables", async () => {
        const worker = workerType(transferrableFunc, {
          inTransferable: ([_, arr]) => [arr.buffer],
          outTransferable: res => [res.buffer]
        });

        const inputArr = new Float32Array([1, 2, 3, 4, 5]);
        const result = await worker.run([5, inputArr]);

        expect(result).toEqual(new Float32Array([5, 10, 15, 20, 25]));
        await worker.kill();
      });

      it("Handles differt context types", async () => {
        const worker = workerType(contextFunc, { context });

        const result = await worker.run();
        expect(result).toEqual(context);

        await worker.kill();
      });

      it("Can be cloned", async () => {
        const worker = workerType(contextFunc, { context });
        const cloned = worker.clone();

        const result = await cloned.run();
        expect(result).toEqual(context);

        await worker.kill();
        await cloned.kill();
      });

      it("Loads a script from base url", async () => {
        const worker = workerType(
          (x: number) => {
            return sum(x, x);
          },
          { rootUrl, scripts: [sumScript] }
        );

        const result = await worker.run([5]);
        expect(result).toBe(10);

        return await worker.kill();
      });

      // tslint:disable-next-line:prefer-const
      let _: any;
      it("Loads an external script", async () => {
        const worker = workerType(
          (x: number) => {
            return _.map([x], (n: number) => n ** n);
          },
          {
            scripts: [lodashScript]
          }
        );

        const result = await worker.run([5]);
        expect(result).toEqual([3125]);

        return await worker.kill();
      });

      it("Loads a mix of local and external scripts", async () => {
        const worker = workerType(
          (x: number) => {
            const summed = sum(x, x);
            return _.map([summed], (n: number) => n ** n);
          },
          {
            rootUrl,
            scripts: [sumScript, lodashScript]
          }
        );

        const result = await worker.run([2]);
        expect(result).toEqual([256]);

        return await worker.kill();
      });
    });
  });
});
