import { Input, ITaskOptions, IWorkerContext, Transferable } from "./types";
declare global {
    interface Window {
        run<T extends Array<unknown>, R>(...args: T): R;
        getTransferrables<T>(val: T): Transferable[];
    }
}
/**
 * Calling functions through string constants makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export declare const onmessage: <T extends unknown[], R>(message: Input<T>) => void;
export declare const createWorkerUrl: <T extends unknown[], R>(execute: (...args: T) => R, context: IWorkerContext, options: ITaskOptions<T, R>) => string;
