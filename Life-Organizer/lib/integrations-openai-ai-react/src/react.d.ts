declare module "react" {
  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps: readonly unknown[]
  ): T;

  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;

  export function useRef<T>(initialValue: T): { current: T };

  export function useState<S>(
    initialState: S | (() => S)
  ): [S, (value: S | ((previous: S) => S)) => void];
}
