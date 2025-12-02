import type { IWorkerConfig, IWorkerContext } from "./types";

declare global {
  interface WorkerGlobalScope {
    run<T extends Array<unknown>, R>(...args: T): R;
    context: IWorkerContext;
    getTransferrable<T>(val: T): Transferable[];
    getScriptImport(scripts?: string[]): string;
    toSource(value: unknown): string;
    noop(): never[];
    createWorkerUrl<T extends Array<unknown>, C extends IWorkerContext, R>(
      execute: (...args: T) => R,
      config: IWorkerConfig<T, C, R>,
      getScriptImportFn: typeof getScriptImport,
      toSourceFn: typeof toSource,
      noopFn: typeof noop,
      onMessageFn: typeof onMessage,
    ): string;
    onMessage(message: MessageEvent<[syncId: number, args: unknown[]]>): void;
  }
}

export const noop = (): never[] => [];

export const getScriptImport = (scripts: string[] = []): string =>
  `importScripts(${scripts.map((s) => `"${new URL(s, location.origin)}"`).join(",")});`;

export function toSource(value: unknown): string {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "undefined") {
    return "undefined";
  }

  if (t === "number" || t === "boolean") {
    return String(value);
  }

  if (t === "string") {
    return JSON.stringify(value);
  }

  if (t === "function") {
    return value!.toString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return `[${value.map(toSource).join(", ")}]`;
  }

  if (t === "object") {
    return `{${Object.entries(value!)
      .map(([k, v]) => `${JSON.stringify(k)}: ${toSource(v)}`)
      .join(", ")}}`;
  }

  throw new Error("Unsupported type");
}

/**
 * Calling functions through strings makes sure that aggressive minification
 * does not break the call. The same applies to the apply call, this ensures no polyfill
 * is assumed for a rest spread which would also break the worker script.
 *
 * Tested with Webpack dev and prod mode, Closure Compiler ADVANCED mode with ES3, ES5 and ES6 target.
 * @param message
 */
export const onMessage = (
  message: MessageEvent<[syncId: number, args: unknown[]]>,
) => {
  return new Promise((resolve) => {
    resolve(self["run"].apply(self["context"], message.data[1]));
  })
    .then((result) => {
      const transferrable = self["getTransferrable"](result);
      postMessage([message.data[0], result, false], transferrable);
    })
    .catch((error) => {
      postMessage([message.data[0], error, true]);
    });
};

export const createWorkerUrl = <
  T extends Array<unknown>,
  C extends IWorkerContext,
  R,
>(
  execute: (...args: T) => R,
  config: IWorkerConfig<T, C, R>,
  getScriptImportFn: typeof getScriptImport,
  toSourceFn: typeof toSource,
  noopFn: typeof noop,
  onMessageFn: typeof onMessage,
): string => {
  const script = [
    getScriptImportFn(config.scripts),
    `self.context = ${toSourceFn(config.context)};`,
    `self.getTransferrable = ${config.outTransferable ?? noopFn}`,
    `self.run = ${execute}`,
    `self.addEventListener("message", ${onMessageFn})`,
    `self.onMessage = ${onMessageFn}`,
    `self.toSource = ${toSourceFn}`,
    `self.noop = ${noopFn}`,
    `self.getScriptImport = ${getScriptImportFn}`,
    `self.createWorkerUrl = ${createWorkerUrl}`,
  ].join("\r\n");

  const blob = new Blob([script], { type: "application/javascript" });
  return URL.createObjectURL(blob);
};
