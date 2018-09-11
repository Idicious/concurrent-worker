export interface Input<T extends Array<unknown>> {
  data: [number, T];
}

export declare interface IWorkerContext {
  [key: string]: unknown;
}

export type Transferable = ImageBitmap | ArrayBuffer | MessagePort;
export interface ITaskOptions<T extends Array<unknown>, R> {
  outTransferable?: (value: ThenArg<R>) => Transferable[];
  inTransferable?: (...value: T) => Transferable[];
}

// AWSOME CONDITIONAL PROMISE TYPE UNWRAPPING
// TAKEN FROM https://stackoverflow.com/questions/48011353/how-to-unwrap-type-of-a-promise
export type ThenArg<T> = T extends Promise<infer U> ? U : T;

export const noopArray = <T extends Array<unknown>>(...args: T) =>
  new Array<Transferable>();
