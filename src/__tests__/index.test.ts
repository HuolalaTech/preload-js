import { preload, usePreload, useDep } from '../index';

describe('preload-js', () => {
  it('preload without deps', async () => {
    const preloader = await preload('test1', () => 1);
    expect(preloader).toBe(1);

    const preloader1 = await preload('test1', () => 2);
    expect(preloader1).toBe(2);
  });

  it('preload with deps', async () => {
    const deps = [1002, '1333'];
    const preloader1 = await preload('test2', () => 1, deps);
    expect(preloader1).toBe(1);

    const preloader2 = await preload('test2', () => 2, [1002, '1333']);
    expect(preloader2).toBe(1);

    const preloader3 = await preload('test2', () => 3, [1003, '1333']);
    expect(preloader3).toBe(3);
  });

  it('usePreload without deps', async () => {
    const res = await usePreload('test1', () => 3);
    expect(res).toEqual(2);
    const res2 = await usePreload('test1', () => 3);
    expect(res2).toEqual(3);
    const res1 = await usePreload('test3', () => 2);
    expect(res1).toEqual(2);
  });

  it('usePreload with deps', async () => {
    const res = await usePreload('test2', () => 2, [1003, '1333']);
    expect(res).toEqual(3);
    const res1 = await usePreload('test2', () => 2, [1004, '1333']);
    expect(res1).toEqual(2);
    const res2 = await usePreload('test2', () => 1, []);
    expect(res2).toEqual(1);
  });

  it('only usePreload with deps', async () => {
    const res3 = await usePreload('test3', () => 2, [1033, '1333']);
    expect(res3).toEqual(2);
    const res4 = await usePreload('test3', () => 3, [1033, '1333']);
    expect(res4).toEqual(2);
    const res5 = await usePreload('test3', () => 4, [1034, '1333']);
    expect(res5).toEqual(4);
    const res6 = await usePreload('test3', () => 5, []);
    expect(res6).toEqual(5);
    const res7 = await usePreload('test3', () => 6, []);
    expect(res7).toEqual(6);
    const res8 = await usePreload('test3', () => 7, [1234]);
    expect(res8).toEqual(7);
    const res9 = await usePreload('test3', () => 8, [1234]);
    expect(res9).toEqual(7);
  });

  it('preload with useDep', async () => {
    const [dep, setDep] = useDep(0);
    const res = await usePreload('test4', () => 2, [dep]);
    expect(res).toEqual(2);
    const res1 = await usePreload('test4', () => 3, [dep]);
    expect(res1).toEqual(2);
    setDep(1);
    const res2 = await usePreload('test4', () => 4, [dep]);
    expect(res2).toEqual(4);
    const res3 = await usePreload('test4', () => 5, [dep]);
    expect(res3).toEqual(4);
  });
});
