/* Slow, collision-safe ambient task cards for the Helper hero. */
(function () {
  "use strict";

  const MIN_VIEWPORT = 981;
  const MIN_TASK_GAP = 24;
  const OBSTACLE_GAP = 16;
  const MIN_DURATION = 18000;
  const MAX_DURATION = 30000;

  const expandRect = (rect, gap) => ({
    left: rect.left - gap,
    top: rect.top - gap,
    right: rect.right + gap,
    bottom: rect.bottom + gap,
  });

  const intersects = (a, b, gap = 0) => !(
    a.right + gap <= b.left ||
    a.left - gap >= b.right ||
    a.bottom + gap <= b.top ||
    a.top - gap >= b.bottom
  );

  const within = (rect, bounds) => (
    rect.left >= bounds.left &&
    rect.top >= bounds.top &&
    rect.right <= bounds.right &&
    rect.bottom <= bounds.bottom
  );

  const clampPoint = (point, size, bounds) => {
    const maxX = Math.max(bounds.left, bounds.right - size.width);
    const maxY = Math.max(bounds.top, bounds.bottom - size.height);
    return {
      x: Math.max(bounds.left, Math.min(Number.isFinite(point.x) ? point.x : bounds.left, maxX)),
      y: Math.max(bounds.top, Math.min(Number.isFinite(point.y) ? point.y : bounds.top, maxY)),
    };
  };

  const validPosition = (rect, bounds, obstacles, occupied, gap = MIN_TASK_GAP) => (
    within(rect, bounds) &&
    obstacles.every((obstacle) => !intersects(rect, obstacle)) &&
    occupied.every((other) => !intersects(rect, other, gap))
  );

  // Exposed without the controller so the geometry can be tested without a browser renderer.
  window.VozenHelperAmbientGeometry = { expandRect, intersects, within, validPosition, clampPoint };

  const field = document.querySelector(".helper-task-field");
  const hero = field?.closest(".helper-hero");
  if (!field || !hero) return;

  const tasks = [...field.querySelectorAll(".helper-task")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = new Map();
  let resizeFrame;
  let layoutTimer;
  let observer;
  let running = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * Math.max(0, max - min);
  const duration = () => MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
  const layoutScale = () => {
    const rect = field.getBoundingClientRect();
    return {
      x: rect.width / Math.max(1, field.clientWidth),
      y: rect.height / Math.max(1, field.clientHeight),
    };
  };
  const relativeRect = (node, origin) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      right: rect.right - origin.left,
      bottom: rect.bottom - origin.top,
    };
  };

  const measure = (item) => {
    const rect = item.node.getBoundingClientRect();
    item.width = Math.max(1, rect.width || item.width);
    item.height = Math.max(1, rect.height || item.height);
  };

  const isRenderable = (node) => (
    getComputedStyle(node).display !== "none" && node.getClientRects().length > 0
  );

  const pauseAnimations = (paused) => {
    state.forEach((item) => {
      if (!item.animation) return;
      if (paused) item.animation.pause();
      else item.animation.play();
    });
    field.classList.toggle("is-paused", paused);
  };

  const cancelAnimations = () => {
    state.forEach((item) => {
      item.animation?.cancel();
      item.animation = null;
    });
  };

  const applyPosition = (item, point) => {
    const scale = layoutScale();
    if (item.side === "right") {
      item.node.style.left = "auto";
      item.node.style.right = `${Math.max(0, field.clientWidth - (point.x + item.width) / scale.x)}px`;
    } else {
      item.node.style.right = "auto";
      item.node.style.left = `${point.x / scale.x}px`;
    }
    item.node.style.top = `${point.y / scale.y}px`;
  };

  const setStatic = (item, point) => {
    item.animation?.cancel();
    item.animation = null;
    item.x = point.x;
    item.y = point.y;
    applyPosition(item, point);
    item.node.style.transform = "translate3d(0, 0, 0)";
    item.node.style.opacity = ".46";
  };

  const animateTo = (item, point) => {
    const from = { x: item.x, y: item.y };
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    item.animation?.cancel();
    applyPosition(item, from);
    const scale = layoutScale();
    item.animation = item.node.animate(
      [
        { transform: "translate3d(0, 0, 0)", opacity: ".42" },
        { transform: `translate3d(${dx / scale.x}px, ${dy / scale.y}px, 0)`, opacity: ".58" },
      ],
      { duration: duration(), easing: "ease-in-out", fill: "forwards" },
    );
    item.animation.onfinish = () => {
      item.x = point.x;
      item.y = point.y;
      applyPosition(item, point);
      item.node.style.transform = "translate3d(0, 0, 0)";
      item.node.style.opacity = ".46";
      item.animation = null;
      if (running && !document.hidden) schedule(item);
    };
  };

  const findPoint = (item, layout, occupied) => {
    const { bounds, obstacles, slots } = layout;
    const slot = slots[item.slot];
    if (!slot) return null;
    const size = { width: item.width, height: item.height };
    const slotLeft = Math.max(bounds.left, Math.min(slot.left, bounds.right - item.width));
    const slotTop = Math.max(bounds.top, Math.min(slot.top, bounds.bottom - item.height));
    const maxX = Math.max(slotLeft, Math.min(slot.right - item.width, bounds.right - item.width));
    const maxY = Math.max(slotTop, Math.min(slot.bottom - item.height, bounds.bottom - item.height));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const point = clampPoint({ x: random(slotLeft, maxX), y: random(slotTop, maxY) }, size, bounds);
      const candidate = { left: point.x, top: point.y, right: point.x + item.width, bottom: point.y + item.height };
      if (validPosition(candidate, bounds, obstacles, occupied)) return point;
    }
    const currentPoint = clampPoint({ x: item.x, y: item.y }, size, bounds);
    const current = { left: currentPoint.x, top: currentPoint.y, right: currentPoint.x + item.width, bottom: currentPoint.y + item.height };
    if (validPosition(current, bounds, obstacles, occupied)) return currentPoint;
    const fallback = clampPoint({ x: (slotLeft + maxX) / 2, y: (slotTop + maxY) / 2 }, size, bounds);
    const fallbackRect = { left: fallback.x, top: fallback.y, right: fallback.x + item.width, bottom: fallback.y + item.height };
    return validPosition(fallbackRect, bounds, obstacles, occupied) ? fallback : null;
  };

  const schedule = (item) => {
    if (!running || reducedMotion.matches || document.hidden || !item.node.isConnected) return;
    const layout = buildLayout();
    if (!layout) return;
    const occupied = [...state.values()]
      .filter((other) => other !== item && other.visible)
      .map((other) => ({ left: other.x, top: other.y, right: other.x + other.width, bottom: other.y + other.height }));
    const next = findPoint(item, layout, occupied);
    if (next) animateTo(item, next);
  };

  const buildLayout = () => {
    if (window.innerWidth < MIN_VIEWPORT) return null;
    const fieldRect = field.getBoundingClientRect();
    // Use the painted field dimensions, not a fixed monitor size. This keeps
    // every candidate inside the real viewport even when the browser zoom or
    // monitor changes the CSS pixel ratio.
    const width = Math.max(0, fieldRect.width);
    const height = Math.max(0, fieldRect.height);
    const viewportTop = Math.max(0, -fieldRect.top);
    const viewportBottom = Math.min(height, window.innerHeight - fieldRect.top);
    const visibleHeight = viewportBottom - viewportTop;
    if (width < 520 || visibleHeight < 240) return null;

    [...state.values()].forEach((item) => {
      if (isRenderable(item.node)) measure(item);
    });
    const obstacleNodes = [hero.querySelector(".helper-hero__copy"), hero.querySelector(".helper-console")].filter(Boolean);
    const obstacles = obstacleNodes.map((node) => expandRect(relativeRect(node, fieldRect), OBSTACLE_GAP));
    const visibleItems = [...state.values()].filter((item) => isRenderable(item.node));
    const widest = Math.max(104, ...visibleItems.map((item) => item.width));
    const padding = 8;
    const leftObstacle = obstacles.length ? Math.min(...obstacles.map((rect) => rect.left)) : width * .34;
    const rightObstacle = obstacles.length ? Math.max(...obstacles.map((rect) => rect.right)) : width * .66;
    const left = { left: padding, right: Math.max(padding, leftObstacle - padding), top: viewportTop + padding, bottom: viewportBottom - padding };
    const right = { left: Math.min(width - padding, rightObstacle + padding), right: width - padding, top: viewportTop + padding, bottom: viewportBottom - padding };
    const grouped = [
      [...state.values()].filter((item) => item.side === "left" && isRenderable(item.node)),
      [...state.values()].filter((item) => item.side === "right" && isRenderable(item.node)),
    ];
    const slots = [];
    for (const [group, bounds] of [[grouped[0], left], [grouped[1], right]]) {
      const gap = MIN_TASK_GAP;
      const totalGap = Math.max(0, group.length - 1) * gap;
      const slotHeight = (bounds.bottom - bounds.top - totalGap) / Math.max(1, group.length);
      if (slotHeight < 58) return null;
      group.forEach((item, index) => {
        slots[item.slot] = {
          left: bounds.left,
          right: Math.max(bounds.left, bounds.right),
          top: bounds.top + index * (slotHeight + gap),
          bottom: bounds.top + (index + 1) * slotHeight + index * gap,
        };
      });
    }
    if (left.right - left.left < widest || right.right - right.left < widest) {
      const totalGap = Math.max(0, visibleItems.length - 1) * MIN_TASK_GAP;
      const slotWidth = (width - (padding * 2) - totalGap) / Math.max(1, visibleItems.length);
      const firstObstacleTop = obstacles.length ? Math.min(...obstacles.map((rect) => rect.top)) : viewportBottom - padding;
      const lastObstacleBottom = obstacles.length ? Math.max(...obstacles.map((rect) => rect.bottom)) : viewportTop + padding;
      const horizontalRows = [
        { top: viewportTop + padding, bottom: Math.min(viewportBottom - padding, firstObstacleTop - padding) },
        { top: Math.max(viewportTop + padding, lastObstacleBottom + padding), bottom: viewportBottom - padding },
      ];
      const row = horizontalRows.find((candidate) => candidate.bottom - candidate.top >= 58);
      if (!row || slotWidth < widest) return null;
      visibleItems.forEach((item, index) => {
        const slotLeft = padding + index * (slotWidth + MIN_TASK_GAP);
        slots[item.slot] = {
          left: slotLeft,
          right: slotLeft + slotWidth,
          top: row.top,
          bottom: row.bottom,
        };
      });
    }
    return { bounds: { left: 0, top: viewportTop, right: width, bottom: viewportBottom }, obstacles, slots };
  };

  const layout = () => {
    cancelAnimations();
    // Clear a previous no-space fallback before measuring again after resize.
    state.forEach((item) => { item.node.hidden = false; });
    const ready = window.innerWidth >= MIN_VIEWPORT && !reducedMotion.matches && buildLayout();
    if (!ready) {
      running = false;
      state.forEach((item) => {
        item.visible = false;
        item.node.hidden = true;
      });
      return;
    }
    running = true;
    state.forEach((item) => {
      item.visible = isRenderable(item.node);
      if (!item.visible) return;
      item.node.hidden = false;
      const point = findPoint(item, ready, []);
      if (point) {
        setStatic(item, point);
      } else {
        // If a safe slot cannot be found, hide the decoration instead of letting it escape the hero.
        item.visible = false;
        item.node.hidden = true;
      }
    });
    state.forEach((item) => {
      if (item.visible) schedule(item);
    });
  };

  tasks.forEach((node, index) => {
    const side = node.classList.contains("helper-task--security") || node.classList.contains("helper-task--ticket") ? "left" : "right";
    state.set(node, { node, side, slot: index, width: node.offsetWidth || 104, height: node.offsetHeight || 54, x: 0, y: 0, visible: false, animation: null });
  });

  const queueLayout = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(layout);
  };

  observer = new IntersectionObserver(([entry]) => {
    const shouldRun = entry.isIntersecting && !document.hidden && !reducedMotion.matches;
    running = shouldRun;
    pauseAnimations(!shouldRun);
    if (shouldRun) state.forEach((item) => item.visible && schedule(item));
  }, { threshold: 0.15 });
  observer.observe(hero);
  window.addEventListener("resize", queueLayout, { passive: true });
  document.addEventListener("visibilitychange", () => {
    const heroRect = hero.getBoundingClientRect();
    const offscreen = heroRect.bottom <= 0 || heroRect.top >= window.innerHeight;
    const paused = document.hidden || offscreen;
    pauseAnimations(paused);
  });
  reducedMotion.addEventListener?.("change", queueLayout);
  layoutTimer = window.setTimeout(layout, 850);
})();
