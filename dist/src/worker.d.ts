import { Input, ITaskOptions, IWorkerContext, Transferable } from "./types";
declare global {
    interface Window {
        run<T extends Array<unknown>, R>(...args: T): R;
        getTransferrables<T>(val: T): Transferable[];
    }
}
export declare const onmessage: <T extends unknown[], R>(message: Input<T>) => void;
export declare const createWorkerUrl: <T extends unknown[], R>(execute: (...args: T) => R, context: IWorkerContext, options: ITaskOptions<T, R>) => string;
