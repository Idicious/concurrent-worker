import * as API from "../src/index";

describe("Public API", () => {
  it("Exposes the expected methods", () => {
    const actualAPI = Object.keys(API).length;
    const publicAPI = [API.serial, API.concurrent, API.pool];

    expect(actualAPI).toBe(publicAPI.length);
  });

  it("Exposes the types", () => {
    const a:
      | API.EmptyArray<[]>
      | API.IPoolConfig<[], any, any>
      | API.IResponse<any>
      | API.IWorker<[], any, any>
      | API.IWorkerConfig<[], any, any>
      | API.IWorkerContext
      | API.Input<[]>
      | API.Reject
      | API.Resolve<any>
      | API.RunFunc<[], any>
      | API.ThenArg<any>
      | API.ThenPromise<any>
      | API.UnknownFunc<[], any>
      | API.WorkerThis<any> = {} as any;
    expect(a).toBeDefined();
  });
});
