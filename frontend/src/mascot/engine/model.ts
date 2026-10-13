import * as THREE from 'three';

// The CAOS hamster, built from a handful of coordinated primitives and drawn in the logo's flat,
// outlined style: cream face, cheeks and ears, a dark charcoal crown, big round black eyes under
// slanted brows, long whiskers, a black top hat with a red band and a star, a smirk, and a QR code
// held in its paws. Everything that carries the brand
// (hat, smirk) lives in the rig as a named part so the animator can move it but never remove it.

export const PALETTE = {
  cream: 0xf6e7c8,
  tan: 0xc98f55,
  fur: 0x2a211d,
  earInner: 0xf0cdb8,
  nose: 0x3a2828,
  pink: 0xe9a7a0,
  ink: 0x15110f,
  red: 0xdc2626,
  white: 0xffffff,
} as const;

export interface HamsterRig {
  group: THREE.Group;
  /** Pivots at the base of the torso: leaning and lifting move the whole figure from here. */
  bodyPivot: THREE.Group;
  head: THREE.Group;
  hat: THREE.Group;
  earL: THREE.Group;
  earR: THREE.Group;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  lidL: THREE.Group;
  lidR: THREE.Group;
  /** Eyeball + highlight; offset to make the mascot look around. */
  eyeL: THREE.Group;
  eyeR: THREE.Group;
  whiskersL: THREE.Group;
  whiskersR: THREE.Group;
  pawL: THREE.Mesh;
  pawR: THREE.Mesh;
  qr: THREE.Group;
  mouth: THREE.Group;
  cheekL: THREE.Mesh;
  cheekR: THREE.Mesh;
  /** Free every geometry, material and texture the rig created. */
  dispose(): void;
}

const HEAD_PIVOT_Y = 0.1;

/** Resting values the animator offsets from (head-local space). Kept next to the geometry that
 * defines them so the two can't drift apart. */
export const REST = {
  pawRX: 0.4,
  pawRY: -0.98,
  pawRZ: 0.98,
  hatY: 1.12 - HEAD_PIVOT_Y,
  hatRoll: -0.12,
  browY: 0.86 - HEAD_PIVOT_Y,
  earTilt: 0.25,
} as const;
const OUTLINE = 0.045;

const makeToonGradient = (): THREE.DataTexture => {
  const tex = new THREE.DataTexture(new Uint8Array([105, 165, 215, 255]), 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
};

/** A deterministic QR-like pattern (finder squares + pseudo-random modules). Decorative only. */
const makeQrTexture = (): THREE.CanvasTexture => {
  const modules = 17;
  const px = 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = modules * px;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    let seed = 7;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const inFinder = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7);
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (!inFinder(x, y) && rand() > 0.5) ctx.fillRect(x * px, y * px, px, px);
      }
    }
    const finder = (fx: number, fy: number) => {
      ctx.fillStyle = '#111';
      ctx.fillRect(fx * px, fy * px, 7 * px, 7 * px);
      ctx.fillStyle = '#fff';
      ctx.fillRect((fx + 1) * px, (fy + 1) * px, 5 * px, 5 * px);
      ctx.fillStyle = '#111';
      ctx.fillRect((fx + 2) * px, (fy + 2) * px, 3 * px, 3 * px);
    };
    finder(0, 0);
    finder(modules - 7, 0);
    finder(0, modules - 7);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
};

const starShape = (outer: number, inner: number): THREE.Shape => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};

