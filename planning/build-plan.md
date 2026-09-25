# WordPress Build Plan

## Recommended architecture

Build a native custom WordPress block theme plus a small companion plugin:

- **`hbs-theme`**: presentation, templates, patterns, typography, colors, responsive layout, and front-end motion.
- **`hbs-core`**: Programs, Faculty, Partnerships, FAQs, Events, Intakes, and reusable structured fields. Keeping content structures in a plugin prevents content loss if the visual theme changes later.

No Elementor, Divi, or other heavy page builder is required. Editors will use the standard WordPress block editor with a carefully restricted design system and purpose-built patterns.

## Theme structure

```text
hbs-theme/
|-- style.css
|-- theme.json
|-- functions.php
|-- templates/
|   |-- front-page.html
|   |-- page.html
|   |-- single-program.html
|   |-- archive-program.html
|   |-- single-faculty.html
|   |-- archive-faculty.html
|   |-- single.html
|   `-- 404.html
|-- parts/
|   |-- header.html
|   `-- footer.html
|-- patterns/
|-- assets/
|   |-- css/
|   |-- js/
|   |-- fonts/
|   |-- icons/
|   `-- images/
`-- inc/

hbs-core/
|-- hbs-core.php
|-- includes/
|   |-- post-types.php
|   |-- taxonomies.php
|   |-- fields.php
|   |-- integrations.php
|   `-- admin-columns.php
`-- blocks/
```

## Structured content

### Program

- Degree title and short title
- Program level
- Degree award
- Duration
- Study mode
- Language
- HBS location
- Partner institution and partner location
- Tuition display
- Intake and deadline relationship
- Overview, highlights, curriculum, outcomes, careers, requirements, FAQ
- Request-information form destination
- Apply link

### Faculty

- Name, role, portrait, short biography, full biography, expertise, languages, qualifications

### Partnership

- Institution, logo, summary, external URL, relationship type, location

### Intake

- Term, start date, EU/EFTA deadline, non-EU/EFTA deadline, applicable programs, status

### Insight / Event

- WordPress posts with type taxonomy; events additionally receive date, time, location, registration URL, and past/upcoming status.

## Integrations

- Existing HubSpot application and information-request forms, or native forms connected to HubSpot after field mapping is approved.
- Consent-aware analytics and marketing tags.
- SEO plugin with schema for Organization, EducationalOrganization, Course, FAQ, Article, and Event where accurate.
- SMTP or transactional email service for reliable form delivery.
- Cookie-consent system configured for Swiss and European visitors.
- Optional multilingual framework only if HBS confirms languages and translation ownership.

## Motion implementation

- GSAP and ScrollTrigger loaded only on pages that use advanced motion.
- Native CSS for hover, focus, menu, and simple reveal states.
- Intersection Observer fallback for non-GSAP sections.
- No scroll hijacking.
- Reduced-motion mode disables preloader animation, parallax, and staggered reveals.

## Performance plan

- Self-host Roboto and Instrument Sans as WOFF2 with only required weights.
- Convert approved images to AVIF and WebP with responsive WordPress image sizes.
- Preload only the hero font subset and hero image.
- Delay nonessential scripts.
- Target Core Web Vitals: LCP below 2.5 seconds, INP below 200 ms, CLS below 0.1 on representative mobile hardware and network conditions.

## Security and maintenance

- Keep the plugin list minimal.
- Sanitize all structured fields and escape front-end output.
- Use WordPress nonces and capability checks for custom admin actions.
- Configure backups, staging, update policy, uptime monitoring, and form-delivery monitoring before launch.

## Delivery phases

### Phase 0 - Content confirmation

- Confirm the exact La Tour-de-Peilz address, map pin, arrival instructions, and use of AUS name/logo.
- Confirm current program portfolio, tuition, duration, intakes, deadlines, faculty, partnerships, accreditations, policies, and legal owner details.
- Match every portrait to the correct faculty record.
- Approve the allowed photo library.

### Phase 1 - Design system and homepage

- Translate the approved prototype into `theme.json`, global styles, header, footer, buttons, cards, forms, and motion primitives.
- Build and test the homepage in WordPress.

### Phase 2 - Content model and templates

- Implement HBS Core content types and fields.
- Build Programs, Faculty, Partnerships, Admissions, Student Experience, Insights/Events, Search, and 404 templates.

### Phase 3 - Migration and integrations

- Clean and migrate approved content.
- Connect forms, analytics, SEO, consent, email delivery, redirects, and sitemap.

### Phase 4 - Quality assurance

- Test content accuracy, responsive layouts, keyboard navigation, screen readers, browsers, forms, motion preferences, performance, analytics, metadata, redirects, and error states.

### Phase 5 - Launch

- Final backup, DNS/hosting deployment, cache warm-up, indexation checks, and post-launch form/analytics verification.

## Definition of done

- The approved sitemap and all agreed templates are implemented.
- Header and footer are identical and editable globally.
- Editors can update programs, faculty, deadlines, fees, and events without editing code.
- No Vevey location references remain unless used explicitly as historical context approved by HBS.
- No exterior campus imagery appears.
- No unverified dates, fees, claims, addresses, or partner statuses are published.
- Mobile, tablet, desktop, accessibility, performance, and form tests pass.
- The theme and companion plugin are supplied as installable ZIP files with setup instructions.

## Local testing handoff

The production delivery will include:

1. `hbs-theme.zip`
2. `hbs-core.zip`
3. A setup checklist
4. Approved starter content or an import package
5. A redirect list
6. A quality-assurance checklist

The recipient can install both ZIP files in LocalWP, activate the theme and plugin, run the supplied setup checklist, and test the site before anything is published.
