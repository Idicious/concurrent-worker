import {
  IResponse,
  IWorker,
  IWorkerConfig,
  IWorkerContext,
  Reject,
  Resolve,
  RunFunc,
  WorkerThis,
} from "./types";
import {
  createWorkerUrl,
  getScriptImport,
  noop,
  onMessage,
  toSource,
} from "./worker";

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
  R,
>(
  task: ((this: WorkerThis<C>, ...args: T) => R) | string,
  config: IWorkerConfig<T, C, R> = {},
): IWorker<T, C, R> => {
  const url =
    typeof task === "string"
      ? task
      : createWorkerUrl(
          task,
          config,
          getScriptImport,
          toSource,
          noop,
          onMessage,
        );
  const getTransferable = config.inTransferable ?? noop;

  const run = ((args: T) => {
    return new Promise<Awaited<R>>((resolve, reject) => {
      const worker = new Worker(url);
      worker.addEventListener(
        "message",
        (msg: IResponse<R>) => {
          const [_, dataOrError, hasError] = msg.data;

          if (hasError) {
            reject(dataOrError);
          } else {
            resolve(dataOrError);
          }

          worker.terminate();
        },
        { once: true },
      );

      worker.postMessage([0, args], getTransferable(args));
    });
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
  config: IWorkerConfig<T, C, R> = {},
): IWorker<T, C, R> => {
  const url =
    typeof task === "string"
      ? task
      : createWorkerUrl(
          task,
          config,
          getScriptImport,
          toSource,
          noop,
          onMessage,
        );
  const worker = new Worker(url);
  const getTransferable = config.inTransferable ?? noop;
  const resolverMap = new Map<
    number,
    { resolve: Resolve<R>; reject: Reject }
  >();

  worker.addEventListener("message", (message: IResponse<R>) => {
    const [syncId, dataOrError, hasError] = message.data;

    const resolver = resolverMap.get(syncId);
    if (resolver == null) return;
    resolverMap.delete(syncId);

    if (hasError) {
      resolver.reject(dataOrError);
    } else {
      resolver.resolve(dataOrError);
    }
  });

  let syncId = 0;

  const run = ((args: T) => {
    const syncIdLocal = syncId++;

    const transferable = getTransferable(args);
    worker.postMessage([syncIdLocal, args], transferable);

    return new Promise<Awaited<R>>((resolve, reject) => {
      resolverMap.set(syncIdLocal, { resolve, reject });
    });
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
