/**
 * The daily question bank (spec §9.2, §9.4): one playful question per order, answered with one tap.
 * Each option carries the mascot's reply, the gesture it plays, and the welcome templates that use
 * the answer the next time the guest visits. {name} is the guest's first name and {usual} their
 * most-ordered dish; a template whose placeholders cannot be filled is skipped (copyTemplates.ts).
 *
 * Rules for everything in here (tests/copyBanks.test.ts checks most of them):
 *  - safe for every café and every guest: no health, diet-shaming, religion, politics or personal
 *    data, and nothing that asks for information we would then have to protect
 *  - no promise of time ("soon", minutes) and no claim the data cannot back up
 *  - every option has at least one welcome template that does not need {usual}
 *  - ids are unique across the whole bank (they are stored on a guest's profile, so never reuse or
 *    rename one; retire a question with `active: false` instead)
 *  - keep the tone warm, a little cheeky, and plain Indian English
 */

export type ReplyGesture = 'nod' | 'tilt' | 'wave' | 'pop' | 'wiggle' | 'tipHat' | 'lean';

export type GuestQuestion = {
  id: string;
  text: string;
  options: {
    id: string;
    label: string;
    emoji?: string;
    reply: string;
    replyGesture: ReplyGesture;
    welcomeTemplates: { id: string; text: string }[];
  }[];
  active: boolean;
};

