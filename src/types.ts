export declare interface Input<T extends Array<unknown>> {
  data: [number, T];
}

export declare interface IResponse<R> {
  data: [number, ThenArg<R>, boolean];
}

export declare interface IWorkerContext {
  [key: string]: unknown;
}

export declare type Transferable =
  | ImageBitmap
  | ArrayBuffer
  | MessagePort
  | SharedArrayBuffer;

export declare interface IWorkerConfig<
  T extends Array<unknown>,
  C extends IWorkerContext,
  R
> {
  outTransferable?: (value: ThenArg<R>) => Transferable[];
  inTransferable?: (values: T) => Transferable[];
  context?: C;
  scripts?: string[];
  rootUrl?: string;
}

export declare type Resolve<T> = (
  val: ThenArg<T> | PromiseLike<ThenArg<T>> | undefined
) => void;

export declare type Reject = (error: any) => void;

// AWSOME CONDITIONAL PROMISE TYPE UNWRAPPING
// TAKEN FROM https://stackoverflow.com/questions/48011353/how-to-unwrap-type-of-a-promise
export declare type ThenArg<T> = T extends Promise<infer U> ? U : T;
