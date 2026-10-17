// The mascot's copy banks (guest questions and mascot lines) and the template filler. Copy is
// data we write, so these tests are the guard rails for spec §9.4: only known placeholders, no
// time promises, no sensitive topics, unique ids, and enough variety for the welcome to rotate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_QUESTIONS } from '../src/constants/guestQuestions';
import { MASCOT_COPY } from '../src/constants/mascotCopy';
import { fillTemplate } from '../src/services/copyTemplates';

const ALLOWED_PLACEHOLDERS = new Set(['name', 'usual', 'cafe', 'category', 'dish', 'share']);
const GESTURES = new Set(['nod', 'tilt', 'wave', 'pop', 'wiggle', 'tipHat', 'lean']);
// The brief's rule, plus the other ways a time promise creeps in.
const TIME_PROMISE = /\b(soon|minutes?|mins?|seconds|hours?|shortly|instantly|immediately|guarantee[sd]?|right away|in no time|ready in)\b/i;
// Spec §9.4: nothing about health, diet-shaming, religion, politics or personal data.
const OFF_LIMITS =
  /\b(health\w*|diet\w*|calorie\w*|sugar[- ]free|guilt\w*|sin|sinful|fat|fatty|weight|diabet\w*|doctor|sick\w*|illness|medic\w*|allerg\w*|vegan|vegetarian|non-?veg|halal|jain|religio\w*|god|prayer|pray\w*|temple|church|mosque|politic\w*|election|vote|voting|government|modi|age|address|salary|income|email|phone|number|surname|caste)\b/i;

type Line = { id: string; text: string };

const placeholdersIn = (text: string): string[] => [...text.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]);

/** Every piece of guest-visible copy in the question bank. */
const questionTexts = (): string[] =>
  GUEST_QUESTIONS.flatMap((q) => [
    q.text,
    ...q.options.flatMap((o) => [o.label, o.reply, ...o.welcomeTemplates.map((t) => t.text)]),
  ]);

const mascotLines = (): Line[] => Object.values(MASCOT_COPY).flat();

const allTemplates = (): Line[] => [...GUEST_QUESTIONS.flatMap((q) => q.options.flatMap((o) => o.welcomeTemplates)), ...mascotLines()];

// ---------------------------------------------------------------- question bank

test('there are at least 12 active questions, each with 2 to 5 options', () => {
  const active = GUEST_QUESTIONS.filter((q) => q.active);
  assert.ok(active.length >= 12, `only ${active.length} active questions`);
  for (const q of GUEST_QUESTIONS) {
    assert.ok(q.options.length >= 2 && q.options.length <= 5, `${q.id} has ${q.options.length} options`);
  }
});

test('question ids, option ids and welcome template ids are each unique across the bank', () => {
  const questionIds = GUEST_QUESTIONS.map((q) => q.id);
  assert.equal(new Set(questionIds).size, questionIds.length, 'duplicate question id');
  const optionIds = GUEST_QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
  assert.equal(new Set(optionIds).size, optionIds.length, 'duplicate option id');
  const templateIds = allTemplates().map((t) => t.id);
  assert.equal(new Set(templateIds).size, templateIds.length, 'duplicate template id (across questions and mascot copy)');
  for (const id of [...questionIds, ...optionIds, ...templateIds]) assert.match(id, /^[a-z0-9][a-z0-9._-]*$/, `odd id ${id}`);
});

test('every option is complete: label, a known gesture, a reply, and 1 to 3 welcome templates', () => {
  for (const q of GUEST_QUESTIONS) {
    assert.ok(q.text.trim().length > 0, `${q.id} has no text`);
    for (const o of q.options) {
      assert.ok(o.label.trim().length > 0, `${o.id} has no label`);
      assert.ok(o.reply.trim().length > 0, `${o.id} has no reply`);
      assert.ok(GESTURES.has(o.replyGesture), `${o.id} has unknown gesture ${o.replyGesture}`);
      assert.ok(o.welcomeTemplates.length >= 1 && o.welcomeTemplates.length <= 3, `${o.id} has ${o.welcomeTemplates.length} templates`);
      if (o.emoji !== undefined) assert.ok(o.emoji.trim().length > 0, `${o.id} has a blank emoji`);
    }
  }
});

test('every welcome template names the guest, and every option has one that needs no usual dish', () => {
  for (const q of GUEST_QUESTIONS) {
    for (const o of q.options) {
      for (const t of o.welcomeTemplates) assert.ok(placeholdersIn(t.text).includes('name'), `${t.id} does not use {name}`);
      assert.ok(
        o.welcomeTemplates.some((t) => !placeholdersIn(t.text).includes('usual')),
        `${o.id} has no template that works for a guest without a usual`
      );
    }
  }
});

