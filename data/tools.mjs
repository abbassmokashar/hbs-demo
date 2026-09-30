import { HERO } from './site.mjs';

const toolLinks = (exclude) => ({
  type: 'cards',
  tone: 'section--mist',
  eyebrow: 'Continue your journey',
  title: 'Three tools. One clearer decision.',
  cols: 3,
  items: [
    ['Discover', 'Pathway Compass', 'Turn your goals and study preferences into a shortlist made for you.', 'tools/pathway-compass/', 'Find my pathway'],
    ['Compare', 'Program Lens', 'See the essential differences between up to three HBS programs.', 'tools/program-lens/', 'Compare programs'],
    ['Plan', 'Plan Your Investment', 'Build an indicative study budget across tuition and living costs.', 'tools/plan-your-investment/', 'Plan my investment'],
  ].filter((item) => !item[3].includes(exclude)),
});

export const TOOL_PAGES = [
  {
    route: 'tools/pathway-compass',
    group: 'Study planning',
    title: 'Find direction with the <em>Pathway Compass.</em>',
    intro: 'A guided route through your goals, experience and preferred study journey—ending in a personal HBS shortlist.',
    seoTitle: 'Pathway Compass — Find your HBS program',
    seoDescription: 'Answer a few questions and discover which HBS bachelor, MBA, dual-degree or executive pathway fits your ambitions.',
    heroImage: HERO.programs,
    breadcrumb: [['Study tools', null], ['Pathway Compass', null]],
    meta: ['About 2 minutes', 'Personal shortlist', 'No registration'],
    blocks: [
      { type: 'journeyTool', tool: 'pathway' },
      toolLinks('pathway-compass'),
    ],
  },
  {
    route: 'tools/program-lens',
    group: 'Study planning',
    title: 'See every difference through the <em>Program Lens.</em>',
    intro: 'Build a focused, side-by-side view of the HBS programs you are considering—without opening a dozen tabs.',
    seoTitle: 'Program Lens — Compare HBS programs',
    seoDescription: 'Compare up to three HBS programs by qualification, duration, format, credits, location, tuition and career direction.',
    heroImage: HERO.dual,
    breadcrumb: [['Study tools', null], ['Program Lens', null]],
    meta: ['Up to 3 programs', 'Side-by-side facts', 'Save your shortlist'],
    blocks: [
      { type: 'journeyTool', tool: 'compare' },
      toolLinks('program-lens'),
    ],
  },
  {
    route: 'tools/plan-your-investment',
    group: 'Study planning',
    title: 'Plan your education as an <em>investment.</em>',
    intro: 'Create a realistic, adjustable budget for tuition and life in Switzerland, then discuss the estimate with HBS admissions.',
    seoTitle: 'Plan Your Investment — HBS study cost planner',
    seoDescription: 'Create a personalised estimate for HBS tuition, accommodation, living costs and one-time study expenses.',
    heroImage: HERO.tuition,
    breadcrumb: [['Study tools', null], ['Plan Your Investment', null]],
    meta: ['Personal estimate', 'Adjustable scenarios', 'Admissions follow-up'],
    blocks: [
      { type: 'journeyTool', tool: 'investment' },
      toolLinks('plan-your-investment'),
    ],
  },
];
