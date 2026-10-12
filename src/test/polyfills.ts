/**
 * jsdom gaps needed by Radix UI, sonner, vaul and our hooks.
 */

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Controls what `matchMedia('(prefers-color-scheme: dark)')` reports in tests. */
export const mediaState = { prefersDark: false };

export function installPolyfills(): void {
  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: ResizeObserverStub,
      writable: true,
    });
  }
  if (!('IntersectionObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      value: IntersectionObserverStub,
      writable: true,
    });
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: query.includes('prefers-color-scheme: dark') ? mediaState.prefersDark : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  window.scrollTo = () => undefined;
  // axe-core probes canvas; jsdom has no canvas implementation.
  HTMLCanvasElement.prototype.getContext = () => null;
  Element.prototype.scrollIntoView = function scrollIntoView() {};
  Element.prototype.scrollTo = function scrollTo() {};
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
  }
}
