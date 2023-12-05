type KeyType = string | number;
type DepType = string | number | boolean | symbol;
interface Dep {
  value: DepType;
  __IS_PRELOAD_DEP__: boolean;
}

type RemoveOnCatch = '__IS_PRELOAD_REMOVE_ON_CATCH__';
type IgnoreOnCatch = '__IS_PRELOAD_IGNORE_ON_CATCH__';

type Deps = (DepType | Dep | RemoveOnCatch | IgnoreOnCatch)[];

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

export function setConfig(options: typeof config) {
  Object.assign(config, options);
}

export function createPromiseEvent<R>(data?: R): PreloaderType<R> {
  let resolved = false;
  let rejected = false;
  let resolve = (response?: R) => {};
  let reject = (reason?: R) => {};
  const promise: Promise<R> = new Promise((resolver, rejecter) => {
    resolve = (response?: R) => {
      resolved = true;
      resolver(response as R);
    };
    reject = (response?: R) => {
      rejected = true;
      rejecter(response);
    };
  });
  if (data) {
    resolve(data);
  }
  return {
    resolve,
    reject,
    promise,
    resolved,
    rejected,
  };
}

function isDep(x: any): x is Dep {
  return x && x.__IS_PRELOAD_DEP__;
}
function mapDeps(deps: Deps) {
  return deps.map((item) => {
    if (isDep(item)) {
      return item.value;
    }
    return item;
  });
}

export function preload<T extends KeyType, R>(
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

export function usePreload<T extends KeyType, R>(
  id: T,
  request: () => R,
  deps: Deps = [],
): Promise<R> {
  const catchRefresh = hasCatchRefresh(deps);
  const catchIgnore = hasCatchIgnore(deps);
  const mappedDeps = mapDeps(deps);
  let target = preloadMap[id]?.preloader;
  const targetDeps = preloadMap[id]?.deps || [];
  if ((mappedDeps.length > 0 || targetDeps.length > 0) && target) {
    if (mappedDeps.length === targetDeps.length) {
      const isDepsSame = mappedDeps.every((item, index) =>
        Object.is(item, targetDeps[index]),
      );
      if (isDepsSame) {
        return target.promise;
      } else {
        target = undefined;
      }
    } else {
      target = undefined;
    }
  }
  if (!target) {
    const preloader = createPromiseEvent(request());
    preloadMap[id] = {
      preloader,
      deps: mappedDeps,
    };
    target = preloader;
  }
  target.promise.then(() => {
    if (mappedDeps.length === 0) {
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

export function useDep(value: any = Date.now()): [Dep, (x?: any) => void] {
  const dep: Dep = { value, __IS_PRELOAD_DEP__: true };
  function setDep(x: any = Date.now()) {
    dep.value = x;
  }
  return [dep, setDep];
}

const catchRefresh: RemoveOnCatch = '__IS_PRELOAD_REMOVE_ON_CATCH__';
const catchIgnore: IgnoreOnCatch = '__IS_PRELOAD_IGNORE_ON_CATCH__';

function hasCatchRefresh(deps: Deps) {
  return deps.some((item) => item === catchRefresh);
}

function hasCatchIgnore(deps: Deps) {
  return deps.some((item) => item === catchIgnore);
}

export function removeOnCatch(remove: boolean = true) {
  if (remove) {
    return catchRefresh;
  }
  return catchIgnore;
}
