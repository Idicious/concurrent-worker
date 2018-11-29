import {
  ITaskOptions,
  IWorkerContext,
  noopArray,
  ThenArg,
  Transferable
} from "./types";
import { createWorkerUrl } from "./worker";

const executePromiseWorker = <T extends Array<unknown>, R>(
  worker: Worker,
  id: number,
  args: T,
  transferrable?: Transferable[]
) => {
  return new Promise<ThenArg<R>>((resolve, reject) => {
    worker.addEventListener("message", function cb(message: {
      data: [number, ThenArg<R>, boolean];
    }) {
      if (id === message.data[0]) {
        if (message.data[2]) {
          reject(message.data[1]);
        } else {
          resolve(message.data[1]);
        }
        worker.removeEventListener("message", cb);
      }
    });

    worker.addEventListener("error", function cb(error) {
      worker.removeEventListener("error", cb);
      reject(error);
    });

    worker.postMessage([id, args], transferrable);
  });
};

export const run = <T extends Array<unknown>, R>(
  task: (...args: T) => R,
  args: T,
  transferable?: Transferable[]
) => {
  const url = createWorkerUrl(task, {}, {});
  const worker = new Worker(url);

  return executePromiseWorker<T, R>(worker, -1, args, transferable).then(
    result => {
      URL.revokeObjectURL(url);
      worker.terminate();

      return result;
    }
  );
};

/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 *
 * @param task Function to execute off the main thread
 * @param context Worker context, properties of this object are available inside the worker
 * @param options Transferrable options
 */
export const create = <T extends Array<unknown>, C extends IWorkerContext, R>(
  task: (this: C, ...args: T) => R,
  context?: C,
  options: ITaskOptions<T, R> = {
    inTransferable: () => [],
    outTransferable: () => [],
    rootUrl: "",
    scriptsPath: []
  }
) => {
  const url = createWorkerUrl(task, context || {}, options);
  const getTransferable = options.inTransferable || noopArray;

  const runner = (...args: T) => {
    const worker = new Worker(url);
    const transferable = getTransferable(...args);

    return executePromiseWorker<T, R>(worker, -1, args, transferable).then(
      result => {
        worker.terminate();
        return result;
      }
    );
  };
  const kill = () => URL.revokeObjectURL(url);

  return {
    kill,
    run: runner
  };
};

export const sync = <T extends Array<unknown>, C extends IWorkerContext, R>(
  task: (this: C, ...args: T) => R,
  context?: C,
  options: ITaskOptions<T, R> = {
    inTransferable: () => [],
    outTransferable: () => [],
    rootUrl: "",
    scriptsPath: []
  }
) => {
  const url = createWorkerUrl(task, context || {}, options);
  const worker = new Worker(url);
  const getTransferable = options.inTransferable || noopArray;
  let syncId = 0;

  const runner = (...args: T) => {
    const transferable = getTransferable(...args);
    return executePromiseWorker<T, R>(worker, syncId++, args, transferable);
  };
  const kill = () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };
  return {
    kill,
    run: runner
  };
};
