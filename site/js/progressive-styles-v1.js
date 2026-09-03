(() => {
  const apply = () => {
    const pending = [...document.querySelectorAll('link[data-progressive-style]')];
    const applyNext = () => {
      const link = pending.shift();
      if (!link) return;
      link.media = 'all';
      link.removeAttribute('data-progressive-style');
      if (pending.length) setTimeout(applyNext, 0);
    };
    applyNext();
  };

  // Non-matching stylesheets are downloaded without blocking the critical
  // render. The load event means those requests and the first viewport are
  // ready; activate them then, before a visitor has to scroll or interact.
  // A separate task per stylesheet avoids one large style-recalculation task.
  if (document.readyState === 'complete') apply();
  else window.addEventListener('load', apply, { once: true });
})();
