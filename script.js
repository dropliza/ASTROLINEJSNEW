document.addEventListener("DOMContentLoaded", () => {
  const { Engine, World, Bodies, Body, Constraint, Runner, Vector } = Matter;

  const hero = document.getElementById("hero");
  const blackHole = document.getElementById("blackHole");
  const astronautLayer = document.getElementById("astronautLayer");
  const counterValue = document.getElementById("counterValue");
  const counterBox = document.querySelector(".hero-counter");
  const holeWord = document.getElementById("holeWord");
  const bgSound = document.getElementById("bgSound");

  const astroScreen = document.getElementById("astroScreen");
  const balloonsLayer = document.getElementById("balloonsLayer");

  const spaceMessageScreen = document.getElementById("spaceMessageScreen");
  const spaceMessageCosmos = document.getElementById("spaceMessageCosmos");
  const spaceMessageLight = document.getElementById("spaceMessageLight");
  const spaceMessageTitle = document.getElementById("spaceMessageTitle");
  const spaceMessageCosmosImage = document.querySelector(
    ".space-message-cosmos-image",
  );

  const finalScreen = document.getElementById("finalScreen");
  const finalClickHint = document.getElementById("finalClickHint");
  const finalLines = finalScreen
    ? Array.from(finalScreen.querySelectorAll(".final-line"))
    : [];

  let suckedCount = 0;
  let astronautId = 0;

  const astronauts = new Map();

  const messagePortalState = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    radius: 0,
    targetRadius: 0,
    inside: false,
    initialized: false,
  };

  const finalScreenState = {
    revealedCount: 0,
  };

  const settings = {
    desktop: {
      initialCount: 7,
      maxCount: 9,
    },
    mobile: {
      initialCount: 4,
      maxCount: 5,
    },
  };

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function getLimits() {
    return isMobile() ? settings.mobile : settings.desktop;
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getHeroRect() {
    return hero.getBoundingClientRect();
  }

  function getBlackHoleRect() {
    return blackHole.getBoundingClientRect();
  }

  function getElementCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function getBlackHoleCenterInsideHero() {
    const holeRect = getBlackHoleRect();
    const heroRect = getHeroRect();

    return {
      x: holeRect.left + holeRect.width / 2 - heroRect.left,
      y: holeRect.top + holeRect.height / 2 - heroRect.top,
    };
  }

  function updateCounter() {
    counterValue.textContent = suckedCount;
    counterBox.classList.remove("counter-bump");
    void counterBox.offsetWidth;
    counterBox.classList.add("counter-bump");
  }

  function tryPlayBackgroundSound() {
    if (!bgSound) return;

    bgSound.volume = 0.45;

    const playPromise = bgSound.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {});
    }
  }

  function unlockBackgroundSound() {
    if (!bgSound || !bgSound.paused) return;
    tryPlayBackgroundSound();
  }

  function isOverBlackHole(el, factor = 0.38) {
    const center = getElementCenter(el);
    const holeRect = getBlackHoleRect();

    const holeCenterX = holeRect.left + holeRect.width / 2;
    const holeCenterY = holeRect.top + holeRect.height / 2;

    const dx = center.x - holeCenterX;
    const dy = center.y - holeCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const holeRadius = holeRect.width * factor;

    return distance <= holeRadius;
  }

  function createAstronautElement() {
    const astronaut = document.createElement("div");
    astronaut.className = "astronaut";

    const img = document.createElement("img");
    img.src = "astronaut1.svg";
    img.alt = "astronaut";

    astronaut.appendChild(img);
    astronaut.draggable = false;

    return astronaut;
  }

  function spawnAstronaut() {
    const heroRect = getHeroRect();
    const el = createAstronautElement();
    const id = ++astronautId;

    const sizeGuess = clamp(
      heroRect.width * (isMobile() ? 0.26 : 0.18),
      120,
      300,
    );

    const startX = randomBetween(
      sizeGuess * 0.6,
      heroRect.width - sizeGuess * 0.6,
    );

    const startY = -sizeGuess;
    const driftX = randomBetween(-0.22, 0.22);
    const speedY = randomBetween(
      isMobile() ? 0.42 : 0.38,
      isMobile() ? 0.86 : 0.74,
    );
    const rotation = randomBetween(-26, 26);
    const rotationSpeed = randomBetween(-0.35, 0.35);

    const state = {
      id,
      el,
      x: startX,
      y: startY,
      driftX,
      speedY,
      currentRotation: rotation,
      rotationSpeed,
      dragging: false,
      sucked: false,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
    };

    el.style.left = `${state.x}px`;
    el.style.top = `${state.y}px`;
    el.style.setProperty("--start-rotate", `${state.currentRotation}deg`);
    el.style.transform = `translate(-50%, -50%) rotate(${state.currentRotation}deg)`;

    astronautLayer.appendChild(el);
    astronauts.set(id, state);

    attachAstronautDrag(state);
  }

  function attachAstronautDrag(state) {
    const { el } = state;

    el.addEventListener("pointerdown", (e) => {
      unlockBackgroundSound();
      if (state.sucked) return;

      state.dragging = true;
      state.pointerId = e.pointerId;
      el.classList.add("dragging");

      const heroRect = getHeroRect();
      state.offsetX = e.clientX - heroRect.left - state.x;
      state.offsetY = e.clientY - heroRect.top - state.y;

      if (el.setPointerCapture) {
        el.setPointerCapture(e.pointerId);
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (!state.dragging || state.pointerId !== e.pointerId || state.sucked) {
        return;
      }

      const heroRect = getHeroRect();
      state.x = e.clientX - heroRect.left - state.offsetX;
      state.y = e.clientY - heroRect.top - state.offsetY;

      el.style.left = `${state.x}px`;
      el.style.top = `${state.y}px`;
    });

    const finishDrag = (e) => {
      if (!state.dragging || state.pointerId !== e.pointerId || state.sucked) {
        return;
      }

      state.dragging = false;
      el.classList.remove("dragging");

      if (isOverBlackHole(el, 0.39)) {
        suckAstronaut(state);
      }
    };

    el.addEventListener("pointerup", finishDrag);
    el.addEventListener("pointercancel", finishDrag);
    el.addEventListener("dragstart", (e) => e.preventDefault());
  }

  function suckAstronaut(state) {
    const { el } = state;
    const center = getBlackHoleCenterInsideHero();

    state.sucked = true;

    el.style.left = `${state.x}px`;
    el.style.top = `${state.y}px`;
    el.style.setProperty("--hole-x", `${center.x}px`);
    el.style.setProperty("--hole-y", `${center.y}px`);
    el.style.setProperty("--start-rotate", `${state.currentRotation}deg`);
    el.classList.add("sucking");

    suckedCount += 1;
    updateCounter();

    window.setTimeout(() => {
      astronauts.delete(state.id);
      el.remove();

      const limits = getLimits();
      if (astronauts.size < limits.maxCount) {
        spawnAstronaut();
      }
    }, 900);
  }

  function attachHoleWordDrag() {
    const wordState = {
      dragging: false,
      sucked: false,
      pointerId: null,
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
    };

    function setWordToDefaultPosition() {
      holeWord.style.left = "50%";
      holeWord.style.top = "50%";
      holeWord.style.transform = "translate(-50%, -50%)";
    }

    function fixCurrentWordPosition() {
      const heroRect = getHeroRect();
      const rect = holeWord.getBoundingClientRect();

      wordState.x = rect.left + rect.width / 2 - heroRect.left;
      wordState.y = rect.top + rect.height / 2 - heroRect.top;

      holeWord.style.left = `${wordState.x}px`;
      holeWord.style.top = `${wordState.y}px`;
      holeWord.style.transform = "translate(-50%, -50%)";
    }

    holeWord.addEventListener("pointerdown", (e) => {
      unlockBackgroundSound();
      if (wordState.sucked) return;

      fixCurrentWordPosition();

      wordState.dragging = true;
      wordState.pointerId = e.pointerId;
      holeWord.classList.add("dragging");

      const heroRect = getHeroRect();
      wordState.offsetX = e.clientX - heroRect.left - wordState.x;
      wordState.offsetY = e.clientY - heroRect.top - wordState.y;

      if (holeWord.setPointerCapture) {
        holeWord.setPointerCapture(e.pointerId);
      }
    });

    holeWord.addEventListener("pointermove", (e) => {
      if (
        !wordState.dragging ||
        wordState.pointerId !== e.pointerId ||
        wordState.sucked
      ) {
        return;
      }

      const heroRect = getHeroRect();
      wordState.x = e.clientX - heroRect.left - wordState.offsetX;
      wordState.y = e.clientY - heroRect.top - wordState.offsetY;

      holeWord.style.left = `${wordState.x}px`;
      holeWord.style.top = `${wordState.y}px`;
      holeWord.style.transform = "translate(-50%, -50%)";
    });

    const finishWordDrag = (e) => {
      if (
        !wordState.dragging ||
        wordState.pointerId !== e.pointerId ||
        wordState.sucked
      ) {
        return;
      }

      wordState.dragging = false;
      holeWord.classList.remove("dragging");

      if (isOverBlackHole(holeWord, 0.34)) {
        suckHoleWord(wordState);
      } else {
        setWordToDefaultPosition();
      }
    };

    holeWord.addEventListener("pointerup", finishWordDrag);
    holeWord.addEventListener("pointercancel", finishWordDrag);
    holeWord.addEventListener("dragstart", (e) => e.preventDefault());

    setWordToDefaultPosition();
  }

  function suckHoleWord(wordState) {
    const center = getBlackHoleCenterInsideHero();
    wordState.sucked = true;

    holeWord.style.setProperty("--hole-x", `${center.x}px`);
    holeWord.style.setProperty("--hole-y", `${center.y}px`);
    holeWord.classList.add("sucking");

    window.setTimeout(() => {
      holeWord.remove();
    }, 950);
  }

  function tickAstronauts() {
    const heroRect = getHeroRect();

    astronauts.forEach((state) => {
      if (state.dragging || state.sucked) return;

      state.y += state.speedY;
      state.x += state.driftX;
      state.currentRotation += state.rotationSpeed;

      if (state.x < -80) state.x = heroRect.width + 80;
      if (state.x > heroRect.width + 80) state.x = -80;

      state.el.style.left = `${state.x}px`;
      state.el.style.top = `${state.y}px`;
      state.el.style.transform = `translate(-50%, -50%) rotate(${state.currentRotation}deg)`;

      if (state.y - 160 > heroRect.height) {
        state.el.remove();
        astronauts.delete(state.id);
        spawnAstronaut();
      }
    });
  }

  function fillInitialAstronauts() {
    const limits = getLimits();
    for (let i = 0; i < limits.initialCount; i += 1) {
      spawnAstronaut();
    }
  }

  function maintainPopulation() {
    const limits = getLimits();

    while (astronauts.size < limits.maxCount) {
      spawnAstronaut();
    }
  }

  function handleAstronautResize() {
    const heroRect = getHeroRect();

    astronauts.forEach((state) => {
      state.x = clamp(state.x, -100, heroRect.width + 100);
      state.y = clamp(state.y, -200, heroRect.height + 200);

      state.el.style.left = `${state.x}px`;
      state.el.style.top = `${state.y}px`;
    });
  }

  function initSpaceMessagePortal() {
    if (
      !spaceMessageScreen ||
      !spaceMessageCosmos ||
      !spaceMessageLight ||
      !spaceMessageTitle
    ) {
      return;
    }

    const setCenterAsDefault = () => {
      const rect = spaceMessageScreen.getBoundingClientRect();
      messagePortalState.currentX = rect.width / 2;
      messagePortalState.currentY = rect.height / 2;
      messagePortalState.targetX = rect.width / 2;
      messagePortalState.targetY = rect.height / 2;
      messagePortalState.initialized = true;
    };

    const updatePointer = (e) => {
      const rect = spaceMessageScreen.getBoundingClientRect();
      messagePortalState.targetX = e.clientX - rect.left;
      messagePortalState.targetY = e.clientY - rect.top;

      if (!messagePortalState.initialized) {
        messagePortalState.currentX = messagePortalState.targetX;
        messagePortalState.currentY = messagePortalState.targetY;
        messagePortalState.initialized = true;
      }
    };

    spaceMessageScreen.addEventListener("pointerenter", (e) => {
      unlockBackgroundSound();
      messagePortalState.inside = true;
      updatePointer(e);
      messagePortalState.targetRadius = window.innerWidth <= 768 ? 120 : 185;
      spaceMessageCosmos.style.opacity = "1";
      spaceMessageLight.style.opacity = "1";
    });

    spaceMessageScreen.addEventListener("pointermove", (e) => {
      updatePointer(e);
    });

    spaceMessageScreen.addEventListener("pointerleave", () => {
      messagePortalState.inside = false;
      messagePortalState.targetRadius = 0;
      spaceMessageLight.style.opacity = "0";
      spaceMessageCosmos.style.opacity = "0";
      spaceMessageTitle.style.transform = "translate3d(0px, 0px, 0)";
    });

    window.addEventListener("resize", setCenterAsDefault);
    setCenterAsDefault();
  }

  function tickSpaceMessagePortal() {
    if (
      !spaceMessageScreen ||
      !spaceMessageCosmos ||
      !spaceMessageLight ||
      !spaceMessageTitle
    ) {
      return;
    }

    messagePortalState.currentX +=
      (messagePortalState.targetX - messagePortalState.currentX) * 0.12;
    messagePortalState.currentY +=
      (messagePortalState.targetY - messagePortalState.currentY) * 0.12;
    messagePortalState.radius +=
      (messagePortalState.targetRadius - messagePortalState.radius) * 0.12;

    spaceMessageCosmos.style.clipPath = `circle(${messagePortalState.radius}px at ${messagePortalState.currentX}px ${messagePortalState.currentY}px)`;

    const screenWidth = Math.max(spaceMessageScreen.offsetWidth, 1);
    const screenHeight = Math.max(spaceMessageScreen.offsetHeight, 1);

    const moveX = (messagePortalState.currentX / screenWidth - 0.5) * 26;
    const moveY = (messagePortalState.currentY / screenHeight - 0.5) * 22;

    if (spaceMessageCosmosImage) {
      spaceMessageCosmosImage.style.transform = `translate(calc(-4% + ${moveX * -0.22}px), calc(-4% + ${moveY * -0.22}px)) scale(1.02)`;
    }

    spaceMessageLight.style.background = `
      radial-gradient(
        circle at ${messagePortalState.currentX}px ${messagePortalState.currentY}px,
        rgba(255,255,255,0.14) 0%,
        rgba(255,255,255,0.08) 15%,
        rgba(255,255,255,0.035) 28%,
        rgba(255,255,255,0.012) 40%,
        rgba(255,255,255,0) 58%
      )
    `;

    if (messagePortalState.inside) {
      const titleX = (messagePortalState.currentX / screenWidth - 0.5) * 10;
      const titleY = (messagePortalState.currentY / screenHeight - 0.5) * 10;
      spaceMessageTitle.style.transform = `translate3d(${titleX}px, ${titleY}px, 0)`;
    }
  }

  function getRandomFinalLineOffset(index) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = index % 4;

    if (side === 0) {
      return {
        x: -randomBetween(vw * 0.32, vw * 0.7),
        y: randomBetween(-vh * 0.18, vh * 0.18),
        r: randomBetween(-24, 24),
      };
    }

    if (side === 1) {
      return {
        x: randomBetween(vw * 0.28, vw * 0.68),
        y: randomBetween(-vh * 0.2, vh * 0.2),
        r: randomBetween(-28, 28),
      };
    }

    if (side === 2) {
      return {
        x: randomBetween(-vw * 0.16, vw * 0.16),
        y: -randomBetween(vh * 0.22, vh * 0.55),
        r: randomBetween(-20, 20),
      };
    }

    return {
      x: randomBetween(-vw * 0.16, vw * 0.16),
      y: randomBetween(vh * 0.22, vh * 0.55),
      r: randomBetween(-20, 20),
    };
  }

  function applyFinalLineStartPositions() {
    if (!finalLines.length) return;

    finalLines.forEach((line, index) => {
      if (line.classList.contains("is-visible")) return;

      const start = getRandomFinalLineOffset(index);
      line.style.setProperty("--from-x", `${start.x}px`);
      line.style.setProperty("--from-y", `${start.y}px`);
      line.style.setProperty("--from-r", `${start.r}deg`);
    });
  }

  function revealNextFinalLine() {
    if (!finalLines.length) return;
    if (finalScreenState.revealedCount >= finalLines.length) return;

    const line = finalLines[finalScreenState.revealedCount];
    line.classList.add("is-visible");
    finalScreenState.revealedCount += 1;

    if (finalClickHint) {
      finalClickHint.classList.add("is-hidden");
    }
  }

  function initFinalScreenSequence() {
    if (!finalScreen || !finalLines.length) return;

    applyFinalLineStartPositions();

    finalScreen.addEventListener("click", () => {
      unlockBackgroundSound();
      revealNextFinalLine();
    });

    finalScreen.addEventListener(
      "touchstart",
      () => {
        unlockBackgroundSound();
      },
      { passive: true },
    );

    window.addEventListener("resize", () => {
      applyFinalLineStartPositions();
    });
  }

  function createPanoTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "#f9f9f9");
    grd.addColorStop(0.28, "#dcdcdc");
    grd.addColorStop(0.5, "#9e9e9e");
    grd.addColorStop(0.75, "#ececec");
    grd.addColorStop(1, "#767676");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 130; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 3.2;
      const brightness = 180 + Math.random() * 60;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${0.18 + Math.random() * 0.24})`;
      ctx.fill();
    }

    for (let i = 0; i < 16; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 40 + Math.random() * 90;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, "rgba(255,255,255,0.22)");
      glow.addColorStop(0.25, "rgba(235,235,235,0.08)");
      glow.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  function createBalloonGeometry() {
    const radius = 16;
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i += 1) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const ny = y / radius;

      x *= 0.9;
      z *= 0.9;
      y *= 1.22;

      if (ny < -0.18) {
        const t = (-0.18 - ny) / 0.82;
        const smooth = t * t * (3 - 2 * t);
        const taper = 1 - smooth * 0.16;

        x *= taper;
        z *= taper;
      }

      if (ny < -0.88) {
        const t = (-0.88 - ny) / 0.12;
        const smooth = t * t * (3 - 2 * t);

        x *= 1 - smooth * 0.04;
        z *= 1 - smooth * 0.04;
        y -= smooth * 0.08;
      }

      pos.setXYZ(i, x, y, z);
    }

    geo.computeVertexNormals();
    return geo;
  }

  const balloonVertexShader = `
    varying vec3 vPosition;
    varying vec3 vReflect;
    varying float vAlpha;
    varying float vReflectionFactor;

    uniform vec2 uMouse;
    uniform float mFresnelBias;
    uniform float mFresnelScale;
    uniform float mFresnelPower;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
      vec3 I = worldPosition.xyz - cameraPosition;

      vReflectionFactor = mFresnelBias + mFresnelScale * pow(
        1.0 + dot(normalize(I), worldNormal),
        mFresnelPower
      );

      vec4 mPosition = modelMatrix * vec4(position, 1.0);
      vec3 nWorld = normalize(mat3(modelMatrix) * normal);
      I = cameraPosition - mPosition.xyz;
      vReflect = normalize(reflect(I, nWorld));

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      float distFromMouse = distance(uMouse, gl_Position.xy / gl_Position.w);
      vAlpha = ((1.0 - (distFromMouse * 4.0)) * 0.5) + 0.5;
      vAlpha = clamp(vAlpha, 0.0, 1.0);
      vPosition = gl_Position.xyz / gl_Position.w;
    }
  `;

  const balloonFragmentShader = `
    uniform float uGlobalAlpha;
    uniform sampler2D tDiffuse;

    varying vec3 vPosition;
    varying vec3 vReflect;
    varying float vAlpha;
    varying float vReflectionFactor;

    void main(void) {
      float PI = 3.14159265358979323846264;

      float yaw = 0.5 + atan(vReflect.z, vReflect.x) / (2.0 * PI);
      float pitch = 0.5 + atan(vReflect.y, length(vReflect.xz)) / PI;

      vec3 color = texture2D(tDiffuse, vec2(yaw, pitch)).rgb;

      vec4 gradientColor = vec4(vec3(vPosition.xy * 0.5 + 0.5, 1.0), 1.0);
      vec4 restColor = vec4(vec3(0.40), 1.0);
      vec4 mixColor = mix(gradientColor, restColor, 1.0 - vAlpha);

      vec3 reflectionColor = color * (vReflectionFactor - 0.1);
      vec3 metalReflectionColor = (reflectionColor * mixColor.xyz) / 0.2;
      vec3 flatReflectionColor = (reflectionColor + mixColor.xyz) / 0.2;
      vec3 mixedReflection = mix(metalReflectionColor, flatReflectionColor, 0.3);

      gl_FragColor = vec4(
        vec3(vAlpha * mixedReflection) + (metalReflectionColor * 0.3),
        0.86 * uGlobalAlpha
      );
    }
  `;

  const CollisionCategories = {
    chainLink: 0x0001,
    mouse: 0x0002,
    balloon: 0x0004,
  };

  class PhysicsBalloon {
    constructor(opts) {
      this.position = opts.position || { x: 0, y: 0, rawX: 0 };
      this.viewportHeight = opts.viewportHeight;
      this.ropeHeight = this.viewportHeight - this.position.y;
      this.ropeInterLinkLength = opts.ropeInterLinkLength || 40;
      this.nbLinks = Math.max(
        6,
        Math.floor(this.ropeHeight / this.ropeInterLinkLength),
      );
      this.ropeEls = [];
      this.ropeBodies = [];
      this.balloonBody = null;
      this.initRope();
      this.initBalloon();
    }

    initRope() {
      const segLen = this.ropeHeight / this.nbLinks;
      this.ropeBodies = [];
      this.ropeEls = [];

      for (let i = 0; i < this.nbLinks; i += 1) {
        const x = this.position.x;
        const y = this.viewportHeight - i * segLen;
        const mass = 0.8;

        const link = Bodies.circle(x, y, 5, {
          mass,
          inverseMass: 1 / mass,
          frictionAir: 0.025,
          collisionFilter: {
            category: CollisionCategories.chainLink,
            mask: CollisionCategories.mouse,
          },
        });

        if (i > 0) {
          const constraint = Constraint.create({
            bodyA: link,
            bodyB: this.ropeBodies[i - 1],
            stiffness: 0.86,
            damping: 0.08,
            length: segLen,
          });
          this.ropeEls.push(constraint);
        } else {
          link.isStatic = true;
        }

        this.ropeEls.push(link);
        this.ropeBodies.push(link);
      }
    }

    initBalloon() {
      const x = this.position.x;
      const y = this.position.y;
      const segLen = this.ropeHeight / Math.max(1, this.nbLinks - 1);

      this.balloonBody = Bodies.rectangle(x, y, 68, 100, {
        frictionAir: 0.12,
        restitution: 0.82,
        density: 0.001,
        collisionFilter: {
          category: CollisionCategories.balloon,
          mask: CollisionCategories.balloon,
        },
      });

      const constraint = Constraint.create({
        bodyA: this.balloonBody,
        bodyB: this.ropeBodies[this.nbLinks - 1],
        stiffness: 0.92,
        damping: 0.1,
        length: segLen * 0.9,
      });

      this.ropeEls.push(constraint);
    }
  }

  class BalloonInstance extends THREE.Object3D {
    constructor(opts, sharedMaterial, width, height) {
      super();
      this.opts = opts;
      this.sharedMaterial = sharedMaterial;
      this.viewportWidth = width;
      this.viewportHeight = height;
      this.initPhysics();
      this.init();
    }

    init() {
      this.balloon = this.opts.model.clone();
      this.balloon.position.x = this.opts.position[0];
      this.balloon.position.y = this.opts.position[1];
      this.balloon.scale.setScalar(this.opts.scale);
      this.add(this.balloon);

      this.balloon.traverse((child) => {
        if (child.isMesh) {
          child.material = this.sharedMaterial;
          child.renderOrder = 2;
        }
      });

      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
      });

      const points = this.pBalloon.ropeBodies.map((b) => {
        return new THREE.Vector3(
          b.position.x - this.viewportWidth / 2,
          -b.position.y + this.viewportHeight / 2,
          0,
        );
      });

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      this.line = new THREE.Line(lineGeo, lineMat);
      this.line.renderOrder = 1;
      this.add(this.line);
    }

    initPhysics() {
      const halfW = this.viewportWidth / 2;
      const halfH = this.viewportHeight / 2;

      this.pBalloon = new PhysicsBalloon({
        ropeInterLinkLength: this.viewportWidth <= 768 ? 34 : 40,
        viewportHeight: this.viewportHeight,
        position: {
          x: halfW - -1 * this.opts.position[0],
          y: halfH + this.opts.position[1],
        },
      });

      this.originPosition = {
        x: halfW - -1 * this.opts.position[0],
        y: halfH + this.opts.position[1],
      };
    }

    getRopeAngle() {
      const len = this.pBalloon.ropeBodies.length;
      const last = this.pBalloon.ropeBodies[len - 1];
      const prev = this.pBalloon.ropeBodies[len - 2];
      let angle = Math.atan2(
        prev.position.y - last.position.y,
        last.position.x - prev.position.x,
      );
      angle += Math.PI / 2;
      angle -= Math.PI;
      return angle;
    }

    attractToOrigin() {
      const dir = Vector.sub(
        this.originPosition,
        this.pBalloon.balloonBody.position,
      );
      const springForce = Vector.mult(dir, 0.00012);

      const t = performance.now() * 0.001;
      const floatX = Math.sin(t * 1.35 + this.opts.id) * 0.00055;
      const microLift = Math.cos(t * 1.05 + this.opts.id) * 0.00038;

      Body.applyForce(
        this.pBalloon.balloonBody,
        this.pBalloon.balloonBody.position,
        {
          x: springForce.x + floatX,
          y: springForce.y - 0.0042 + microLift,
        },
      );
    }

    update(width, height) {
      if (!this.pBalloon.balloonBody) return;

      this.viewportWidth = width;
      this.viewportHeight = height;

      this.attractToOrigin();

      const angle = this.getRopeAngle();
      this.balloon.position.x =
        this.pBalloon.balloonBody.position.x - width / 2;
      this.balloon.position.y =
        -this.pBalloon.balloonBody.position.y + height / 2;
      this.balloon.rotation.z = angle;

      const bodies = this.pBalloon.ropeBodies;
      const posAttr = this.line.geometry.attributes.position;

      for (let i = 0; i < bodies.length && i < posAttr.count; i += 1) {
        posAttr.setXYZ(
          i,
          bodies[i].position.x - width / 2,
          -bodies[i].position.y + height / 2,
          0,
        );
      }

      posAttr.needsUpdate = true;
    }

    updateMouseUniform(mouse, width, height) {
      const mx = (mouse.x / width) * 2 - 1;
      const my = -(mouse.y / height) * 2 + 1;
      this.sharedMaterial.uniforms.uMouse.value.set(mx, my);
    }

    setOpacity(val) {
      this.sharedMaterial.uniforms.uGlobalAlpha.value = val;
      this.line.material.opacity = 0.14 * val;
    }
  }

  class DreamBalloonsSection {
    constructor(container, hostSection) {
      this.container = container;
      this.hostSection = hostSection;
      this.W = Math.max(1, this.container.clientWidth);
      this.H = Math.max(1, this.container.clientHeight);
      this.balloons = [];
      this.mouse = { x: -9999, y: -9999 };
      this.opacity = { value: 0 };

      this.scene = new THREE.Scene();

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      this.renderer.setSize(this.W, this.H);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.domElement.style.position = "absolute";
      this.renderer.domElement.style.inset = "0";
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.pointerEvents = "none";

      this.container.innerHTML = "";
      this.container.appendChild(this.renderer.domElement);

      this.camera = new THREE.PerspectiveCamera(45, this.W / this.H, 1, 2200);
      this.camera.position.z = 830;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));

      this.panoTexture = createPanoTexture();
      this.balloonGeometry = createBalloonGeometry();
      this.balloonModel = new THREE.Group();

      const baseMesh = new THREE.Mesh(
        this.balloonGeometry,
        new THREE.MeshBasicMaterial(),
      );
      this.balloonModel.add(baseMesh);

      this.sharedUniforms = {
        uMouse: { value: new THREE.Vector2(2, 2) },
        uGlobalAlpha: { value: 0 },
        tDiffuse: { value: this.panoTexture },
        mFresnelBias: { value: 0.1 },
        mFresnelPower: { value: 2.0 },
        mFresnelScale: { value: 1.0 },
      };

      this.balloonMaterial = new THREE.ShaderMaterial({
        uniforms: this.sharedUniforms,
        vertexShader: balloonVertexShader,
        fragmentShader: balloonFragmentShader,
        transparent: true,
        depthWrite: false,
      });

      this.engine = Engine.create({
        gravity: { x: 0, y: 0.01 },
      });
      this.runner = Runner.create();

      this.mouseBody = Bodies.circle(-9999, -9999, this.W <= 768 ? 80 : 100, {
        isStatic: true,
        collisionFilter: {
          category: CollisionCategories.mouse,
          mask: CollisionCategories.chainLink,
        },
      });
      World.add(this.engine.world, this.mouseBody);

      this.light = new THREE.PointLight(0xffffff, 1.25, 1100);
      this.light.position.set(0, 0, 700);
      this.scene.add(this.light);

      this.ambient = new THREE.AmbientLight(0xffffff, 0.45);
      this.scene.add(this.ambient);

      this.onResize = this.resize.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerLeave = this.handlePointerLeave.bind(this);
      this.loop = this.loop.bind(this);

      this.addBalloons();
      this.bindEvents();
      this.transitionIn();
      this.raf = requestAnimationFrame(this.loop);
    }

    getBalloonPositions() {
      if (window.innerWidth <= 768) {
        return [
          [-360, -210, 5.15],
          [-235, -255, 4.25],
          [-80, -220, 4.7],
          [105, -245, 5.25],
          [300, -230, 4.95],
          [-305, -85, 4.75],
          [-135, -55, 4.05],
          [60, -78, 4.65],
          [255, -55, 4.1],
          [-350, 55, 4.35],
          [-180, 35, 3.95],
          [5, 55, 4.25],
          [195, 25, 3.9],
          [350, 55, 4.2],
          [-270, 165, 4.8],
          [-55, 178, 4.35],
          [160, 158, 4.55],
          [330, 185, 4.1],
          [-350, 255, 4.15],
          [-180, 275, 3.85],
          [15, 265, 4.05],
          [235, 278, 4.2],
          [360, 255, 3.95],
          [-95, -145, 3.7],
          [325, -135, 3.8],
          [-290, 265, 3.75],
          [120, 300, 3.8],
        ];
      }

      return [
        [-760, -265, 5.25],
        [-560, -330, 4.35],
        [-295, -285, 4.95],
        [-35, -335, 5.7],
        [245, -285, 4.55],
        [540, -325, 5.4],
        [790, -280, 4.85],
        [-690, -105, 4.9],
        [-430, -55, 4.15],
        [-145, -90, 4.75],
        [120, -55, 4.2],
        [405, -105, 4.7],
        [690, -60, 4.15],
        [-770, 60, 4.45],
        [-525, 25, 3.95],
        [-260, 70, 4.35],
        [0, 30, 3.95],
        [255, 72, 4.4],
        [520, 35, 4.05],
        [805, 65, 4.3],
        [-635, 215, 5.05],
        [-360, 180, 4.25],
        [-90, 230, 4.8],
        [190, 188, 4.25],
        [470, 235, 4.95],
        [760, 190, 4.3],
        [-785, 335, 4.25],
        [-545, 365, 3.9],
        [-255, 330, 4.2],
        [25, 375, 4.05],
        [295, 338, 4.3],
        [585, 370, 4.05],
        [825, 335, 4.2],
        [-100, -210, 3.75],
        [605, -205, 3.85],
        [-665, 315, 3.8],
        [105, 285, 3.75],
      ];
    }

    addBalloons() {
      const positions = this.getBalloonPositions();

      positions.forEach((pos, i) => {
        const balloon = new BalloonInstance(
          {
            model: this.balloonModel,
            position: [pos[0], pos[1]],
            scale: pos[2],
            id: i,
          },
          this.balloonMaterial,
          this.W,
          this.H,
        );

        balloon.pBalloon.ropeEls.forEach((el) =>
          World.add(this.engine.world, el),
        );
        World.add(this.engine.world, balloon.pBalloon.balloonBody);

        this.balloons.push(balloon);
        this.scene.add(balloon);
      });
    }

    clearBalloons() {
      this.balloons.forEach((b) => {
        b.pBalloon.ropeEls.forEach((el) => World.remove(this.engine.world, el));
        World.remove(this.engine.world, b.pBalloon.balloonBody);
        if (b.line?.geometry) b.line.geometry.dispose();
        if (b.line?.material) b.line.material.dispose();
        this.scene.remove(b);
      });

      this.balloons = [];
    }

    bindEvents() {
      window.addEventListener("resize", this.onResize);
      this.hostSection.addEventListener("pointermove", this.onPointerMove);
      this.hostSection.addEventListener("pointerdown", this.onPointerMove);
      this.hostSection.addEventListener("pointerleave", this.onPointerLeave);
      this.hostSection.addEventListener("pointercancel", this.onPointerLeave);
    }

    handlePointerMove(e) {
      const rect = this.hostSection.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;

      this.light.position.x = this.mouse.x - this.W / 2;
      this.light.position.y = -(this.mouse.y - this.H / 2);

      Body.setPosition(this.mouseBody, {
        x: this.mouse.x,
        y: this.mouse.y,
      });

      for (let i = 0; i < this.balloons.length; i += 1) {
        this.balloons[i].updateMouseUniform(this.mouse, this.W, this.H);
      }
    }

    handlePointerLeave() {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
      Body.setPosition(this.mouseBody, { x: -9999, y: -9999 });

      for (let i = 0; i < this.balloons.length; i += 1) {
        this.balloons[i].updateMouseUniform(this.mouse, this.W, this.H);
      }
    }

    transitionIn() {
      const duration = 1200;
      const start = performance.now();

      const animate = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        this.opacity.value = eased;

        this.balloons.forEach((b) => b.setOpacity(this.opacity.value));

        if (t < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }

    resize() {
      this.W = Math.max(1, this.container.clientWidth);
      this.H = Math.max(1, this.container.clientHeight);

      this.camera.aspect = this.W / this.H;
      this.camera.updateProjectionMatrix();

      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      this.renderer.setSize(this.W, this.H);

      Body.setPosition(this.mouseBody, { x: -9999, y: -9999 });

      this.clearBalloons();
      this.addBalloons();

      this.balloons.forEach((b) => b.setOpacity(this.opacity.value));
    }

    loop() {
      this.raf = requestAnimationFrame(this.loop);

      Runner.tick(this.runner, this.engine, 1000 / 60);

      for (let i = 0; i < this.balloons.length; i += 1) {
        this.balloons[i].update(this.W, this.H);
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  function masterTick() {
    tickAstronauts();
    tickSpaceMessagePortal();
    requestAnimationFrame(masterTick);
  }

  tryPlayBackgroundSound();

  window.addEventListener("pointerdown", unlockBackgroundSound, {
    passive: true,
  });
  window.addEventListener("touchstart", unlockBackgroundSound, {
    passive: true,
  });
  window.addEventListener("keydown", unlockBackgroundSound);

  fillInitialAstronauts();
  attachHoleWordDrag();
  initSpaceMessagePortal();
  initFinalScreenSequence();

  if (balloonsLayer && astroScreen) {
    new DreamBalloonsSection(balloonsLayer, astroScreen);
  }

  masterTick();

  setInterval(maintainPopulation, 1600);

  window.addEventListener("resize", () => {
    handleAstronautResize();
  });
});
