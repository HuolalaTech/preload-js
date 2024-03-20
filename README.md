# @huolala-tech/preload-js

[English](./README_EN.md) | 中文

## 介绍

预请求和缓存接口数据。

## 开始

```bash
npm i @huolala-tech/preload-js
```

## 使用

### 函数签名

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

- key: 用以标识, 类似 localStorage
- request: 一个函数，可以返回任意数据，Promise/字符串/数字/数组/对象……
- deps: 依赖数组，不传默认每次都重新调用 request，如果传入则只有在依赖发生变化时才会请求，内部使用 `Object.is` 对比前后依赖。

### 例子:

#### 1. A 页面跳转 B 页面，预加载 B 页面请求数据。

A 页面：

```javascript
import { preload } from '@huolala-tech/preload-js';

preload('pageB', () => pageBRequest({ key: 'value' }));
navigateTo('pageB');
```

B 页面：

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('pageB', () => pageBRequest({ key: 'value' }));
```

#### 2. A 页面跳转 B 页面，直接传递已有数据

A 页面：

```javascript
import { preload } from '@huolala-tech/preload-js';

preload('pageB', () => ({ key: 'pageAData' }));
navigateTo('pageB');
```

B 页面：

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('pageB', () => pageBRequest({ key: 'value' }));
// data: { key: 'pageAData' }
```

如果直接进入 B 页面，会正常发起 `pageBRequest`，如果先经过 A 页面，则 B 页面会先使用 A 页面传递的数据，B 页面第二次请求时才会发起 `pageBRequest` 更新数据。

通常我们需要包装数据以便和请求返回结构一样，类似：

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

#### 3. 传入用户 ID 作为依赖

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const userId = 1001;
const userInfo = await usePreload('userInfo', () => getUserInfo({ userId }), [
  userId,
]);
```

只有 userId 发生变化后，再次调用才会发起 `getUserInfo` 请求（注：并不是 userId 变化会自动发起请求)。

在传入依赖数组时 `usePreload` 可以单独调用，第一次调用发起请求后会保存依赖，再次调用时如果依赖不变，直接返回第一次调用的结果。

#### 4. 应用生命周期内只请求一次

```javascript
import { usePreload } from '@huolala-tech/preload-js';

const data = await usePreload('requestOnlyOnce', () => requestData(), [
  'requestOnlyOnce', // 传任意静态值都一样, 只要 Object.is 对比没有变化, 就会返回缓存
]);
```

#### 5. 使用 useDep

```javascript
import { usePreload, useDep } from '@huolala-tech/preload-js';

const [dep, setDep] = useDep(); // 默认使用 Date.now()

const userInfo = await usePreload('userInfo', () => getUserInfo({ userId }), [
  dep,
]);

setDep(); // 默认使用 Date.now()
```

##### 6. setConfig 和 removeOnCatch

默认情况下，传入的 promise 被 catch 时会自动销毁缓存，如果你想在 catch 时也依然使用缓存，可以使用 setConfig 设置：

```javascript
import { setConfig } from '@huolala-tech/preload-js';
setConfig({ removeOnCatch: false }); // 此设置为全局生效
```

如果你只想让某个请求被 catch 时依然缓存，可以传入依赖：

```javascript
import { removeOnCatch } from '@huolala-tech/preload-js';
const data = await usePreload('userInfo', () => getUserInfo({ userId }), [
  removeOnCatch(false), // 不传默认为 true，和全局配置默认值为 true 一致
]);
```

#### 7. useDebounce

使用场景：某个接口频繁触发防抖

```javascript
import {
  usePreload,
  useDebounce,
  isDebounceReject,
} from '@huolala-tech/preload-js';

const data = await usePreload(
  'userInfo',
  () => getUserInfo({ userId }),
  [useDebounce(1000)], // 默认为 300ms
).catch((e) => {
  if (isDebounceReject(e)) {
    return;
  }
});
```
