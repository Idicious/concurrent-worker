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
import { create } from "concurrent-worker";

const worker = create((x, y) => x + y);
const runAsyncTasks = async () => {
  // These three calls will run concurrently on 3 seperate workers
  const concurrent = Promise.all([
    worker.run(1, 2),
    worker.run(2, 3),
    worker.run(3, 4)
  ]);

  const results = await concurrent; // [3, 5, 7]
  const sum = results.reduce((acc, val) => (acc += val), 0);
  const final = worker.run(5, sum);
};

worker.run(1, 2).then(result => {
  console.log(result); // 3
});
```
