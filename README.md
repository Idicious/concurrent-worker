# Concurrent worker

Lightweight JS library that allowes you to create web workers inline, focussed on concurrency and control flow. There are two worker creation methods, `create` and `sync`.

## Sync

Instantiates a single worker that will be used for all calls to it, while the calls are run on a backround thread they will run synchronously on that thread. This has no worker creation overhead after calling create but multiple calls do not run concurrently.

Here is a basic usage example.

```js
import { sync } from "concurrent-worker";

const worker = sync((x, y) => x + y);

worker.run(1, 2).then(result => {
  console.log(result); // 3
});
```

## Create

After creating the worker every call to run will start a new worker which will be disposed of as soon as it completes. This allowes you to run multiple calls to the worker concurrently.

```js
import { create, sync } from "concurrent-worker";

const asyncWorker = create((x, y) => x + y);
const syncWorker = sync(x => Promise.resolve(x ** x));

const runAsyncTasks = async () => {
  // These three calls will run concurrently on 3 seperate workers
  const concurrent = Promise.all([
    asyncWorker.run(1, 2),
    asyncWorker.run(2, 3),
    asyncWorker.run(3, 4)
  ]);

  const results = await concurrent; // [3, 5, 7]
  const sum = results.reduce((acc, val) => (acc += val), 0); // 15
  const final = await syncWorker.run(sum);

  console.log(final); // 225
};
```

## Context

When creating a worker you can pass in a context, all context objects can be used inside the run function. The key on the context object is the global property name in the worker.

**Important Note**
Minification and renaming can break context functionality, when minifying use function.name as key on the context object, webpack in dev mode breaks the context.

```js
import { sync } from "concurrent-worker";

const constNumber = 5;
const add = (x, y) => x + y + constNumber;
const run = (x, y) => add(x, y);

const worker = sync(run, {
  [add.name]: add,
  constNumber
});
```

## Transferrables

The third argument to `sync` and `create` provides a way to give in and out transferrables.

```js
import { sync } from "concurrent-worker";

/**
 * @param {Float32Array} typedArray
 * @param {number} inc
 */
const funcWithTransferrables = (inc, typedArray) =>
  typedArray.map(x => x + inc);

const worker = sync(
  funcWithTransferrables,
  {},
  {
    inTransferable: (inc, typedArray) => [typedArray.buffer],
    outTransferable: returnVal => [returnVal.buffer]
  }
);
```
