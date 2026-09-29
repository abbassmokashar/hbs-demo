// Site-wide configuration and shared asset registry.

export const SITE = {
  name: 'Helvetic Business School',
  short: 'HBS',
  tagline: 'Empowering tomorrow’s leaders for the global business landscape.',
  email: 'info@hbs.swiss',
  phoneDisplay: '+41 21 921 22 27',
  phoneHref: '+41219212227',
  address: {
    street: 'Chemin du Levant 5',
    city: '1814 La Tour-de-Peilz',
    country: 'Switzerland',
  },
  url: 'https://abbassmokashar.github.io/hbs-demo',
  mapUrl: 'https://www.openstreetmap.org/?mlat=46.4551&mlon=6.8590#map=16/46.4551/6.8590',
  mapEmbed: 'https://www.openstreetmap.org/export/embed.html?bbox=6.8420%2C46.4480%2C6.8760%2C46.4620&layer=mapnik&marker=46.4551%2C6.8590',
  applyUrl: 'https://share-eu1.hsforms.com/1jDtQ3dchTP2Ih-IorttGXgfzpn4',
  requestUrl: 'https://share-eu1.hsforms.com/1YmAiFGlMTHa3WBtd7ywNNwfzpn4',
  bookUrl: 'https://meetings-eu1.hubspot.com/hakim-elomrani?uuid=0024867e-24f5-40dd-a275-bfedd73a4960',
};

// Brand and gallery artwork is served as WebP for a compact WordPress-ready build.
export const LOGO = {
  hbs: 'assets/images/brand/hbs-ink.webp',
  hbsWhite: 'assets/images/brand/hbs-white.webp',
  favicon: 'assets/images/brand/hbs-favicon.webp',
  hit: 'assets/hit.webp',
};

// Gallery dimensions keep width/height attributes accurate for every image,
// which protects Cumulative Layout Shift on slow connections.
export const DIM = {
  'g01': [2000, 1333], 'g02': [2000, 1333], 'g03': [700, 365], 'g04': [1200, 627],
  'g05': [800, 1200], 'g06': [1200, 627], 'g07': [1200, 627], 'g08': [1200, 627],
  'g09': [1200, 627], 'g10': [700, 467], 'g11': [700, 365], 'g12': [700, 365],
  'g13': [700, 1050], 'g14': [700, 1050], 'g15': [700, 1048], 'g16': [700, 1050],
  'g17': [1916, 2000], 'g18': [1200, 627], 'g19': [1200, 627], 'g20': [1200, 627],
  'g21': [1200, 627], 'g22': [1200, 627], 'g23': [1200, 627], 'g24': [1609, 1207],
  'g25': [1920, 1282], 'g26': [1920, 1280], 'g27': [2000, 1333], 'g28': [1680, 1120],
  'g29': [1599, 1199], 'g30': [2000, 1333], 'g31': [240, 128], 'g32': [2000, 1335],
  'g33': [162, 207], 'g34': [1680, 945], 'g35': [1680, 945], 'g36': [1680, 945],
  'g37': [1680, 945], 'g38': [1680, 945], 'g39': [1680, 1260], 'g40': [1680, 1184],
  'g41': [1680, 1184], 'g42': [1680, 1184], 'g43': [1680, 1185], 'g44': [1680, 1185],
  'g45': [1680, 1185], 'g46': [1680, 1184], 'g47': [1680, 1184], 'g48': [2000, 1333],
  'g49': [2000, 1333], 'g50': [2000, 1333], 'g51': [2000, 1335], 'g52': [1680, 1121],
  'g53': [1680, 1120], 'g54': [2560, 1707], 'g55': [2560, 1707], 'g56': [1334, 2000],
  'g57': [1333, 2000], 'g58': [1335, 2000], 'g59': [2400, 3600], 'g60': [1333, 2000],
  'g61': [1334, 2000], 'g62': [1333, 2000], 'g63': [1200, 675], 'g64': [1200, 675],
  'g65': [1350, 675], 'g66': [1200, 675], 'g67': [1200, 675], 'g68': [1000, 562],
};

export const gallery = (id) => `assets/images/gallery/${id}.webp`;

export const dimsOf = (src) => {
  if (src.endsWith('acbsp-member.webp')) return [1080, 1350];
  const match = /g(\d\d)/.exec(src);
  return match && DIM[`g${match[1]}`] ? DIM[`g${match[1]}`] : [1600, 1067];
};

export const HERO = {
  home: gallery('g01'),
  programs: gallery('g25'),
  bba: gallery('g27'),
  mba: gallery('g30'),
  dual: gallery('g48'),
  dualBba: gallery('g49'),
  dualMaster: gallery('g50'),
  executive: gallery('g51'),
  certificate: gallery('g02'),
  admissions: gallery('g32'),
  requirements: gallery('g26'),
  tuition: gallery('g51'),
  visa: gallery('g24'),
  about: gallery('g02'),
  ism: gallery('g47'),
  switzerland: gallery('g54'),
  faculty: gallery('g52'),
  partnerships: gallery('g53'),
  accreditations: gallery('g39'),
  policies: gallery('g40'),
  faq: gallery('g41'),
  studentLife: gallery('g55'),
  insights: gallery('g42'),
  contact: gallery('g43'),
  search: gallery('g44'),
  notFound: gallery('g45'),
};

export const LOGOS = {
  acbsp: 'assets/images/brand/acbsp-member.webp',
  ubi: 'assets/images/brand/ubi.webp',
  ves: 'assets/images/brand/ves.webp',
  aus: 'assets/images/brand/aus.webp',
  ism: 'assets/images/brand/ism.webp',
  aacsb: 'assets/images/brand/aacsb.webp',
  fibaa: 'assets/images/brand/fibaa.webp',
  wr: 'assets/images/brand/wr.webp',
  athea: 'assets/images/brand/athea.webp',
};

export const FACULTY_IMG = (file) => `assets/images/faculty/${file}`;
