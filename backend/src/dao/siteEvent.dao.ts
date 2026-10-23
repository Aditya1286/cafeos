import { SiteEvent, ISiteEvent } from '../models/SiteEvent';

// Pure data-access layer for SiteEvent — validation and report shaping live in
// ../services/siteAnalytics.service.ts.

export type CreateSiteEventInput = Omit<ISiteEvent, keyof import('mongoose').Document | 'createdAt'>;

export const createSiteEvent = (input: CreateSiteEventInput): Promise<ISiteEvent> => SiteEvent.create(input);

const TZ = 'Asia/Kolkata';

export interface SiteReportRaw {
  totals: Array<{ pageviews: number; visitors: number; sessions: number }>;
  daily: Array<{ _id: string; pageviews: number; visitors: number }>;
  heatmap: Array<{ _id: { day: number; hour: number }; count: number }>;
  sources: Array<{ _id: string; sessions: number }>;
  devices: Array<{ _id: string; sessions: number }>;
  pages: Array<{ _id: string; pageviews: number; visitors: number }>;
  funnel: Array<{ _id: { index: number; step: string }; sessions: number }>;
  submits: Array<{ sessions: number }>;
  answers: Array<{ _id: { step: string; value: string }; sessions: number }>;
}

/** Every number the Website report shows, for events created in [from, to), in one round trip. */
export const siteReport = async (from: Date, to: Date): Promise<SiteReportRaw> => {
  const [raw] = await SiteEvent.aggregate<SiteReportRaw>([
    { $match: { createdAt: { $gte: from, $lt: to } } },
    {
      $facet: {
        totals: [
          { $match: { type: 'pageview' } },
          {
            $group: {
              _id: null,
              pageviews: { $sum: 1 },
              visitors: { $addToSet: '$visitorId' },
              sessions: { $addToSet: '$sessionId' }
            }
          },
          {
            $project: {
              _id: 0,
              pageviews: 1,
              visitors: { $size: '$visitors' },
              sessions: { $size: '$sessions' }
            }
          }
        ],
        daily: [
          { $match: { type: 'pageview' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
              pageviews: { $sum: 1 },
              visitors: { $addToSet: '$visitorId' }
            }
          },
          { $project: { pageviews: 1, visitors: { $size: '$visitors' } } },
          { $sort: { _id: 1 } }
        ],
        heatmap: [
          { $match: { type: 'pageview' } },
          {
            $group: {
              _id: {
                day: { $isoDayOfWeek: { date: '$createdAt', timezone: TZ } },
                hour: { $hour: { date: '$createdAt', timezone: TZ } }
              },
              count: { $sum: 1 }
            }
          }
        ],
        // A visit's source and device are those of its first page view.
        sources: [
          { $match: { type: 'pageview' } },
          { $sort: { createdAt: 1 } },
          {
            $group: {
              _id: '$sessionId',
              source: { $first: { $ifNull: ['$utmSource', { $ifNull: ['$referrer', 'Direct'] }] } }
            }
          },
          { $group: { _id: '$source', sessions: { $sum: 1 } } },
          { $sort: { sessions: -1 } },
          { $limit: 10 }
        ],
        devices: [
          { $match: { type: 'pageview' } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: '$sessionId', device: { $first: '$device' } } },
          { $group: { _id: '$device', sessions: { $sum: 1 } } },
          { $sort: { sessions: -1 } }
        ],
        pages: [
          { $match: { type: 'pageview' } },
          {
            $group: { _id: '$path', pageviews: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } }
          },
          { $project: { pageviews: 1, visitors: { $size: '$visitors' } } },
          { $sort: { pageviews: -1 } },
          { $limit: 10 }
        ],
        funnel: [
          { $match: { type: 'demo_step' } },
          { $group: { _id: { index: '$stepIndex', step: '$step', session: '$sessionId' } } },
          { $group: { _id: { index: '$_id.index', step: '$_id.step' }, sessions: { $sum: 1 } } },
          { $sort: { '_id.index': 1 } }
        ],
        submits: [{ $match: { type: 'demo_submit' } }, { $group: { _id: '$sessionId' } }, { $count: 'sessions' }],
        // Latest answer per visit and question, so going back and changing it counts once.
        answers: [
          { $match: { type: 'demo_answer' } },
          { $sort: { createdAt: 1 } },
          { $group: { _id: { session: '$sessionId', step: '$step' }, value: { $last: '$value' } } },
          { $group: { _id: { step: '$_id.step', value: '$value' }, sessions: { $sum: 1 } } },
          { $sort: { sessions: -1 } }
        ]
      }
    }
  ]);
  return raw;
};
