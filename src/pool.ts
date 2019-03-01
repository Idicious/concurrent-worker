import { serial } from "./task";
import {
  IWorker,
  IWorkerConfig,
  IWorkerContext,
  RunFunc,
  WorkerThis,
  IPoolConfig
} from "./types";
import { createWorkerUrl } from "./worker-creation";

const defaultConcurrency = self.navigator.hardwareConcurrency || 4;
const defaultTimeout = 1000 * 60;

class WorkerPool<T extends Array<unknown>, C extends IWorkerContext, R> {
  private workers: Array<IWorker<T, C, R>> = [];
  private busy: Array<IWorker<T, C, R>> = [];

  private waiting: Array<(worker: IWorker<T, C, R>) => void> = [];

  constructor(
    private task: ((this: WorkerThis<C>, ...args: T) => R) | string,
    private config: IPoolConfig<T, C, R> = {}
  ) {
    const url = typeof task === "string" ? task : createWorkerUrl(task, config);
    const workers = (config && config.workers) || defaultConcurrency;
    for (let i = 0; i < workers; i++) {
      this.workers.push(serial(url, config));
    }
  }

  public get(): Promise<IWorker<T, C, R>> {
    const worker = this.workers.pop();
    if (worker != null) {
      this.busy.push(worker);
      return Promise.resolve(worker);
    }

    return new Promise<IWorker<T, C, R>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.indexOf(cb);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }

        reject(`No workers available, timeout of ${timeout}ms exceeded.`);
      }, (this.config && this.config.timeout) || defaultTimeout);

      const cb = (w: IWorker<T, C, R>) => {
        clearTimeout(timeout);
        resolve(w);
      };

      this.waiting.unshift(cb);
    });
  }

  public release(worker: IWorker<T, C, R>) {
    const next = this.waiting.pop();
    if (next) {
      next(worker);
    } else {
      const index = this.busy.indexOf(worker);
      if (index !== -1) {
        this.busy.splice(index, 1);
      }

      this.workers.push(worker);
    }
  }

  public kill() {
    this.workers.forEach(worker => worker.kill());
    this.busy.forEach(worker => worker.kill());
  }
}

export const pool = <T extends Array<unknown>, C extends IWorkerContext, R>(
  task: ((this: WorkerThis<C>, ...args: T) => R) | string,
  config: IPoolConfig<T, C, R> = {}
): IWorker<T, C, R> => {
  const workerPool = new WorkerPool(task, config);

  const run = ((args: T) => {
    return workerPool.get().then(worker =>
      worker.run(args).then(res => {
        workerPool.release(worker);
        return res;
      })
    );
  }) as RunFunc<T, R>;

  const kill = () => {
    workerPool.kill();
  };

  const clone = () => pool(task, config);

  return {
    clone,
    kill,
    run
  };
};
