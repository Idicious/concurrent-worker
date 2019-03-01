[![npm version](https://badge.fury.io/js/concurrent-worker.svg)](https://badge.fury.io/js/concurrent-worker)
[![Build Status](https://travis-ci.org/Idicious/concurrent-worker.svg?branch=master)](https://travis-ci.org/Idicious/concurrent-worker)
[![Coverage Status](https://coveralls.io/repos/github/Idicious/concurrent-worker/badge.svg?branch=master)](https://coveralls.io/github/Idicious/concurrent-worker?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/Idicious/concurrent-worker.svg)](https://greenkeeper.io/)

# Concurrent worker

This library allowes you to create web workers inline, focussed on concurrency and control flow. It is Promise based, this allowes control
flow to be regulated via Promise chains as well as async / await. You can also pass in and use functions and objects / primitives from the main thread via the context. All exceptions and promise rejections are propagated to the main thread and can be handled in a promise catch or try / catch block in an async function.

There are two worker creation methods, `serial` and `concurrent`. A `serial` worker will create a single `Worker` that all calls to it will be executed on. A `concurrent` worker will create a new `Worker` for each call to it, this allowes you to run multiple calls in parallel. The API's of both are identical.

```sh
npm install concurrent-worker --save
```

```js
import { serial } from "concurrent-worker";

const worker = serial((x, y) => x + y);

worker.run([1, 2]).then(result => {
  console.log(result); // 3
});
```

## Config

The second, optional, argument to the creation method is a configuration object, this has the following properties:

| Key              | Type     | Description                                                                                                             | Default  |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| context          | object   | All functions, objects and primitives on this object are available in the Worker, they can be accessed via `this.{key}` | {}       |
| inTransferrable  | Function | A function that returns an array of Transferrable objects from the input arguments                                      | () => [] |
| outTransferrable | Function | A function that returns an array of Transferrable objects from the result object.                                       | () => [] |
| rootUrl          | string   | Scripts loaded from a relative path need to be prepended with the sites root URL.                                       | ''       |
| scripts          | string[] | Array of script URL's, these scripts are loaded in the worker when it's instantiated.                                   | []       |

## Examples

### Concurrent worker with async / await and Promise.all

```js
import { concurrent } from "concurrent-worker";

const sum = (x, y) => x + y;
const concurrentWorker = concurrent(sum);

const runAsyncTasks = async () => {
  // These three calls will run concurrently on 3 seperate workers
  const processes = Promise.all([
    concurrentWorker.run([1, 2]),
    concurrentWorker.run([2, 3]),
    concurrentWorker.run([3, 4])
  ]);

  const results = await processes; // [3, 5, 7]
  const summed = results.reduce((acc, val) => (acc += val), 0);

  console.log(summed); // 15
};
```

### Using context with TypeScript

```ts
import { serial } from "concurrent-worker";

const constNumber = 5;

function add(this: typeof ctx, x: number, y: number) {
  return x + y + this.constNumber;
}

function run(this: typeof ctx, x: number, y: number) {
  return this.add(x, y);
}

const context = { add, constNumber };
const worker = serial(run, { context });
```

### Using in and out Transferrables

```ts
import { serial } from "concurrent-worker";

const arrayAdd = (n: number, arr: Float32Array) => arr.map(x => x + n);

const worker = serial(arrayAdd, {
  inTransferrable: ([n, arr]) => [arr.buffer],
  outTransferrable: arr => [arr.buffer]
});

const arr = new Float32Array([1, 2, 3, 4]);

worker.run([5, arr]).then(console.log); // Float32Array([6, 7, 8, 9])
```

### Using a combination of self hosted and external scripts

```ts
import { concurrent } from "concurrent-worker";

// Function using lodash map from cdn and sum function from self hosted script import.
const arrayAdd = (n: number, arr: Float32Array) => _.map(arr, x => sum(x, n));

const worker = concurrent(arrayAdd, {
  inTransferrable: ([n, arr]) => [arr.buffer],
  outTransferrable: arr => [arr.buffer],
  rootUrl: "http://www.mydomain.com",
  scripts: [
    "/js/sum.js",
    "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.js"
  ]
});

const arr = new Float32Array([1, 2, 3, 4]);

worker.run([5, arr]).then(console.log); // Float32Array([6, 7, 8, 9])
```

### Returning a Promise

If your wrapped function returns a Promise, it will be resolved in
the worker before returning to the main thread.

```js
import { serial } from "concurrent-worker";

const worker = serial((x, y) => Promise.resolve(x + y));

worker.run([1, 2]).then(result => {
  console.log(result); // 3
});
```
