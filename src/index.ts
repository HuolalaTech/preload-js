type KeyType = string | number;
type DepType = string | number | boolean | symbol;

interface Dep {
  value: DepType;
  __IS_PRELOAD_DEP__: boolean;
}

interface Debounce {
  value: number;
  __IS_PRELOAD_DEBOUNCE__: boolean;
}

type RemoveOnCatch = '__IS_PRELOAD_REMOVE_ON_CATCH__';
type IgnoreOnCatch = '__IS_PRELOAD_IGNORE_ON_CATCH__';
type DepsType = DepType | Dep | RemoveOnCatch | IgnoreOnCatch | Debounce;
type Deps = DepsType[];
type PreloaderType<R> = {
  resolve: (response?: R) => void;
  reject: (reason?: R) => void;
  promise: Promise<R>;
  resolved: boolean;
  rejected: boolean;
};
type PreloadMap = {
  [key in KeyType]?: {
    preloader: PreloaderType<any> | undefined;
    deps: Deps;
  };
};

const preloadMap: PreloadMap = {};
const config = {
  removeOnCatch: true,
};
const DebounceRejectErrorMessage = 'PRELOAD_JS_DEBOUNCE_REJECT';

function setConfig(options: typeof config) {
  Object.assign(config, options);
}

function createPromiseEvent<R>(data?: R, delay?: number): PreloaderType<R>;
function createPromiseEvent<R>(
  data?: () => R,
  delay?: number,
): PreloaderType<R> {
  let resolved = false;
  let rejected = false;
  let resolve = (response?: R) => {};
  let reject = (reason?: R) => {};
  let timer: any;
  const promise: Promise<R> = new Promise((resolver, rejecter) => {
    resolve = (response?: R) => {
      resolved = true;
      resolver(response as R);
    };
    reject = (response?: R) => {
      clearTimeout(timer);
      rejected = true;
      rejecter(response);
    };
  });
  if (data) {
    if (delay && delay > 0) {
      timer = setTimeout(() => {
        const resolvedData = typeof data === 'function' ? data() : data;
        resolve(resolvedData);
      }, Number(delay));
    } else {
      const resolvedData = typeof data === 'function' ? data() : data;
      resolve(resolvedData);
    }
  }
  return {
    resolve,
    reject,
    promise,
    resolved,
    rejected,
  };
}

function preload<T extends KeyType, R>(
  id: T,
  request: () => R,
  deps: Deps = [],
): Promise<R> {
  const catchRefresh = hasCatchRefresh(deps);
  const catchIgnore = hasCatchIgnore(deps);
  const mappedDeps = mapDeps(deps);
  const target = preloadMap[id]?.preloader;
  const targetDeps = preloadMap[id]?.deps || [];
  if (
    mappedDeps.length > 0 &&
    mappedDeps.length === targetDeps.length &&
    target
  ) {
    const isDepsSame = mappedDeps.every((item, index) =>
      Object.is(item, targetDeps[index]),
    );
    if (isDepsSame) {
      return target.promise;
    }
  }
  const preloader = createPromiseEvent(request());
  preloadMap[id] = {
    preloader,
    deps: mappedDeps,
  };
  if (!catchIgnore && (config.removeOnCatch || catchRefresh)) {
    preloader.promise.catch((err) => {
      preloadMap[id] = undefined;
      return Promise.reject(err);
    });
  }
  return preloader.promise;
}

function usePreload<T extends KeyType, R>(
  id: T,
  request: () => R,
  deps: Deps = [],
): Promise<R> {
  const catchRefresh = hasCatchRefresh(deps);
  const catchIgnore = hasCatchIgnore(deps);
  const debounceValue = getDebounce(deps);
  const mappedDeps = mapDeps(deps);
  let target = preloadMap[id]?.preloader;
  const targetDeps = preloadMap[id]?.deps || [];
  if ((mappedDeps.length > 0 || targetDeps.length > 0) && target) {
    if (mappedDeps.length === targetDeps.length) {
      const isDepsSame = mappedDeps.every((item, index) =>
        Object.is(item, targetDeps[index]),
      );
      if (isDepsSame) {
        if (debounceValue > 0 && !target.resolved && !target.rejected) {
          preloadMap[id] = undefined;
          target.reject(getDebounceRejectError());
        } else {
          if (debounceValue > 0) {
            target.promise.then(() => {
              preloadMap[id] = undefined;
            });
          }
          return target.promise;
        }
      } else {
        target = undefined;
      }
    } else {
      target = undefined;
    }
  }
  if (!target) {
    const preloader = createPromiseEvent(request, debounceValue);
    preloadMap[id] = {
      preloader,
      deps: mappedDeps,
    };
    target = preloader;
  }
  target.promise.then(() => {
    if (mappedDeps.length === 0 || debounceValue > 0) {
      preloadMap[id] = undefined;
    }
  });
  if (!catchIgnore && (config.removeOnCatch || catchRefresh)) {
    target.promise.catch((err) => {
      preloadMap[id] = undefined;
      return Promise.reject(err);
    });
  }
  return target.promise;
}

function useDep(value: any = Date.now()): [Dep, (x?: any) => void] {
  const dep: Dep = { value, __IS_PRELOAD_DEP__: true };

  function setDep(x: any = Date.now()) {
    dep.value = x;
  }

  return [dep, setDep];
}

function useDebounce(delay: number = 300) {
  const debounce: Debounce = { value: delay, __IS_PRELOAD_DEBOUNCE__: true };
  return debounce;
}

function isDebounceReject(error: any) {
  return error?.__debounce__ === DebounceRejectErrorMessage;
}

function getDebounceRejectError() {
  return { __debounce__: DebounceRejectErrorMessage };
}

function isDep(x: DepsType): x is Dep {
  return (x as Dep)?.__IS_PRELOAD_DEP__;
}

function isDebounce(x: DepsType): x is Debounce {
  return (x as Debounce)?.__IS_PRELOAD_DEBOUNCE__;
}

function getDebounce(deps: Deps) {
  const debounce = deps.find((item) => isDebounce(item));
  if (debounce) {
    return (debounce as Debounce).value;
  }
  return 0;
}

function mapDeps(deps: Deps) {
  return deps.map((item) => {
    if (isDep(item) || isDebounce(item)) {
      return item.value;
    }
    return item;
  });
}

const catchRefresh: RemoveOnCatch = '__IS_PRELOAD_REMOVE_ON_CATCH__';
const catchIgnore: IgnoreOnCatch = '__IS_PRELOAD_IGNORE_ON_CATCH__';

function removeOnCatch(remove: boolean = true) {
  if (remove) {
    return catchRefresh;
  }
  return catchIgnore;
}

function hasCatchRefresh(deps: Deps) {
  return deps.some((item) => item === catchRefresh);
}

function hasCatchIgnore(deps: Deps) {
  return deps.some((item) => item === catchIgnore);
}

export {
  setConfig,
  createPromiseEvent,
  preload,
  usePreload,
  useDep,
  useDebounce,
  isDebounceReject,
  removeOnCatch,
};