test('questions and options spread across the gestures rather than repeating one', () => {
  const used = new Set(GUEST_QUESTIONS.flatMap((q) => q.options.map((o) => o.replyGesture)));
  assert.ok(used.size >= 5, `only ${used.size} different gestures used`);
});

// ---------------------------------------------------------------- the rules for all copy

test('every template placeholder is in the allowed set', () => {
  const all = [...questionTexts(), ...mascotLines().map((l) => l.text)];
  for (const text of all) {
    for (const p of placeholdersIn(text)) assert.ok(ALLOWED_PLACEHOLDERS.has(p), `{${p}} in "${text}" is not an allowed placeholder`);
    assert.ok(!/[{}]/.test(text.replace(/\{[^{}]*\}/g, '')), `stray brace in "${text}"`);
  }
});

test('only welcome templates and mascot lines use placeholders; questions, labels and replies are plain text', () => {
  for (const q of GUEST_QUESTIONS) {
    assert.ok(!/[{}]/.test(q.text), `${q.id} text has a brace`);
    for (const o of q.options) {
      assert.ok(!/[{}]/.test(o.label), `${o.id} label has a brace`);
      assert.ok(!/[{}]/.test(o.reply), `${o.id} reply has a brace`);
    }
  }
});

test('no copy promises time or a guarantee', () => {
  for (const text of [...questionTexts(), ...mascotLines().map((l) => l.text)]) {
    assert.ok(!/\b(soon|minute|min|guarantee)\b/i.test(text), `"${text}" matches the brief's banned words`);
    assert.ok(!TIME_PROMISE.test(text), `"${text}" sounds like a time promise`);
  }
});

test('no copy touches health, diets, religion, politics or personal data', () => {
  for (const text of [...questionTexts(), ...mascotLines().map((l) => l.text)]) {
    assert.ok(!OFF_LIMITS.test(text), `"${text}" strays into an off-limits topic (${OFF_LIMITS.exec(text)?.[0]})`);
  }
});

test('no copy is blank, shouts, or runs long', () => {
  for (const text of [...questionTexts(), ...mascotLines().map((l) => l.text)]) {
    assert.equal(text, text.trim());
    assert.ok(text.length > 0 && text.length <= 140, `"${text}" is ${text.length} characters`);
    assert.ok(!/!{2,}/.test(text), `"${text}" has stacked exclamation marks`);
  }
});

// ---------------------------------------------------------------- mascot copy

test('MASCOT_COPY has all six lists, each with unique ids and at least 2 entries', () => {
  assert.deepEqual(Object.keys(MASCOT_COPY).sort(), ['categoryTip', 'firstVisit', 'houseSpecialTip', 'pairing', 'pairingShare', 'welcomeFallbacks']);
  for (const [name, lines] of Object.entries(MASCOT_COPY)) {
    assert.ok(lines.length >= 2, `${name} has ${lines.length} entries`);
    assert.equal(new Set(lines.map((l) => l.id)).size, lines.length, `${name} has a duplicate id`);
    for (const l of lines) assert.ok(typeof l.id === 'string' && l.id && typeof l.text === 'string' && l.text, `${name} has an empty entry`);
  }
});

test('welcome fallbacks run from "with usual" to "name only", with at least two of each so rotation always has a choice', () => {
  const lines = MASCOT_COPY.welcomeFallbacks;
  assert.ok(lines.length >= 3);
  const usesUsual = lines.map((l) => placeholdersIn(l.text).includes('usual'));
  const firstNameOnly = usesUsual.indexOf(false);
  assert.ok(firstNameOnly > 0, 'the fallbacks must start with a line that uses the usual');
  assert.ok(usesUsual.slice(firstNameOnly).every((u) => !u), 'with-usual lines must all come before name-only lines');
  assert.ok(firstNameOnly >= 2, 'at least two lines use the usual');
  assert.ok(lines.length - firstNameOnly >= 2, 'at least two lines are name only');
  for (const l of lines) {
    const ph = placeholdersIn(l.text);
    assert.ok(ph.includes('name'), `${l.id} does not use {name}`);
    assert.ok(ph.every((p) => p === 'name' || p === 'usual'), `${l.id} uses a placeholder a welcome cannot fill`);
  }
});

test('first-visit lines greet the guest to the café', () => {
  for (const l of MASCOT_COPY.firstVisit) assert.ok(placeholdersIn(l.text).includes('cafe'), `${l.id} does not use {cafe}`);
  for (const l of MASCOT_COPY.firstVisit) {
    assert.ok(placeholdersIn(l.text).every((p) => p === 'cafe'), `${l.id} uses a placeholder a first visit cannot fill (no name yet)`);
  }
});

