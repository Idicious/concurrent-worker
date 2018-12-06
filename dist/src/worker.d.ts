import { Input } from "./types";
declare global {
    interface Window {
        run<T extends Array<unknown>, R>(...args: T): R;
        getTransferrables<T>(val: T): Transferable[];
        getError(e: any): any;
    }
}
export declare const noop: () => never[];
/**
 * Calling functions through strings makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Webpack dev and prod mode, Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export declare const onmessage: <T extends unknown[], R>(message: Input<T>) => void;
export declare const getError: (e: any) => any;