export const buildHamster = (): HamsterRig => {
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const gradient = track(makeToonGradient());
  const toon = (color: number) =>
    track(new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
  const flat = (color: number, side: THREE.Side = THREE.FrontSide) =>
    track(new THREE.MeshBasicMaterial({ color, side }));
  const inkHull = track(new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide }));

  const cream = toon(PALETTE.cream);
  const tan = toon(PALETTE.tan);
  const fur = toon(PALETTE.fur);
  const earInner = toon(PALETTE.earInner);
  const noseMat = toon(PALETTE.nose);
  const pink = toon(PALETTE.pink);
  const ink = toon(PALETTE.ink);
  const red = toon(PALETTE.red);

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, outlined = false) => {
    track(geometry);
    const m = new THREE.Mesh(geometry, material);
    if (outlined) {
      const hull = new THREE.Mesh(geometry, inkHull);
      hull.scale.setScalar(1 + OUTLINE);
      m.add(hull);
    }
    return m;
  };
  const sphere = (r: number, material: THREE.Material, outlined = true, seg = 28) =>
    mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), material, outlined);

  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, -1.5, 0);
  const figure = new THREE.Group();
  figure.position.set(0, 1.5, 0);
  bodyPivot.add(figure);
  group.add(bodyPivot);

  // ── Torso + QR + paws ──────────────────────────────────────────────────────────────────────
  const torso = sphere(1, cream);
  torso.scale.set(0.95, 0.85, 0.75);
  torso.position.set(0, -1.15, -0.15);
  figure.add(torso);

  const qrTex = track(makeQrTexture());
  const qr = new THREE.Group();
  const qrBack = mesh(new THREE.BoxGeometry(0.62, 0.62, 0.05), flat(PALETTE.white), true);
  const qrFace = mesh(
    new THREE.PlaneGeometry(0.54, 0.54),
    track(new THREE.MeshBasicMaterial({ map: qrTex })),
  );
  qrFace.position.z = 0.03;
  qr.add(qrBack, qrFace);
  qr.position.set(0, -0.78, 0.92);
  qr.rotation.z = -0.08;
  figure.add(qr);

  const makePaw = (sx: number) => {
    const paw = sphere(0.2, cream);
    paw.scale.set(1.1, 0.9, 0.9);
    paw.position.set(sx * 0.4, -0.98, 0.98);
    figure.add(paw);
    return paw;
  };
  const pawL = makePaw(-1);
  const pawR = makePaw(1);

  // ── Head ───────────────────────────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.set(0, HEAD_PIVOT_Y, 0);
  figure.add(head);
  const hy = (y: number) => y - HEAD_PIVOT_Y;

  const skull = sphere(1, cream, true, 36);
  skull.scale.set(1.25, 1.0, 1.05);
  skull.position.set(0, hy(0.35), 0);
  head.add(skull);

  // Dark crown: a charcoal cap hugging the top of the skull and dropping into a brow line over the
  // eyes, like the logo's dark head fur under the hat.
  const crown = mesh(new THREE.SphereGeometry(1.012, 36, 14, 0, Math.PI * 2, 0, 1.0), fur);
  crown.scale.set(1.25, 1.0, 1.05);
  crown.position.copy(skull.position);
  head.add(crown);

  const cheekGeo = new THREE.SphereGeometry(0.58, 28, 20);
  const makeCheek = (sx: number) => {
    const c = mesh(cheekGeo, cream, true);
    c.position.set(sx * 0.82, hy(-0.12), 0.38);
    c.scale.set(1, 0.92, 0.95);
    head.add(c);
    return c;
  };
  const cheekL = makeCheek(-1);
  const cheekR = makeCheek(1);

  const muzzle = sphere(0.42, cream, false);
  muzzle.position.set(0, hy(-0.12), 0.78);
  head.add(muzzle);
  const nose = sphere(0.1, noseMat, false, 16);
  nose.scale.set(1.3, 0.9, 1);
  nose.position.set(0, hy(0.12), 1.17);
  head.add(nose);

  // Ears: cream with a soft inner disc, tucked just below the hat's brim.
  const makeEar = (sx: number) => {
    const ear = new THREE.Group();
    ear.position.set(sx * 1.08, hy(0.9), -0.05);
    const outer = sphere(0.36, cream);
    outer.scale.set(1, 1, 0.55);
    const inner = sphere(0.22, earInner, false, 16);
    inner.scale.set(1, 1, 0.5);
    inner.position.set(-sx * 0.02, 0, 0.1);
    ear.add(outer, inner);
    ear.rotation.z = -sx * REST.earTilt;
    head.add(ear);
    return ear;
  };
  const earL = makeEar(-1);
  const earR = makeEar(1);

  // Eyes: big round black eyes with a bright highlight, like the logo's. The lid is a cap that
  // closes from the top; tilted far back it is hidden inside the head (wide open). The eyeball
  // group is offset by the animator so the mascot can glance around.
  const eyeGeo = new THREE.SphereGeometry(0.235, 24, 16);
  const glintGeo = new THREE.SphereGeometry(0.058, 10, 8);
  const glint2Geo = new THREE.SphereGeometry(0.03, 8, 6);
  const lidGeo = new THREE.SphereGeometry(0.275, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const glintMat = flat(PALETTE.white);
  const makeEye = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.5, hy(0.46), 0.99);
    pivot.rotation.y = sx * 0.22;
    const eyeball = new THREE.Group();
    const eye = mesh(eyeGeo, ink);
    eye.scale.set(0.95, 1.08, 0.72);
    const glint = mesh(glintGeo, glintMat);
    glint.position.set(sx * -0.06, 0.09, 0.15);
    const glint2 = mesh(glint2Geo, glintMat);
    glint2.position.set(sx * 0.07, -0.08, 0.15);
    eyeball.add(eye, glint, glint2);
    const lid = new THREE.Group();
    const lidMesh = mesh(lidGeo, cream);
    lidMesh.scale.set(1, 1, 0.74);
    lid.add(lidMesh);
    pivot.add(eyeball, lid);
    head.add(pivot);
    return { lid, eyeball };
  };
  const { lid: lidL, eyeball: eyeL } = makeEye(-1);
  const { lid: lidR, eyeball: eyeR } = makeEye(1);

  // Brows: thick ink bars that slant inward-down (the logo's mischievous scowl). Expressions tilt
  // and lift them; the left stays the "serious" one.
  const browGeo = new THREE.BoxGeometry(0.56, 0.15, 0.09);
  const makeBrow = (sx: number) => {
    const b = mesh(browGeo, ink);
    b.position.set(sx * 0.5, REST.browY, 0.92);
    b.rotation.y = sx * 0.3;
    head.add(b);
    return b;
  };
  const browL = makeBrow(-1);
  const browR = makeBrow(1);

  // Whiskers: three long curved strands per side fanning out over the cheeks.
  const whiskerMat = ink;
  const makeWhiskers = (sx: number) => {
    const group = new THREE.Group();
    group.position.set(0, hy(-0.05), 0);
    const fan = [
      { y: 0.04, dy: 0.17 },
      { y: -0.08, dy: 0.0 },
      { y: -0.2, dy: -0.15 },
    ];
    for (const w of fan) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 0.3, w.y, 1.06),
        new THREE.Vector3(sx * 0.58, w.y + w.dy * 0.3, 1.07),
        new THREE.Vector3(sx * 0.88, w.y + w.dy * 0.75, 1.0),
        new THREE.Vector3(sx * 1.14, w.y + w.dy, 0.88),
      ]);
      group.add(mesh(new THREE.TubeGeometry(curve, 24, 0.017, 6), whiskerMat));
    }
    head.add(group);
    return group;
  };
  const whiskersL = makeWhiskers(-1);
  const whiskersR = makeWhiskers(1);

  // Smirk: a tube whose right corner curls up. Sits on the muzzle; expressions scale and roll it
  // but the asymmetry is baked into the curve, so it can't flatten into a neutral line.
  const MUZZLE_R = 0.42;
  const onMuzzle = (x: number, y: number) =>
    new THREE.Vector3(x, y, Math.sqrt(Math.max(0, MUZZLE_R ** 2 - x ** 2 - y ** 2)) * 1.015);
  const smirk = new THREE.CatmullRomCurve3([
    onMuzzle(-0.27, -0.2),
    onMuzzle(-0.13, -0.27),
    onMuzzle(0.05, -0.27),
    onMuzzle(0.2, -0.22),
    onMuzzle(0.31, -0.11),
  ]);
  const mouth = new THREE.Group();
  mouth.position.set(0, hy(-0.12), 0.78);
  const mouthLine = mesh(new THREE.TubeGeometry(smirk, 24, 0.036, 8), ink);
  const dimple = mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        onMuzzle(0.3, -0.04),
        onMuzzle(0.36, -0.08),
        onMuzzle(0.37, -0.15),
      ]),
      8,
      0.026,
      6,
    ),
    ink,
  );
  mouth.add(mouthLine, dimple);
  head.add(mouth);

  // ── Hat: the signature. Black crown, red band, cream star, tilted brim. ─────────────────────
  const hat = new THREE.Group();
  hat.position.set(0.08, REST.hatY, -0.05);
  hat.rotation.z = REST.hatRoll;
  const brim = mesh(new THREE.CylinderGeometry(1.08, 1.12, 0.1, 40), ink, false);
  const hatCrown = mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.64, 36), ink, true);
  hatCrown.position.y = 0.37;
  const band = mesh(new THREE.CylinderGeometry(0.752, 0.752, 0.22, 36), red, false);
  band.position.y = 0.17;
  const star = mesh(
    new THREE.ShapeGeometry(starShape(0.22, 0.075)),
    flat(PALETTE.cream, THREE.DoubleSide),
  );
  star.position.set(0.04, 0.5, 0.72);
  star.rotation.y = 0.12;
  hat.add(brim, hatCrown, band, star);
  head.add(hat);

  return {
    group,
    bodyPivot,
    head,
    hat,
    earL,
    earR,
    browL,
    browR,
    lidL,
    lidR,
    eyeL,
    eyeR,
    whiskersL,
    whiskersR,
    pawL,
    pawR,
    qr,
    mouth,
    cheekL,
    cheekR,
    dispose: () => {
      for (const item of disposables) item.dispose();
      disposables.length = 0;
    },
  };
};
