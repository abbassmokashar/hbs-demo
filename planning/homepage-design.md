# Homepage Design Direction

## Concept: Swiss Momentum

The homepage combines Swiss editorial restraint with controlled movement. It should feel precise, international, and ambitious rather than corporate or youthful in a childish way. The rising ridge from the HBS identity becomes the recurring visual device: section transitions, image masks, progress indicators, and subtle motion all move upward.

## Typography

- **Roboto**: navigation, body copy, data, forms, and interface labels.
- **Instrument Sans**: headlines and selected interface moments. This keeps the design modern and premium without the strong serif personality of the first concept.
- Production fonts should be self-hosted in WordPress for performance and privacy.

## Color use

- Deep green `#002c27`: primary background and highest-contrast text.
- HBS green `#005e53`: primary interactive color.
- Teal `#439c9b`: motion accents, rules, and selected data.
- Warm cream `#f7e7ce`: soft backgrounds and premium highlights.
- Burgundy `#6e2233`: restrained accent for important deadlines or featured stories.
- Off-white `#f8f7f2`: main page ground.

Color is used in large, calm fields. Teal and burgundy remain accents rather than competing primary colors.

## Homepage sequence

### 1. Preloader

- HBS ridge draws upward while the letters appear.
- Runs once per browser session and exits within roughly one second.
- Skipped for reduced-motion users.

### 2. Hero

- Full-height editorial composition.
- Verified HBS statement: “Empowering tomorrow’s leaders for the global business landscape.”
- Supporting copy uses the existing themes of innovative education, practical skills development, and ethical leadership.
- Primary action: Explore programs.
- Secondary action: Request information.
- Approved interior classroom photography only.
- A vertical progress rail and slow image movement add energy without interfering with scrolling.

### 3. Educational principles

Three concise pillars from existing HBS content:

- Skill-based education
- Small class sizes
- Personalized support

The section behaves like an editorial index, with the active item revealing its supporting copy.

### 4. Program explorer

- Three tabs: Bachelor, Master, Dual Degrees.
- Large cards expose program type, degree title, study location, and detail link.
- Cards are fed from one structured Programs collection in WordPress.
- Institute of Technology appears as a clearly labeled external destination, not as an HBS-hosted program page.

### 5. Institute of Technology

- Introduces HIT and the technology bachelor’s and master’s subjects already linked from the current website.
- Uses the supplied HBS and HIT logos together as **HBS × HIT**.
- External program links are clearly labeled before visitors leave the HBS website.

### 6. HBS x ISM dual-degree feature

- Split-screen story moving from Switzerland to Germany.
- Uses the current verified message: two degrees, international exposure, Switzerland and Germany.
- The ridge line animates between the two locations as the section enters the viewport.

### 7. Intakes and deadlines

- Preserves the Fall, Winter, and Spring intake structure from the current homepage.
- Dates come from structured WordPress records so expired information disappears automatically.
- Until current dates are confirmed, the prototype shows that the calendar is being updated instead of publishing expired dates.

### 8. The HBS approach

- Editorial statement paired with interior campus photography.
- Focus on practical skills, ethical leadership, collaboration, and personal attention.
- No invented statistics or outcomes.

### 9. La Tour-de-Peilz campus

- States that HBS is currently based on the AUS campus in La Tour-de-Peilz.
- Uses only classroom, lounge, and reception interior photography.
- No building exterior, aerial campus, or old Vevey-location imagery.
- Detailed address and directions remain unpublished until HBS confirms them.

### 10. Learn from professionals

- Introduces a visible faculty grid using names and roles already present on the current website.
- Portraits are populated only after names, roles, and headshots are matched and approved.

### 11. Admissions journey

Four verified steps:

1. Submit the application and required documents
2. Admissions review and interview
3. Receive the offer letter and student agreement
4. Receive the certification of studies and begin the visa process where required

No dates are shown until the intake calendar is updated.

### 12. Insights & events

- Dynamic latest-content feed with filters for Insights and Events.
- The prototype uses verified current themes—Sustainable Business, Ethical Leadership, and Skill Building—without inventing article titles.

### 13. Final call to action

- Request program information
- Apply now
- Contact admissions

### 14. Global footer

- Shared sitewide; location shown only as La Tour-de-Peilz, Switzerland until the full address is confirmed.

## Motion language

- Reveal motion uses 12-24 pixel travel, opacity, and short staggered timing.
- Photography scales by no more than 3-5% during scroll.
- Ridge lines draw from left to right or rise vertically.
- Program cards use gentle depth and underline movement, not bouncing effects.
- No scroll hijacking, autoplay audio, novelty cursor, or excessive parallax.
- All motion respects `prefers-reduced-motion`.

## Responsive approach

### Desktop

- 12-column layout with generous whitespace and balanced editorial compositions.
- Mega-menu and horizontally arranged program explorer.

### Tablet

- 8-column layout.
- Hero and feature sections retain controlled asymmetry while text sizes reduce fluidly.
- Program cards become a swipe-safe horizontal rail or two-column grid.

### Mobile

- 4-column layout.
- Full-screen accessible menu.
- All key actions remain at least 44 pixels high.
- Cards stack vertically; tabs can scroll horizontally.
- Decorative motion is reduced, and image focal points are set per asset.

## Accessibility targets

- WCAG 2.2 AA color contrast.
- Keyboard-operable navigation, tabs, accordions, and forms.
- Visible focus styles.
- Semantic headings and landmarks.
- Descriptive image alternatives and empty alt text for decorative assets.
- No essential information communicated only through motion or color.
