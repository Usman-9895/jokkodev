/* global window, document, CustomEvent */
// Deliberately synchronous, same-origin and before body paint. No account data.
(() => {
  const key = 'jokkodev.theme';
  const valid = value => ['light', 'dark'].includes(value);
  let preference = 'light';
  try {
    const saved = window.localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* Storage can be denied; the in-memory choice still works. */ }

  function apply() {
    document.documentElement.dataset.theme = preference;
  }
  function notify() {
    apply();
    window.dispatchEvent(new CustomEvent('jokkodev:theme-change'));
  }
  apply();
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'light';
    notify();
  });
  window.JokkoDevTheme = Object.freeze({
    getPreference: () => preference,
    setPreference(value) {
      if (!valid(value)) return;
      preference = value;
      try { window.localStorage.setItem(key, value); } catch { /* No persistence in this browser. */ }
      notify();
    },
  });
})();
