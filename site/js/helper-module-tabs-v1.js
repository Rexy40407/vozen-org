(() => {
  const tabs = [...document.querySelectorAll('.helper-module-tab')];
  const panels = [...document.querySelectorAll('.helper-module-panel')];
  const activate = (id, moveFocus = false) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.module === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && moveFocus) tab.focus();
    });
    panels.forEach((panel) => {
      const active = panel.dataset.panel === id;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.module));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'Home'
          ? -index
          : event.key === 'End'
            ? tabs.length - 1 - index
            : -1;
      const next = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + delta + tabs.length) % tabs.length;
      activate(tabs[next].dataset.module, true);
    });
  });

  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const consoleShell = document.querySelector('.helper-console');
  const taskField = document.querySelector('.helper-task-field');
  const consoleEvents = [...document.querySelectorAll('[data-console-event]')];
  const consoleModules = [...document.querySelectorAll('[data-console-module]')];
  let consoleStep = 0;
  let consoleTimer;

  const setConsoleStep = (step) => {
    if (!consoleEvents.length) return;
    consoleStep = step % consoleEvents.length;
    consoleEvents.forEach((item, eventIndex) => item.classList.toggle('is-current', eventIndex === consoleStep));
    consoleModules.forEach((item) => item.classList.toggle(
      'is-active',
      item.dataset.consoleModule === consoleEvents[consoleStep].dataset.consoleEvent,
    ));
  };

  const startConsole = () => {
    if (motionReduced || consoleTimer || !consoleEvents.length) return;
    consoleTimer = window.setInterval(() => setConsoleStep(consoleStep + 1), 2400);
  };

  const stopConsole = () => {
    window.clearInterval(consoleTimer);
    consoleTimer = undefined;
  };

  if (!motionReduced && consoleShell && consoleEvents.length) {
    const observer = new IntersectionObserver(([entry]) => {
      consoleShell.classList.toggle('is-paused', !entry.isIntersecting);
      taskField?.classList.toggle('is-paused', !entry.isIntersecting);
      if (entry.isIntersecting && !document.hidden) startConsole();
      else stopConsole();
    }, { threshold: 0.15 });
    observer.observe(consoleShell);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopConsole();
      else if (consoleShell.getBoundingClientRect().bottom > 0) startConsole();
    });
    startConsole();
  }
})();
