import { create, sync } from "../src/task";

const square = (x: number) => x * x;
const sum = (x: number, y: number) => x + y;
const promise = (x: number) => Promise.resolve(x);

const delayedPromise = (time: number) => {
  return new Promise<number>(resolve => {
    setTimeout(() => resolve(time), time);
  });
};

const transferrableFunc = (n: number, arr: Float32Array) => arr.map(x => x * n);

describe("Call chains", () => {
  it("Handles combinations of sync and async workers in a promise chain", () => {
    const syncWorker = sync(sum);
    const asyncWorkerA = create(delayedPromise);
    const asyncWorkerB = create(transferrableFunc, {
      inTransferable: ([_, arr]) => [arr.buffer],
      outTransferable: res => [res.buffer]
    });

    return syncWorker
      .run([1, 2])
      .then(res => asyncWorkerA.run([res]))
      .then(res => asyncWorkerB.run([res, new Float32Array([res])]))
      .then(res => {
        expect(res).toEqual(new Float32Array([9]));
      })
      .finally(() => {
        syncWorker.kill();
        asyncWorkerA.kill();
        asyncWorkerB.kill();
      });
  });
});

describe("Script loading", () => {
  it("Loads a script from base url", async () => {
    const worker = sync(
      (x: number) => {
        return sum(x, x);
      },
      { rootUrl: "http://localhost:9876", scriptsPath: ["/js/sum.js"] }
    );

    const result = await worker.run([5]);
    expect(result).toBe(10);

    worker.kill();
  });

  // tslint:disable-next-line:prefer-const
  let _: any;
  it("Loads an external script", async () => {
    const worker = sync(
      (x: number) => {
        return _.map([x], (n: number) => n ** n);
      },
      {
        scriptsPath: [
          "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.js"
        ]
      }
    );

    const result = await worker.run([5]);
    expect(result).toEqual([3125]);

    worker.kill();
  });

  it("Loads a mix of local and external scripts", async () => {
    const worker = sync(
      (x: number) => {
        const summed = sum(x, x);
        return _.map([summed], (n: number) => n ** n);
      },
      {
        rootUrl: "http://localhost:9876",
        scriptsPath: [
          "/js/sum.js",
          "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.js"
        ]
      }
    );

    const result = await worker.run([2]);
    expect(result).toEqual([256]);

    worker.kill();
  });
});

describe("Sync worker", () => {
  it("Creates a simple worker", async () => {
    const worker = sync(sum);
    const result = await worker.run([1, 2]);

    expect(result).toBe(3);
    worker.kill();
  });

  it("Resolves a promise", async () => {
    const worker = sync(promise);
    const result = await worker.run([5]);

    expect(result).toBe(5);
    worker.kill();
  });

  it("Can use a function as context", async () => {
    const worker = sync(
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
    worker.kill();
  });

  it("Propagates thrown exception back to main thread", () => {
    const worker = sync(() => {
      throw new Error("Test error");
    });

    return worker
      .run([])
      .catch(error => {
        expect(error.message).toBe("Test error");
      })
      .finally(worker.kill);
  });

  it("Propogates promise rejection back to main thread", () => {
    const worker = sync(() => Promise.reject("Test error"));

    return worker
      .run([])
      .catch(error => {
        expect(error).toBe("Test error");
      })
      .finally(worker.kill);
  });

  it("Resolved different timed workers correctly", () => {
    const worker = sync(delayedPromise);

    const long = worker.run([50]);
    const short = worker.run([10]);

    return Promise.all([long, short])
      .then(([longRes, shortRes]) => {
        expect(longRes).toBe(50);
        expect(shortRes).toBe(10);
      })
      .finally(worker.kill);
  });

  it("Works with transferables", async () => {
    const worker = sync((n: number, arr: Float32Array) => arr.map(x => x * n), {
      inTransferable: ([_, arr]) => [arr.buffer],
      outTransferable: res => [res.buffer]
    });

    const inputArr = new Float32Array([1, 2, 3, 4, 5]);
    const result = await worker.run([5, inputArr]);

    expect(result).toEqual(new Float32Array([5, 10, 15, 20, 25]));
    worker.kill();
  });

  it("Handles differt context types", async () => {
    const context = {
      a: "a",
      b: 5,
      c: true,
      d: {
        deep: "a"
      }
    };
    const worker = sync(
      function() {
        return {
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d
        };
      },
      { context }
    );

    const result = await worker.run([]);
    expect(result).toEqual(context);

    worker.kill();
  });
});

describe("Async worker", () => {
  it("Creates a simple worker", async () => {
    const worker = create(sum);
    const result = await worker.run([1, 2]);

    expect(result).toBe(3);
    worker.kill();
  });

  it("Resolves a promise", async () => {
    const worker = create(promise);
    const result = await worker.run([5]);

    expect(result).toBe(5);
    worker.kill();
  });

  it("Can use a function as context", async () => {
    const worker = create(
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
    worker.kill();
  });

  it("Propogates thrown exception back to main thread", () => {
    const worker = create(() => {
      throw new Error("Test error");
    });

    return worker
      .run([])
      .catch(e => {
        expect(e.message).toBe("Test error");
      })
      .finally(worker.kill);
  });

  it("Propagates promise rejection back to main thread", () => {
    const worker = create(() => Promise.reject("Test error"));

    return worker
      .run([])
      .catch(e => {
        expect(e).toBe("Test error");
      })
      .finally(worker.kill);
  });

  it("Resolved different timed workers correctly", () => {
    const worker = create(delayedPromise);

    const long = worker.run([50]);
    const short = worker.run([10]);

    return Promise.all([long, short])
      .then(([longRes, shortRes]) => {
        expect(longRes).toBe(50);
        expect(shortRes).toBe(10);
      })
      .finally(worker.kill);
  });

  it("Works with transferables", async () => {
    const worker = create(
      (n: number, arr: Float32Array) => arr.map(x => x * n),
      {
        inTransferable: ([_, arr]) => [arr.buffer],
        outTransferable: res => [res.buffer]
      }
    );

    const inputArr = new Float32Array([1, 2, 3, 4, 5]);
    const result = await worker.run([5, inputArr]);

    expect(result).toEqual(new Float32Array([5, 10, 15, 20, 25]));
    worker.kill();
  });

  it("Handles differt context types", async () => {
    const context = {
      a: "a",
      b: 5,
      c: true,
      d: {
        deep: "a"
      }
    };
    const worker = sync(
      function() {
        return {
          a: this.a,
          b: this.b,
          c: this.c,
          d: this.d
        };
      },
      { context }
    );

    const result = await worker.run([]);
    expect(result).toEqual(context);

    worker.kill();
  });
});
