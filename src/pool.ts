import { serial } from "./task";
import {
  IWorker,
  IWorkerConfig,
  IWorkerContext,
  RunFunc,
  WorkerThis
} from "./types";
import { createWorkerUrl } from "./worker-creation";

class WorkerPool<T extends Array<unknown>, C extends IWorkerContext, R> {
  private workers: Array<IWorker<T, C, R>> = [];
  private waiting: Array<(worker: IWorker<T, C, R>) => void> = [];

  constructor(
    size: number,
    task: ((this: WorkerThis<C>, ...args: T) => R) | string,
    config: IWorkerConfig<T, C, R> = {},
    private timeout: number = 1000 * 60
  ) {
    const url = typeof task === "string" ? task : createWorkerUrl(task, config);
    for (let i = 0; i < size; i++) {
      this.workers.push(serial(url));
    }
  }

  public get(): Promise<IWorker<T, C, R>> {
    const worker = this.workers.pop();
    if (worker != null) {
      return Promise.resolve(worker);
    }

    return new Promise<IWorker<T, C, R>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const cbIndex = this.waiting.indexOf(cb);
        if (cbIndex !== -1) {
          this.waiting.splice(cbIndex, 1);
        }

        reject("Workers busy, get timed out.");
      }, this.timeout);

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
      this.workers.push(worker);
    }
  }

  public kill() {
    this.workers.forEach(worker => worker.kill());
  }
}

export const pool = <T extends Array<unknown>, C extends IWorkerContext, R>(
  task: ((this: WorkerThis<C>, ...args: T) => R) | string,
  config: IWorkerConfig<T, C, R> = {}
): IWorker<T, C, R> => {
  const workerPool = new WorkerPool(4, task, config);

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
