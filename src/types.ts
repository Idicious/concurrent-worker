export interface IResponse<R> {
  data: [number, Awaited<R>, boolean];
}

export interface IWorkerContext {
  [key: string]: unknown;
}

export interface IWorkerConfig<
  T extends Array<unknown>,
  C extends IWorkerContext,
  R,
> {
  outTransferable?: (value: Awaited<R>) => Transferable[];
  inTransferable?: (values: T) => Transferable[];
  context?: C;
  scripts?: string[];
}

export interface IPoolConfig<
  T extends Array<unknown>,
  C extends IWorkerContext,
  R,
> extends IWorkerConfig<T, C, R> {
  workers?: number;
  timeout?: number;
}

export interface IWorker<T extends Array<unknown>, C, R> {
  clone: () => IWorker<T, C, R>;
  kill: () => void;
  run: RunFunc<T, R>;
}

export type WorkerThis<C extends IWorkerContext> = C & { rootUrl: string };

export type EmptyArray<T extends Array<unknown>> = T & { length: 0 };

export type UnknownFunc<T extends Array<unknown>, R> =
  T extends EmptyArray<T> ? () => R : (args: T) => R;

export type RunFunc<T extends Array<unknown>, R> = UnknownFunc<
  T,
  ThenPromise<R>
>;

export type Resolve<T> = (val: Awaited<T> | PromiseLike<Awaited<T>>) => void;

export type Reject = (error: unknown) => void;

export type ThenPromise<T> = Promise<Awaited<T>>;
