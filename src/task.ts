import {
  IResponse,
  IWorker,
  IWorkerConfig,
  IWorkerContext,
  Reject,
  Resolve,
  RunFunc,
  ThenArg,
  WorkerThis,
} from "./types";
import { noop } from "./worker";
import { createWorkerUrl } from "./worker-creation";

/**
 * Create a worker onmessage callback that resolves or rejects if the sync id matches.
 */
const createWorkerCallback = <R>(
  worker: Worker,
  syncIdPing: number,
  resolve: Resolve<R>,
  reject: Reject
) =>
  function cb(message: IResponse<R>) {
    const syncIdPong = message.data[0];
    const dataOrError = message.data[1];
    const hasError = message.data[2];

    if (syncIdPing === syncIdPong) {
      if (hasError) {
        reject(dataOrError);
      } else {
        resolve(dataOrError);
      }
      worker.removeEventListener("message", cb);
    }
  };

/**
 * Call worker with given arguments, returns a promise that resolves when onmessage is called
 * with matching syncId.
 */
export const executePromiseWorker = <T extends Array<unknown>, R>(
  worker: Worker,
  syncId: number,
  args: T,
  transferrable: Transferable[] = []
) =>
  new Promise<ThenArg<R>>((resolve, reject) => {
    worker.addEventListener(
      "message",
      createWorkerCallback(worker, syncId, resolve, reject)
    );

    worker.postMessage([syncId, args], transferrable);
  });

/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 * This creation method creates a new web worker for each call to it allowing multiple calls to run in paralel.
 *
 * @param task Function to execute off the main thread
 * @param config Worker configuration
 */
export const concurrent = <
  T extends Array<unknown>,
  C extends IWorkerContext,
  R
>(
  task: ((this: WorkerThis<C>, ...args: T) => R) | string,
  config: IWorkerConfig<T, C, R> = {}
): IWorker<T, C, R> => {
  const url =
    typeof task === "string" ? task : createWorkerUrl(task, config, true);
  const getTransferable = config.inTransferable ?? noop;

  const run = ((args: T) => {
    const worker = new Worker(url);
    const transferable = getTransferable(args);

    return executePromiseWorker<T, R>(worker, -1, args, transferable);
  }) as RunFunc<T, R>;

  const kill = () => {
    URL.revokeObjectURL(url);
  };

  /**
   * Returns an identical copy that runs on it's own workers
   */
  const clone = () => concurrent(url, config);

  return {
    clone,
    kill,
    run,
  };
};

/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 * This creation method uses a single web worker for all calls to it, calls will be processed synchronously
 * in that worker. Has les overhead than `create` but does not run multiple calls in paralel.
 *
 * @param task Function to execute off the main thread, or object url pointing to worker script
 * @param config Worker configuration
 */
export const serial = <T extends Array<unknown>, C extends IWorkerContext, R>(
  task: ((this: WorkerThis<C>, ...args: T) => R) | string,
  config: IWorkerConfig<T, C, R> = {}
): IWorker<T, C, R> => {
  const url = typeof task === "string" ? task : createWorkerUrl(task, config);
  const worker = new Worker(url);
  const getTransferable = config.inTransferable ?? noop;
  let syncId = 0;

  const run = ((args: T) => {
    const transferable = getTransferable(args);
    return executePromiseWorker<T, R>(worker, syncId++, args, transferable);
  }) as RunFunc<T, R>;

  const kill = () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };

  /**
   * Returns an identical copy that runs on it's own worker
   */
  const clone = () => serial(url, config);

  return {
    clone,
    kill,
    run,
  };
};
