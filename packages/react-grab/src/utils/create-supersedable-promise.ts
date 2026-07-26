export interface SupersedablePromise<Result> {
  promise: Promise<Result>;
  supersedeWith: (replacementPromise: Promise<Result>) => void;
}

export const createSupersedablePromise = <Result>(
  initialPromise: Promise<Result>,
): SupersedablePromise<Result> => {
  let replacementPromise: Promise<Result> | null = null;

  return {
    promise: initialPromise.then((result) => replacementPromise ?? result),
    supersedeWith: (nextPromise) => {
      replacementPromise = nextPromise;
    },
  };
};