export const GUEST_QUESTIONS: GuestQuestion[] = [
  {
    id: 'chai-mood',
    text: 'Chai mood today: kadak or meetha?',
    active: true,
    options: [
      {
        id: 'chai-mood-kadak',
        label: 'Kadak',
        emoji: '☕',
        reply: 'Kadak it is. Strong choice.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'chai-mood-kadak.1', text: 'Welcome back, {name}! Kadak {usual} again?' },
          { id: 'chai-mood-kadak.2', text: 'Welcome back, {name}! Still a kadak sort of person?' },
        ],
      },
      {
        id: 'chai-mood-meetha',
        label: 'Meetha',
        emoji: '🍯',
        reply: 'Meetha mood noted. Sweet and simple.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'chai-mood-meetha.1', text: 'Welcome back, {name}! Meetha {usual} again?' },
          { id: 'chai-mood-meetha.2', text: 'Welcome back, {name}! Still on the meetha side?' },
        ],
      },
    ],
  },
  {
    id: 'sleepiness',
    text: 'How sleepy are we today, from 1 to 5?',
    active: true,
    options: [
      {
        id: 'sleepiness-1',
        label: '1: Wide awake',
        emoji: '😎',
        reply: 'Wide awake! Save a little of that energy for the rest of us.',
        replyGesture: 'wave',
        welcomeTemplates: [
          { id: 'sleepiness-1.1', text: 'Welcome back, {name}! Wide awake and ready for {usual}?' },
          { id: 'sleepiness-1.2', text: 'Welcome back, {name}! Still the bright-eyed one?' },
        ],
      },
      {
        id: 'sleepiness-2',
        label: '2: Nicely alert',
        emoji: '🙂',
        reply: 'Nicely alert. A good place to be.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'sleepiness-2.1', text: 'Welcome back, {name}! Feeling alert, or in need of {usual}?' },
          { id: 'sleepiness-2.2', text: 'Welcome back, {name}! Nice to see you looking so alert.' },
        ],
      },
      {
        id: 'sleepiness-3',
        label: '3: Half and half',
        emoji: '😐',
        reply: 'Right in the middle. A good chai can tip it either way.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'sleepiness-3.1', text: 'Welcome back, {name}! Let {usual} tip the scale?' },
          { id: 'sleepiness-3.2', text: 'Welcome back, {name}! Half awake today, or fully?' },
        ],
      },
      {
        id: 'sleepiness-4',
        label: '4: Quite sleepy',
        emoji: '🥱',
        reply: 'Sleepy, I see. We have just the thing.',
        replyGesture: 'lean',
        welcomeTemplates: [
          { id: 'sleepiness-4.1', text: 'Welcome back, {name}! A {usual} to wake you up?' },
          { id: 'sleepiness-4.2', text: 'Welcome back, {name}! Hoping for something to wake you up?' },
        ],
      },
      {
        id: 'sleepiness-5',
        label: '5: Barely awake',
        emoji: '😴',
        reply: 'Barely awake? Same, yaar. Something warm might help.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'sleepiness-5.1', text: 'Welcome back, {name}! Eyes open yet? Maybe {usual} will help.' },
          { id: 'sleepiness-5.2', text: 'Welcome back, {name}! Let us wake you up properly this time.' },
        ],
      },
    ],
  },
  {
    id: 'weather-person',
    text: 'Rain person or sunshine person?',
    active: true,
    options: [
      {
        id: 'weather-person-rain',
        label: 'Rain',
        emoji: '🌧️',
        reply: 'Rain people understand chai best.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'weather-person-rain.1', text: 'Welcome back, {name}! Our rain lover returns. {usual} again?' },
          { id: 'weather-person-rain.2', text: 'Welcome back, {name}! Rain or shine, we are glad you came.' },
        ],
      },
      {
        id: 'weather-person-sun',
        label: 'Sunshine',
        emoji: '☀️',
        reply: 'Sunshine it is. Bright company!',
        replyGesture: 'wave',
        welcomeTemplates: [
          { id: 'weather-person-sun.1', text: 'Welcome back, {name}! Sunshine and {usual}, a happy match.' },
          { id: 'weather-person-sun.2', text: 'Welcome back, {name}! You bring the sunshine with you.' },
        ],
      },
      {
        id: 'weather-person-both',
        label: 'A bit of both',
        emoji: '🌈',
        reply: 'A bit of both. Flexible and fun.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'weather-person-both.1', text: 'Welcome back, {name}! Rain or shine, {usual}?' },
          { id: 'weather-person-both.2', text: 'Welcome back, {name}! Good company in any weather.' },
        ],
      },
    ],
  },
  {
    id: 'sweet-or-spicy',
    text: 'Sweet tooth or spice lover?',
    active: true,
    options: [
      {
        id: 'sweet-or-spicy-sweet',
        label: 'Sweet tooth',
        emoji: '🍰',
        reply: 'Sweet tooth, noted. Excellent taste.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'sweet-or-spicy-sweet.1', text: 'Welcome back, {name}! Something sweet today, or the usual {usual}?' },
          { id: 'sweet-or-spicy-sweet.2', text: 'Welcome back, {name}! Our sweet tooth is back.' },
        ],
      },
      {
        id: 'sweet-or-spicy-spicy',
        label: 'Spice lover',
        emoji: '🌶️',
        reply: 'Spice lover! Bold choice.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'sweet-or-spicy-spicy.1', text: 'Welcome back, {name}! Feeling spicy? {usual} again?' },
          { id: 'sweet-or-spicy-spicy.2', text: 'Welcome back, {name}! The spice lover returns.' },
        ],
      },
      {
        id: 'sweet-or-spicy-both',
        label: 'Bit of both',
        emoji: '😋',
        reply: 'A bit of both. The best of both worlds.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'sweet-or-spicy-both.1', text: 'Welcome back, {name}! Sweet, spicy or the usual {usual}?' },
          { id: 'sweet-or-spicy-both.2', text: 'Welcome back, {name}! Sweet or spicy today?' },
        ],
      },
    ],
  },
  {
    id: 'morning-or-night',
    text: 'Morning person or night owl?',
    active: true,
    options: [
      {
        id: 'morning-or-night-morning',
        label: 'Morning person',
        emoji: '🌅',
        reply: 'Early bird! Respect.',
        replyGesture: 'tipHat',
        welcomeTemplates: [
          { id: 'morning-or-night-morning.1', text: 'Welcome back, {name}! The early bird gets the {usual}.' },
          { id: 'morning-or-night-morning.2', text: 'Welcome back, {name}! Our early bird is here.' },
        ],
      },
      {
        id: 'morning-or-night-night',
        label: 'Night owl',
        emoji: '🦉',
        reply: 'Night owl! Welcome to the club.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'morning-or-night-night.1', text: 'Welcome back, {name}! Night owl reporting in. {usual}?' },
          { id: 'morning-or-night-night.2', text: 'Welcome back, {name}! The night owl flies in.' },
        ],
      },
      {
        id: 'morning-or-night-chai',
        label: 'Only after chai',
        emoji: '🍵',
        reply: 'Honest answer. Chai first, personality later.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'morning-or-night-chai.1', text: 'Welcome back, {name}! Chai first, personality later. {usual}?' },
          { id: 'morning-or-night-chai.2', text: 'Welcome back, {name}! Ready for the chai first, personality later routine?' },
        ],
      },
    ],
  },
  {
    id: 'first-visit-reason',
    text: 'What first brought you to us?',
    active: true,
    options: [
      {
        id: 'first-visit-reason-coffee',
        label: 'The coffee',
        emoji: '☕',
        reply: 'A coffee person. Welcome to the club.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'first-visit-reason-coffee.1', text: 'Welcome back, {name}! Here for the coffee again? {usual}?' },
          { id: 'first-visit-reason-coffee.2', text: 'Welcome back, {name}! The coffee lover returns.' },
        ],
      },
      {
        id: 'first-visit-reason-chai',
        label: 'The chai',
        emoji: '🍵',
        reply: 'A chai person at heart. Good to have you.',
        replyGesture: 'tipHat',
        welcomeTemplates: [
          { id: 'first-visit-reason-chai.1', text: 'Welcome back, {name}! Here for the chai again? {usual}?' },
          { id: 'first-visit-reason-chai.2', text: 'Welcome back, {name}! The chai lover returns.' },
        ],
      },
      {
        id: 'first-visit-reason-snacks',
        label: 'The snacks',
        emoji: '🍪',
        reply: 'Snacks first. Smart planning.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'first-visit-reason-snacks.1', text: 'Welcome back, {name}! Snacks and {usual} again?' },
          { id: 'first-visit-reason-snacks.2', text: 'Welcome back, {name}! Our snack explorer is back.' },
        ],
      },
      {
        id: 'first-visit-reason-friend',
        label: "A friend's tip",
        emoji: '💬',
        reply: 'Do thank your friend for us!',
        replyGesture: 'wave',
        welcomeTemplates: [
          { id: 'first-visit-reason-friend.1', text: 'Welcome back, {name}! Glad your friend sent you our way.' },
          { id: 'first-visit-reason-friend.2', text: 'Welcome back, {name}! Telling your friends about us yet? {usual}?' },
        ],
      },
      {
        id: 'first-visit-reason-walkin',
        label: 'Just walked in',
        emoji: '🚶',
        reply: 'A lucky walk-in. We are glad you did.',
        replyGesture: 'lean',
        welcomeTemplates: [
          { id: 'first-visit-reason-walkin.1', text: 'Welcome back, {name}! Glad you walked in that first time.' },
          { id: 'first-visit-reason-walkin.2', text: 'Welcome back, {name}! Walking in is becoming a habit. {usual}?' },
        ],
      },
    ],
  },
  {
    id: 'seat-spot',
    text: 'Window seat or cosy corner?',
    active: true,
    options: [
      {
        id: 'seat-spot-window',
        label: 'Window seat',
        emoji: '🪟',
        reply: 'Window seat for people-watching. Classic.',
        replyGesture: 'lean',
        welcomeTemplates: [
          { id: 'seat-spot-window.1', text: 'Welcome back, {name}! Still a window-gazer? {usual}?' },
          { id: 'seat-spot-window.2', text: 'Welcome back, {name}! Our window-gazer returns.' },
        ],
      },
      {
        id: 'seat-spot-corner',
        label: 'Cosy corner',
        emoji: '🛋️',
        reply: 'A cosy corner. A person of taste.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'seat-spot-corner.1', text: 'Welcome back, {name}! Cosy corner and {usual}, the dream.' },
          { id: 'seat-spot-corner.2', text: 'Welcome back, {name}! Still a cosy-corner sort of person?' },
        ],
      },
      {
        id: 'seat-spot-plug',
        label: 'Wherever there is a plug',
        emoji: '🔌',
        reply: 'Fair enough. Power first, snacks second.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'seat-spot-plug.1', text: 'Welcome back, {name}! Fully charged and ready for {usual}?' },
          { id: 'seat-spot-plug.2', text: 'Welcome back, {name}! Hunting for the best spot again?' },
        ],
      },
    ],
  },
  {
    id: 'company-mood',
    text: 'Quiet corner with a book, or a table full of friends?',
    active: true,
    options: [
      {
        id: 'company-mood-quiet',
        label: 'Quiet with a book',
        emoji: '📖',
        reply: 'A quiet corner is a fine thing.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'company-mood-quiet.1', text: 'Welcome back, {name}! Some quiet time with {usual} today?' },
          { id: 'company-mood-quiet.2', text: 'Welcome back, {name}! Bringing a good book today?' },
        ],
      },
      {
        id: 'company-mood-friends',
        label: 'Table full of friends',
        emoji: '👫',
        reply: 'The more the merrier. We love a lively table.',
        replyGesture: 'wave',
        welcomeTemplates: [
          { id: 'company-mood-friends.1', text: 'Welcome back, {name}! Bringing friends, or {usual} just for you?' },
          { id: 'company-mood-friends.2', text: 'Welcome back, {name}! Is the gang joining you today?' },
        ],
      },
      {
        id: 'company-mood-both',
        label: 'Depends on my mood',
        emoji: '✨',
        reply: 'Mood decides. Sensible.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'company-mood-both.1', text: 'Welcome back, {name}! Quiet mood or company mood today? {usual}?' },
          { id: 'company-mood-both.2', text: 'Welcome back, {name}! Which mood are we in today?' },
        ],
      },
    ],
  },
  {
    id: 'cafe-music',
    text: 'Café playlist: soft lo-fi or old Hindi film songs?',
    active: true,
    options: [
      {
        id: 'cafe-music-lofi',
        label: 'Soft lo-fi',
        emoji: '🎧',
        reply: 'Lo-fi it is. Chill vibes noted.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'cafe-music-lofi.1', text: 'Welcome back, {name}! Lo-fi mood with {usual}?' },
          { id: 'cafe-music-lofi.2', text: 'Welcome back, {name}! Settling in for some calm?' },
        ],
      },
      {
        id: 'cafe-music-old',
        label: 'Old Hindi songs',
        emoji: '🎶',
        reply: 'Old Hindi songs! Pure nostalgia.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'cafe-music-old.1', text: 'Welcome back, {name}! Humming an old song with {usual}?' },
          { id: 'cafe-music-old.2', text: 'Welcome back, {name}! Ready for a little nostalgia?' },
        ],
      },
      {
        id: 'cafe-music-surprise',
        label: 'Surprise me',
        emoji: '🎲',
        reply: 'Surprise it is. We like a bit of mystery.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'cafe-music-surprise.1', text: 'Welcome back, {name}! Feeling adventurous, or the usual {usual}?' },
          { id: 'cafe-music-surprise.2', text: 'Welcome back, {name}! Up for a little surprise today?' },
        ],
      },
    ],
  },
  {
    id: 'chai-or-coffee',
    text: 'Team chai or team coffee?',
    active: true,
    options: [
      {
        id: 'chai-or-coffee-chai',
        label: 'Team chai',
        emoji: '🍵',
        reply: 'Team chai! Proper choice, if you ask us.',
        replyGesture: 'tipHat',
        welcomeTemplates: [
          { id: 'chai-or-coffee-chai.1', text: 'Welcome back, {name}! Your usual {usual}, or switching teams?' },
          { id: 'chai-or-coffee-chai.2', text: 'Welcome back, {name}! Team chai checking in.' },
        ],
      },
      {
        id: 'chai-or-coffee-coffee',
        label: 'Team coffee',
        emoji: '☕',
        reply: 'Team coffee. Strong and steady.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'chai-or-coffee-coffee.1', text: 'Welcome back, {name}! Your usual {usual}, or switching teams?' },
          { id: 'chai-or-coffee-coffee.2', text: 'Welcome back, {name}! Team coffee checking in.' },
        ],
      },
      {
        id: 'chai-or-coffee-both',
        label: 'Both, no fights',
        emoji: '🤝',
        reply: 'Both teams? A true diplomat.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'chai-or-coffee-both.1', text: 'Welcome back, {name}! Chai, coffee or the usual {usual}?' },
          { id: 'chai-or-coffee-both.2', text: 'Welcome back, {name}! Our diplomat returns. Chai or coffee today?' },
        ],
      },
    ],
  },
  {
    id: 'snack-style',
    text: 'Bun maska or something crunchy?',
    active: true,
    options: [
      {
        id: 'snack-style-bun',
        label: 'Bun maska',
        emoji: '🍞',
        reply: 'Bun maska! A classic never fails.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'snack-style-bun.1', text: 'Welcome back, {name}! Bun maska mood, with {usual}?' },
          { id: 'snack-style-bun.2', text: 'Welcome back, {name}! Bun maska mood again?' },
        ],
      },
      {
        id: 'snack-style-crunchy',
        label: 'Something crunchy',
        emoji: '🥨',
        reply: 'Crunchy gang! Crispy choices only.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'snack-style-crunchy.1', text: 'Welcome back, {name}! Something crunchy with {usual}?' },
          { id: 'snack-style-crunchy.2', text: 'Welcome back, {name}! Feeling crunchy today?' },
        ],
      },
      {
        id: 'snack-style-drink',
        label: 'Just the drink',
        emoji: '🥤',
        reply: 'Just the drink. Pure and simple.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'snack-style-drink.1', text: 'Welcome back, {name}! Keeping it simple with {usual}?' },
          { id: 'snack-style-drink.2', text: 'Welcome back, {name}! Keeping it simple today?' },
        ],
      },
    ],
  },
  {
    id: 'biscuit-dunk',
    text: 'Biscuit in the chai: dunk it or never?',
    active: true,
    options: [
      {
        id: 'biscuit-dunk-dunk',
        label: 'Dunk it',
        emoji: '🍪',
        reply: 'A dunker! Just catch it before it falls.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'biscuit-dunk-dunk.1', text: 'Welcome back, {name}! Dunking something with {usual} today?' },
          { id: 'biscuit-dunk-dunk.2', text: 'Welcome back, {name}! Our proud dunker returns.' },
        ],
      },
      {
        id: 'biscuit-dunk-never',
        label: 'Never!',
        emoji: '🙅',
        reply: 'Never? Respect the discipline.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'biscuit-dunk-never.1', text: 'Welcome back, {name}! No dunking, only sipping {usual}?' },
          { id: 'biscuit-dunk-never.2', text: 'Welcome back, {name}! Our no-dunking purist returns.' },
        ],
      },
      {
        id: 'biscuit-dunk-secret',
        label: 'Only when no one is looking',
        emoji: '🤫',
        reply: 'Your secret is safe with us.',
        replyGesture: 'tipHat',
        welcomeTemplates: [
          { id: 'biscuit-dunk-secret.1', text: 'Welcome back, {name}! Nobody is looking. {usual}?' },
          { id: 'biscuit-dunk-secret.2', text: 'Welcome back, {name}! Our secret dunker returns.' },
        ],
      },
    ],
  },
  {
    id: 'hot-or-cold',
    text: 'Hot cup or cold glass today?',
    active: true,
    options: [
      {
        id: 'hot-or-cold-hot',
        label: 'Hot cup',
        emoji: '🔥',
        reply: 'Hot cup it is. Warm hands, happy heart.',
        replyGesture: 'lean',
        welcomeTemplates: [
          { id: 'hot-or-cold-hot.1', text: 'Welcome back, {name}! Something hot like {usual} today?' },
          { id: 'hot-or-cold-hot.2', text: 'Welcome back, {name}! Warm cup weather today?' },
        ],
      },
      {
        id: 'hot-or-cold-cold',
        label: 'Cold glass',
        emoji: '🧊',
        reply: 'Cold glass, noted. Cool and collected.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'hot-or-cold-cold.1', text: 'Welcome back, {name}! Feeling cool today, or the usual {usual}?' },
          { id: 'hot-or-cold-cold.2', text: 'Welcome back, {name}! Something cool today?' },
        ],
      },
      {
        id: 'hot-or-cold-mood',
        label: 'Depends on my mood',
        emoji: '🎭',
        reply: 'Mood decides. A sensible way to live.',
        replyGesture: 'wiggle',
        welcomeTemplates: [
          { id: 'hot-or-cold-mood.1', text: 'Welcome back, {name}! Hot, cold or the usual {usual}?' },
          { id: 'hot-or-cold-mood.2', text: 'Welcome back, {name}! Which mood is it today, hot or cold?' },
        ],
      },
    ],
  },
  {
    id: 'camera-first',
    text: 'Food first or camera first?',
    active: true,
    options: [
      {
        id: 'camera-first-camera',
        label: 'Camera eats first',
        emoji: '📸',
        reply: 'Camera first! Every plate deserves its moment.',
        replyGesture: 'pop',
        welcomeTemplates: [
          { id: 'camera-first-camera.1', text: 'Welcome back, {name}! Camera ready for {usual}?' },
          { id: 'camera-first-camera.2', text: 'Welcome back, {name}! Our photographer returns.' },
        ],
      },
      {
        id: 'camera-first-plate',
        label: 'Straight to eating',
        emoji: '🍽️',
        reply: 'Straight to eating. No notes.',
        replyGesture: 'nod',
        welcomeTemplates: [
          { id: 'camera-first-plate.1', text: 'Welcome back, {name}! Straight to the {usual}?' },
          { id: 'camera-first-plate.2', text: 'Welcome back, {name}! No photos, just good food?' },
        ],
      },
      {
        id: 'camera-first-one',
        label: 'One photo, then dig in',
        emoji: '🤳',
        reply: 'One photo and dig in. Balanced.',
        replyGesture: 'tilt',
        welcomeTemplates: [
          { id: 'camera-first-one.1', text: 'Welcome back, {name}! One photo of the {usual}, then dig in?' },
          { id: 'camera-first-one.2', text: 'Welcome back, {name}! One photo, then dig in, right?' },
        ],
      },
    ],
  },
];
