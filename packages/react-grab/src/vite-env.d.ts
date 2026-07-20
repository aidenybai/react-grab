declare module "*?worker&inline" {
  interface InlineWorkerConstructor {
    new (options?: { name?: string }): Worker;
  }

  const workerConstructor: InlineWorkerConstructor;
  export default workerConstructor;
}
