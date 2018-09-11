export interface Input<T extends Array<unknown>> {
    data: [number, T];
}
export declare interface IWorkerContext {
    [key: string]: unknown;
}
export declare type Transferable = ImageBitmap | ArrayBuffer | MessagePort;
export interface ITaskOptions<T extends Array<unknown>, R> {
    outTransferable?: (value: ThenArg<R>) => Transferable[];
    inTransferable?: (...value: T) => Transferable[];
}
export declare type ThenArg<T> = T extends Promise<infer U> ? U : T;
export declare const noopArray: <T extends unknown[]>(...args: T) => Transferable[];
