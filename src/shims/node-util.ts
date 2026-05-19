/**
 * Minimal `util` for browser bundles (Rolldown externalizes Node builtins with stubs).
 * Used by avsc (`debuglog`, `format`, `inherits`, `deprecate`).
 */

export function debuglog(section: string): (...args: unknown[]) => void {
  void section;
  return () => {};
}

export function format(template: unknown, ...args: unknown[]): string {
  let index = 0;
  return String(template).replace(/%[%sdifoO]/g, (match) => {
    if (match === '%%') {
      return '%';
    }
    const value = args[index++];
    return value === undefined ? match : String(value);
  });
}

export function deprecate<T extends (...args: unknown[]) => unknown>(fn: T, message: string): T {
  void message;
  return fn;
}

export function inherits(
  ctor: { prototype: object; super_?: unknown },
  superCtor: { prototype: object },
): void {
  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

const util = { debuglog, format, deprecate, inherits };

export default util;
