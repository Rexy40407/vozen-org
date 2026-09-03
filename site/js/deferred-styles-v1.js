(() => {
  let applied = false;
  const apply = () => {
    if (applied) return;
    applied = true;
    document.querySelectorAll('link[data-deferred-style]').forEach((link) => {
      link.media = 'all';
      link.removeAttribute('data-deferred-style');
    });
  };

  const schedule = () => {
    // The critical sheet fully covers the first viewport. Applying the much
    // larger below-fold sheets during page boot forces a long style/layout task
    // and hurts interaction readiness. Apply as soon as the visitor starts to
    // interact or scroll. No timer is needed: an idle visitor remains in the
    // already-complete first viewport, while no-script clients use the fallback.
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
      window.addEventListener(event, apply, { once: true, passive: event !== 'keydown', capture: true });
    }
    window.addEventListener('scroll', apply, { once: true, passive: true });
    if (window.location.hash) apply();
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
