// A user's own new-order alert sound: uploaded through the storage helper, per person (owner and
// staff alike), served back as audio, replaceable and resettable to the default.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import accountRoutes from '../src/routes/accountRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import { parseAudioDataUrl, MAX_AUDIO_BYTES } from '../src/services/storage';

let h: Harness;
let owner: string;
let staffToken: string;

// A few bytes are enough: the server checks the declared type and size, not the audio itself.
const audioUrl = (type = 'audio/mpeg', bytes = 2048) => `data:${type};base64,${Buffer.alloc(bytes, 1).toString('base64')}`;
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const put = (token: string, audio: unknown) => request(h.app).put('/api/v1/account/ringtone').set(as(token)).send({ audio });

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/account', accountRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  owner = await tokenFor('owner@artisan.com');
  await request(h.app).post('/api/v1/staff').set(as(owner)).send({ name: 'Line Cook', email: 'linecook@artisan.com', password: 'kitchen-pass-1' });
  staffToken = (await request(h.app).post('/api/v1/auth/login').send({ email: 'linecook@artisan.com', password: 'kitchen-pass-1' })).body.data.token;
});
after(async () => {
  await h.stop();
});

test('the owner and a staff member each get their own alert sound', async () => {
  const mine = await put(owner, audioUrl());
  assert.equal(mine.status, 200, JSON.stringify(mine.body));
  const theirs = await put(staffToken, audioUrl('audio/wav'));
  assert.equal(theirs.status, 200, JSON.stringify(theirs.body));

  assert.match(mine.body.data.ringtoneUrl, /^\/api\/v1\/public\/images\//);
  assert.notEqual(mine.body.data.ringtoneUrl, theirs.body.data.ringtoneUrl);

  // One person's choice never shows up on another's profile.
  const ownerProfile = (await request(h.app).get('/api/v1/account/profile').set(as(owner))).body.data;
  const staffProfile = (await request(h.app).get('/api/v1/account/profile').set(as(staffToken))).body.data;
  assert.equal(ownerProfile.ringtoneUrl, mine.body.data.ringtoneUrl);
  assert.equal(staffProfile.ringtoneUrl, theirs.body.data.ringtoneUrl);
});

test('the sound is served back as audio, and is part of the login details', async () => {
  const url: string = (await request(h.app).get('/api/v1/account/profile').set(as(staffToken))).body.data.ringtoneUrl;
  const file = await request(h.app).get(url);
  assert.equal(file.status, 200);
  assert.equal(file.headers['content-type'], 'audio/wav');

  const login = await request(h.app).post('/api/v1/auth/login').send({ email: 'linecook@artisan.com', password: 'kitchen-pass-1' });
  assert.equal(login.body.data.user.ringtoneUrl, url);
});

test('picking another sound replaces the old one, and removing it restores the default', async () => {
  const before = (await request(h.app).get('/api/v1/account/profile').set(as(owner))).body.data.ringtoneUrl;
  const replaced = await put(owner, audioUrl('audio/ogg'));
  assert.notEqual(replaced.body.data.ringtoneUrl, before);
  assert.equal((await request(h.app).get(before)).status, 404, 'the old file is deleted');

  const removed = await request(h.app).delete('/api/v1/account/ringtone').set(as(owner));
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.ringtoneUrl, '');
  assert.equal((await request(h.app).get(replaced.body.data.ringtoneUrl)).status, 404);
});

test('only short audio files are accepted', async () => {
  const notAudio = await put(owner, 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(notAudio.status, 400);
  assert.equal(notAudio.body.error.code, 'INVALID_AUDIO');

  const wrongType = await put(owner, audioUrl('audio/x-unknown'));
  assert.equal(wrongType.body.error.code, 'INVALID_AUDIO');

  // The test server's JSON limit is smaller than the real one's (8MB), so check the size rule itself.
  assert.throws(() => parseAudioDataUrl(audioUrl('audio/mpeg', MAX_AUDIO_BYTES + 1)), { code: 'AUDIO_TOO_LARGE' });
  assert.equal(parseAudioDataUrl(audioUrl('audio/mpeg', MAX_AUDIO_BYTES)).contentType, 'audio/mpeg');
  assert.equal(parseAudioDataUrl(audioUrl('audio/x-m4a')).contentType, 'audio/mp4');

  assert.equal((await put(owner, undefined)).status, 400);
  assert.equal((await request(h.app).put('/api/v1/account/ringtone').send({ audio: audioUrl() })).status, 401, 'login required');
});
