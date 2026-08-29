// Falling Text — physics-based pill drop (ReactBits "FallingText" ported to vanilla TS).
// Used by the Studio page skills section. Words become matter-js bodies that fall,
// pile up, and can be dragged with the mouse.

import Matter from 'matter-js';

interface FallingTextOptions {
  /** When to start. 'click' = on container click; 'scroll' = first intersection; 'auto' = immediately. */
  trigger?: 'click' | 'scroll' | 'auto';
  /** Downward gravity (OG default ~1). */
  gravity?: number;
  /** Mouse drag stiffness. */
  mouseConstraintStiffness?: number;
}

export function initFallingText(container: HTMLElement, opts: FallingTextOptions = {}): void {
  const { trigger = 'scroll', gravity = 1, mouseConstraintStiffness = 0.2 } = opts;

  const target = container.querySelector<HTMLElement>('.falling-text-target');
  const canvasWrap = container.querySelector<HTMLElement>('.falling-text-canvas');
  if (!target || !canvasWrap) return;

  let started = false;

  function start(): void {
    if (started) return;
    started = true;

    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint, Body } = Matter;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const engine = Engine.create();
    engine.world.gravity.y = gravity;

    const render = Render.create({
      element: canvasWrap!,
      engine,
      options: { width, height, background: 'transparent', wireframes: false },
    });

    const boundary = { isStatic: true, render: { fillStyle: 'transparent' } };
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundary);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundary);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundary);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundary);

    const wordSpans = Array.from(target!.querySelectorAll<HTMLElement>('.word'));
    const wordBodies = wordSpans.map((elem) => {
      const r = elem.getBoundingClientRect();
      const x = r.left - rect.left + r.width / 2;
      const y = r.top - rect.top + r.height / 2;
      const body = Bodies.rectangle(x, y, r.width, r.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2,
      });
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: 0 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      return { elem, body };
    });

    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = 'absolute';
      elem.style.left = `${body.position.x}px`;
      elem.style.top = `${body.position.y}px`;
      elem.style.transform = 'translate(-50%, -50%)';
    });

    const mouse = Mouse.create(container);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: mouseConstraintStiffness, render: { visible: false } },
    });
    render.mouse = mouse;

    World.add(engine.world, [
      floor,
      leftWall,
      rightWall,
      ceiling,
      mouseConstraint,
      ...wordBodies.map((wb) => wb.body),
    ]);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    function updateLoop(): void {
      wordBodies.forEach(({ body, elem }) => {
        elem.style.left = `${body.position.x}px`;
        elem.style.top = `${body.position.y}px`;
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
      Matter.Engine.update(engine);
      requestAnimationFrame(updateLoop);
    }
    updateLoop();
  }

  if (trigger === 'auto') {
    start();
    return;
  }

  if (trigger === 'click') {
    const onClick = () => {
      start();
      container.removeEventListener('click', onClick);
    };
    container.addEventListener('click', onClick);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        start();
        observer.disconnect();
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(container);
}
