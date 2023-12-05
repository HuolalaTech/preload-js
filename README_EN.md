# @huolala-tech/preload-js

English | [中文](./README.md)

## Introduction

Pre-request and cache interface data.

## Getting Started

```bash
npm i @huolala-tech/preload-js
```

## Usage

### Function Signatures

```typescript
import { preload, usePreload } from '@huolala-tech/preload-js';

function preload(
  key: string | number,
  request: () => any,
  deps: (string | number | boolean | symbol)[],
): Promise<any>;

function usePreload(
  key: string | number,
  request: () => any,
  deps: (string | number | boolean | symbol)[],
): Promise<any>;
```

- `key`: Used for identification, similar to localStorage.
- `request`: A function that can return any data, like a Promise, string, number, array, object, etc.
- `deps`: An array of dependencies. If not passed, `request` is called every time by default. If passed, the request is only made when the dependencies change, using `Object.is` to compare before and after.

### Examples:

#### 1. Preloading Data for Page B when Navigating from Page A.

Page A:

```javascript
import { preload } from '@huolala-tech/preload-js';

preload('pageB', () => pageBRequest({ key: 'value' }));
navigateTo('pageB');
```

Page B:

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('pageB', () => pageBRequest({ key: 'value' }));
```

#### 2. Directly Passing Existing Data when Navigating from Page A to B.

Page A:

```javascript
import { preload } from '@huolala-tech/preload-js';

preload('pageB', () => ({ key: 'pageAData' }));
navigateTo('pageB');
```

Page B:

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('pageB', () => pageBRequest({ key: 'value' }));
// data: { key: 'pageAData' }
```

If you directly enter Page B, it will normally initiate `pageBRequest`. If you go through Page A first, Page B will use the data passed from Page A, and only on the second request will it initiate `pageBRequest` to update the data.

It's common to wrap the data so that it matches the structure returned by the request, like so:

```javascript
const data = {
  ret: 0,
  data: {
    key: 'somePageData',
  },
};
preload('pageB', () => data);
navigateTo('pageB');
```

#### 3. Passing User ID as a Dependency

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const userId = 1001;
const userInfo = await usePreload('userInfo', () => getUserInfo({ userId }), [
  userId,
]);
```

The `getUserInfo` request is only initiated again when `userId` changes (Note: it's not that the request is automatically initiated when `userId` changes).

When passing a dependency array, `usePreload` can be called separately. After the first request, the dependency is saved, and if the dependency hasn't changed on subsequent calls, it directly returns the result of the first call.

#### 4. Requesting Only Once During Application Lifecycle

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('requestOnlyOnce', () => requestData(), [
  'requestOnlyOnce', // Passing any static value works, as long as Object.is comparison does not change, the cache will be returned.
]);
```

#### 5. Using useDep

```javascript
import { usePreload, useDep } from '@huolala-tech/preload-js';

const [dep, setDep] = useDep(); // By default uses Date.now()

const userInfo = await usePreload('userInfo', () => getUserInfo({ userId }), [
  dep,
]);

setDep(); // By default uses Date.now()
```

#### 6. setConfig and removeOnCatch

By default, when the passed promise is caught, the cache is automatically destroyed. If you want to use the cache even when caught, you can set this with `setConfig`:

```javascript
import { setConfig } from '@huolala-tech/preload-js';
setConfig({ removeOnCatch: false }); // This setting is globally effective.
```

If you want only certain requests to cache when caught, you can pass a dependency:

```javascript
import { removeOnCatch } from '@huolala-tech/preload-js';
const data = await usePreload('userInfo', () => getUserInfo({ userId }), [
  removeOnCatch(false), // If not passed, defaults to true, consistent with the default value of the global configuration.
]);
```
