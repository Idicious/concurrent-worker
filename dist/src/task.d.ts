import { ITaskOptions, IWorkerContext, ThenArg } from "./types";
/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 * This creation method creates a new web worker for each call to it allowing multiple calls to run in paralel.
 *
 * @param task Function to execute off the main thread
 * @param context Worker context, properties of this object are available inside the worker
 * @param options Transferrable options
 */
export declare const create: <T extends unknown[], C extends IWorkerContext, R>(task: (this: C, ...args: T) => R, options?: ITaskOptions<T, R, C>) => {
    kill: () => void;
    run: (args: T) => Promise<ThenArg<R>>;
};
/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 * This creation method uses a single web worker for all calls to it, calls will be processed synchonously
 * in that worker. Has les overhead than `create` but does not run multiple calls in paralel.
 *
 * @param task Function to execute off the main thread
 * @param context Worker context, properties of this object are available inside the worker
 * @param options Transferrable options
 */
export declare const sync: <T extends unknown[], C extends IWorkerContext, R>(task: (this: C, ...args: T) => R, options?: ITaskOptions<T, R, C>) => {
    kill: () => void;
    run: (args: T) => Promise<ThenArg<R>>;
};
