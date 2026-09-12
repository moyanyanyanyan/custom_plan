import { describe, expect, it, beforeEach } from 'vitest';
import { isCardTestMode, isDemoMode } from '../../src/utils/demoMode';

describe('card test mode', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('only enables card testing with the dedicated flag', () => {
    window.history.replaceState({}, '', '/?card-test=1');
    expect(isCardTestMode()).toBe(true);
    expect(isDemoMode()).toBe(false);
  });

  it('keeps demo links compatible for card generation', () => {
    window.history.replaceState({}, '', '/?demo=1');
    expect(isCardTestMode()).toBe(true);
    expect(isDemoMode()).toBe(true);
  });

  it('does not enable card testing by default', () => {
    expect(isCardTestMode()).toBe(false);
  });
});
