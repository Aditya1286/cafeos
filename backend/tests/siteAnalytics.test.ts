// The marketing site's first-party analytics: the public beacon stores page views and demo-quiz
// steps, and only the Super Admin can read the report built from them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, superAdminToken, Harness } from './helpers';
import { SiteEvent } from '../src/models/SiteEvent';
import { DemoRequest } from '../src/models/DemoRequest';
import { getReport, deviceFromUserAgent } from '../src/services/siteAnalytics.service';

let h: Harness;
let superAdmin: string;
let owner: string;

const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const send = (body: object, ua = PHONE_UA) =>
  request(h.app).post('/api/v1/public/site-events').set('User-Agent', ua).send(body);

before(async () => {
  h = await startHarness();
  superAdmin = await superAdminToken();
  owner = await tokenFor('owner@artisan.com');
});
after(async () => {
  await h.stop();
});

test('page views and demo steps are stored with the device; bots and junk are not', async () => {
  const base = { visitorId: 'visitor-aaaa1111', sessionId: 'session-aaaa1111' };
  assert.equal(
    (
      await send({
        ...base,
        type: 'pageview',
        path: '/?utm_source=x',
        referrer: 'www.Instagram.com',
        utmSource: 'Instagram'
      })
    ).status,
    204
  );
  assert.equal((await send({ ...base, type: 'pageview', path: '/request-demo' })).status, 204);
  assert.equal(
    (
      await send({
        ...base,
        type: 'demo_step',
        path: '/request-demo',
        step: 'businessType',
        stepIndex: 0
      })
    ).status,
    204
  );
  assert.equal(
    (
      await send({
        ...base,
        type: 'demo_answer',
        path: '/request-demo',
        step: 'businessType',
        stepIndex: 0,
        value: 'cafe'
      })
    ).status,
    204
  );
  assert.equal(
    (
      await send({
        ...base,
        type: 'demo_step',
        path: '/request-demo',
        step: 'tables',
        stepIndex: 1
      })
    ).status,
    204
  );

  const second = {
    visitorId: 'visitor-bbbb2222',
    sessionId: 'session-bbbb2222'
  };
  assert.equal((await send({ ...second, type: 'pageview', path: '/' }, DESKTOP_UA)).status, 204);
  assert.equal(
    (
      await send(
        {
          ...second,
          type: 'demo_step',
          path: '/request-demo',
          step: 'businessType',
          stepIndex: 0
        },
        DESKTOP_UA
      )
    ).status,
    204
  );
  assert.equal((await send({ ...second, type: 'demo_submit', path: '/request-demo' }, DESKTOP_UA)).status, 204);

  // A crawler gets the same 204 but nothing is stored.
  assert.equal(
    (await send({ ...second, type: 'pageview', path: '/' }, 'Googlebot/2.1 (+http://www.google.com/bot.html)')).status,
    204
  );

  assert.equal((await send({ ...base, type: 'click', path: '/' })).status, 400);
  assert.equal((await send({ ...base, visitorId: 'x', type: 'pageview', path: '/' })).status, 400);
  assert.equal((await send({ ...base, type: 'pageview', path: 'https://evil.example/' })).status, 400);
  assert.equal(
    (
      await send({
        ...base,
        type: 'demo_answer',
        path: '/request-demo',
        step: 'tables',
        stepIndex: 1,
        value: 'DROP TABLE'
      })
    ).status,
    400
  );

  assert.equal(await SiteEvent.countDocuments(), 8);
  const first = await SiteEvent.findOne({
    type: 'pageview',
    sessionId: 'session-aaaa1111'
  }).sort({ createdAt: 1 });
  assert.equal(first?.path, '/');
  assert.equal(first?.referrer, 'instagram.com');
  assert.equal(first?.utmSource, 'instagram');
  assert.equal(first?.device, 'mobile');
});

test('the report counts visitors, sources, the quiz funnel and conversion', async () => {
  await DemoRequest.create({
    name: 'Asha',
    brandName: 'Brew Lane',
    phone: '9000000099',
    city: 'Pune',
    consentToContact: true,
    answers: []
  });
  const report = await getReport('last_7_days');

  assert.equal(report.daily.length, 7);
  assert.equal(report.totals.pageviews, 3);
  assert.equal(report.totals.visitors, 2);
  assert.equal(report.totals.visits, 2);
  assert.equal(report.totals.demoStarts, 2);
  assert.equal(report.totals.demoRequests, 1);
  assert.equal(report.totals.conversionRate, 0.5);
  assert.equal(
    report.daily.reduce((n, d) => n + d.pageviews, 0),
    3
  );
  assert.equal(
    report.heatmap.reduce((n, c) => n + c.count, 0),
    3
  );

  assert.deepEqual(
    report.sources.sort((a, b) => a.source.localeCompare(b.source)),
    [
      // The lead made above has no source, so it is a Direct lead.
      { source: 'Direct', visits: 1, leads: 1 },
      { source: 'instagram', visits: 1, leads: 0 }
    ]
  );
  assert.equal(report.daily.reduce((n, d) => n + d.leads, 0), 1);
  // Nothing happened in the week before, so the comparison is all zeros, never NaN.
  assert.equal(report.previous.visitors, 0);
  assert.equal(report.previous.demoRequests, 0);
  assert.equal(report.previous.conversionRate, 0);
  assert.equal(report.totals.demoSubmitted, 1);
  assert.deepEqual(report.funnel, [
    { index: 0, step: 'businessType', sessions: 2 },
    { index: 1, step: 'tables', sessions: 1 }
  ]);
  assert.equal(report.funnelSubmitted, 1);
  assert.deepEqual(report.answers, [{ step: 'businessType', value: 'cafe', visits: 1 }]);
  assert.deepEqual(report.devices.map((d) => d.device).sort(), ['desktop', 'mobile']);

  await assert.rejects(() => getReport('last_5_days'));

  // Yesterday is a whole finished day, compared with the day before; today's visits are not in it.
  const yesterday = await getReport('yesterday');
  assert.equal(yesterday.range.preset, 'yesterday');
  assert.equal(yesterday.daily.length, 1);
  assert.equal(yesterday.totals.pageviews, 0);
  assert.equal(new Date(yesterday.range.to).getTime() - new Date(yesterday.range.from).getTime(), 24 * 3600_000);
});

test('only the Super Admin can read the report', async () => {
  assert.equal((await request(h.app).get('/api/v1/admin/site-analytics')).status, 401);
  assert.equal(
    (await request(h.app).get('/api/v1/admin/site-analytics').set('Authorization', `Bearer ${owner}`)).status,
    403
  );
  const res = await request(h.app)
    .get('/api/v1/admin/site-analytics?range=last_30_days')
    .set('Authorization', `Bearer ${superAdmin}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.range.days, 30);
  assert.equal(res.body.data.range.preset, 'last_30_days');
});

test('device detection', () => {
  assert.equal(deviceFromUserAgent(PHONE_UA), 'mobile');
  assert.equal(deviceFromUserAgent(DESKTOP_UA), 'desktop');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'tablet');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36'), 'tablet');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36'), 'mobile');
});
