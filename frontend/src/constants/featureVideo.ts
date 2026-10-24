export interface VideoChapter {
  /** Second in the video where this chapter starts. */
  start: number;
  title: string;
  body: string;
  tags?: string[];
}

// The landing page's features video ("The Second Coffee", 16:9). Its source lives in
// ~/startup/video-studio/projects/the-second-coffee-16x9; if it is re-cut, take the new chapter
// start times from that project's scene and voice timings.
export const FEATURE_VIDEO = {
  // Served from the R2 bucket (marketing/platform/ in storage.s3). Upload a re-cut under a new
  // name (-v2) rather than overwriting: it is cached for a year.
  src: 'https://pub-b6b77a2e40344b2ea8e9cc93c4e2ebab.r2.dev/marketing/platform/caos-second-coffee-v1.mp4',
  poster: '/videos/caos-second-coffee-poster.jpg',
  duration: 45.7,
  label: 'A 45-second video: one table ordering the old way, then with Caos.',
};

export const FEATURE_VIDEO_CHAPTERS: VideoChapter[] = [
  {
    start: 0,
    title: 'A waiter is standing over them',
    body: 'Guests feel watched, so they pick fast and pick safe. Nobody asks if they wanted the brownie.',
  },
  {
    start: 8.39,
    title: 'Your staff has no time to sell',
    body: 'On a busy floor nobody mentions the hazelnut shot, and the second coffee they almost ordered never gets asked for.',
  },
  {
    start: 16.74,
    title: 'The sales nobody sees',
    body: 'None of it shows up in your numbers. It is the order that simply never happened.',
  },
  {
    start: 20.31,
    title: 'Give them the menu, and time',
    body: 'Guests scan the QR on their table and your menu opens on their phone. No app to install, nobody waiting on them.',
    tags: ['Table QR menu', 'No app for guests'],
  },
  {
    start: 25.13,
    title: 'The food sells itself',
    body: 'Photos and a popular badge sit right next to each price, so guests see what everyone loves and add it themselves.',
    tags: ['Item photos', 'Popular picks'],
  },
  {
    start: 31.47,
    title: 'The second coffee, one tap away',
    body: 'Same customer, same table. Adding to the order is one tap while they wait, and it goes straight to your kitchen.',
    tags: ['Add to order', 'Live kitchen screen'],
  },
  {
    start: 40.4,
    title: 'Free setup, 2 weeks free',
    body: 'We set up your menu and QR codes with you, and real people are there when you need help.',
    tags: ['2-week free trial', 'Free setup'],
  },
];
