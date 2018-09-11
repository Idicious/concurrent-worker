import { ITaskOptions, IWorkerContext, ThenArg, Transferable } from "./types";
export declare const run: <T extends unknown[], R>(task: (...args: T) => R, args: T, transferable?: Transferable[] | undefined) => Promise<ThenArg<R>>;
/**
 * Creates a task that can be run in a webworker. If you want to use functions and variables from
 * the outer scope you must pass them in via the context parameter, else they will not be available.
 *
 * @param task Function to execute off the main thread
 * @param context Worker context, properties of this object are available inside the worker
 * @param options Transferrable options
 */
export declare const create: <T extends unknown[], R>(task: (...args: T) => R, context?: IWorkerContext | undefined, options?: ITaskOptions<T, R>) => {
    kill: () => void;
    run: (...args: T) => Promise<ThenArg<R>>;
};
export declare const sync: <T extends unknown[], R>(task: (...args: T) => R, context?: IWorkerContext | undefined, options?: ITaskOptions<T, R>) => {
    kill: () => void;
    run: (...args: T) => Promise<ThenArg<R>>;
};
