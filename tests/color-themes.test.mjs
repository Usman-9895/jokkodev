import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../frontend/public/theme-init.js', import.meta.url), 'utf8');
function browser({saved = null, dark = false, denied = false} = {}) {
  const listeners = new Map(), mediaListeners = new Set(), writes = [];
  const media = {matches: dark, addEventListener: (_, listener) => mediaListeners.add(listener)};
  const storage = {getItem: key => {assert.equal(key, 'jokkodev.theme'); return saved;},
    setItem: (key, value) => writes.push({key, value})};
  const window = {matchMedia: () => media,
    addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    dispatchEvent: event => {for (const listener of listeners.get(event.type) ?? []) listener(event);}};
  Object.defineProperty(window, 'localStorage', {get() {
    if (denied) throw new Error('Storage denied');
    return storage;
  }});
  const document = {documentElement: {dataset: {}}};
  vm.runInNewContext(script, {window, document, CustomEvent: class {constructor(type) {this.type = type;}}});
  return {window, document, writes, storage,
    system(value) {media.matches = value; for (const listener of mediaListeners) listener();},
    storageEvent(key, newValue) {window.dispatchEvent({type: 'storage', key, newValue});}};
}

test('first visit is light even on a dark system, before React, and writes nothing', () => {
  for (const dark of [false, true]) {
    const b = browser({dark});
    assert.equal(b.window.JokkoDevTheme.getPreference(), 'light');
    assert.equal(b.document.documentElement.dataset.theme, 'light');
    b.system(!dark);
    assert.equal(b.document.documentElement.dataset.theme, 'light');
    assert.deepEqual(b.writes, []);
  }
});
test('explicit choices survive a reload and override system changes', () => {
  for (const preference of ['light', 'dark']) {
    const b = browser({dark: true});
    b.window.JokkoDevTheme.setPreference(preference);
    b.system(false); b.system(true);
    assert.equal(b.document.documentElement.dataset.theme, preference);
    assert.deepEqual(b.writes, [{key: 'jokkodev.theme', value: preference}]);
    const reload = browser({saved: b.writes[0].value});
    assert.equal(reload.document.documentElement.dataset.theme, preference);
  }
});
test('legacy system preference falls back to light and is no longer accepted', () => {
  const b = browser({saved: 'system', dark: true});
  assert.equal(b.window.JokkoDevTheme.getPreference(), 'light');
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.system(false); b.system(true);
  b.window.JokkoDevTheme.setPreference('system');
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  assert.deepEqual(b.writes, []);
});
test('blocked storage leaves initial light mode and in-memory selection usable', () => {
  const b = browser({denied: true, dark: true});
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  assert.equal(b.window.JokkoDevTheme.getPreference(), 'light');
  b.window.JokkoDevTheme.setPreference('dark');
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  b.system(false); assert.equal(b.document.documentElement.dataset.theme, 'dark');
});
test('unknown values cannot change the theme or be written to storage', () => {
  const b = browser({saved: 'anything'});
  b.window.JokkoDevTheme.setPreference('anything');
  assert.equal(b.window.JokkoDevTheme.getPreference(), 'light');
  assert.deepEqual(b.writes, []);
});
test('theme changes synchronize across tabs without writing account data or other preferences', () => {
  const b = browser();
  b.storageEvent('account', 'dark');
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.storageEvent('jokkodev.theme', 'dark');
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  b.storageEvent('jokkodev.theme', 'system');
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.storageEvent(null, null);
  assert.equal(b.window.JokkoDevTheme.getPreference(), 'light');
  assert.deepEqual(b.writes, []);
});
test('failed persistence does not prevent live changes or notifications', () => {
  const b = browser(); let notified = 0;
  b.storage.setItem = () => {throw new Error('Quota exceeded');};
  b.window.addEventListener('jokkodev:theme-change', () => notified++);
  b.window.JokkoDevTheme.setPreference('dark');
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
  assert.equal(notified, 1);
});