test('tips and pairings use only the placeholders they can be given', () => {
  const allowedFor: Record<string, string[]> = {
    categoryTip: ['category', 'dish'],
    houseSpecialTip: ['dish', 'cafe', 'category'],
    pairing: ['dish'],
    pairingShare: ['dish', 'share'],
  };
  for (const [list, allowed] of Object.entries(allowedFor)) {
    for (const l of MASCOT_COPY[list as keyof typeof MASCOT_COPY]) {
      const ph = placeholdersIn(l.text);
      assert.ok(ph.includes('dish'), `${l.id} never names the dish`);
      assert.ok(ph.every((p) => allowed.includes(p)), `${l.id} uses a placeholder outside ${allowed.join(', ')}`);
    }
  }
  for (const l of MASCOT_COPY.categoryTip) assert.ok(placeholdersIn(l.text).includes('category'), `${l.id} never names the category`);
});

test('a house-special tip never claims "most ordered" or "best seller"', () => {
  for (const l of MASCOT_COPY.houseSpecialTip) {
    assert.ok(!/most ordered|best[- ]?sell|popular|favourite|favorite|everyone|most guests/i.test(l.text), `${l.id} claims popularity: "${l.text}"`);
  }
});

test('only pairingShare lines carry the {share} figure, and every one of them does', () => {
  for (const [list, lines] of Object.entries(MASCOT_COPY)) {
    for (const l of lines) {
      assert.equal(placeholdersIn(l.text).includes('share'), list === 'pairingShare', `${l.id}: {share} belongs in pairingShare only`);
    }
  }
  for (const q of GUEST_QUESTIONS) for (const o of q.options) for (const t of o.welcomeTemplates) assert.ok(!t.text.includes('{share}'), t.id);
});

test('fillTemplate fills {share}', () => {
  assert.equal(fillTemplate('{share} guests add {dish} with this.', { share: '7 in 10', dish: 'Bun Maska' }), '7 in 10 guests add Bun Maska with this.');
});

test('pairing lines carry no number (a "7 in 10" share is only ever from real data)', () => {
  for (const l of [...MASCOT_COPY.pairing, ...MASCOT_COPY.pairingShare]) assert.ok(!/\d/.test(l.text), `${l.id} has a digit`);
});

// ---------------------------------------------------------------- fillTemplate

test('fillTemplate fills every placeholder it is given', () => {
  assert.equal(
    fillTemplate('Welcome back, {name}! Kadak {usual} again at {cafe}? {category}: {dish}', {
      name: 'Asha',
      usual: 'masala chai',
      cafe: 'Chai Point',
      category: 'Snacks',
      dish: 'Bun Maska',
    }),
    'Welcome back, Asha! Kadak masala chai again at Chai Point? Snacks: Bun Maska'
  );
});

test('fillTemplate fills a placeholder every time it appears', () => {
  assert.equal(fillTemplate('{name}, {name}, {name}!', { name: 'Ravi' }), 'Ravi, Ravi, Ravi!');
});

test('fillTemplate returns null when a placeholder has no value', () => {
  assert.equal(fillTemplate('Welcome back, {name}! Your usual {usual}?', { name: 'Asha' }), null);
  assert.equal(fillTemplate('Welcome back, {name}!', {}), null);
  assert.equal(fillTemplate('Welcome back, {name}!', { name: undefined }), null);
});

test('fillTemplate treats an empty or blank value as missing', () => {
  assert.equal(fillTemplate('Hi {name}', { name: '' }), null);
  assert.equal(fillTemplate('Hi {name}', { name: '   ' }), null);
});

test('fillTemplate ignores extra values and text without placeholders', () => {
  assert.equal(fillTemplate('Welcome back, {name}!', { name: 'Asha', usual: 'filter coffee', cafe: 'Chai Point' }), 'Welcome back, Asha!');
  assert.equal(fillTemplate('Hello there.', {}), 'Hello there.');
  assert.equal(fillTemplate('Hello there.', { name: 'Asha' }), 'Hello there.');
});

test('fillTemplate returns null for a placeholder that is not allowed, even if a value is supplied', () => {
  assert.equal(fillTemplate('Hi {phone}', { phone: '9876543210' } as never), null);
  assert.equal(fillTemplate('Hi {constructor}', {}), null);
  assert.equal(fillTemplate('Hi {toString}', {}), null);
  assert.equal(fillTemplate('Hi {}', {}), null);
});

test('fillTemplate inserts values literally: no re-expansion, no replacement patterns', () => {
  assert.equal(fillTemplate('Hi {name}, {usual}', { name: '{usual}', usual: 'chai' }), 'Hi {usual}, chai');
  assert.equal(fillTemplate('Hi {name}', { name: "$& $1 $$ $'" }), "Hi $& $1 $$ $'");
});
