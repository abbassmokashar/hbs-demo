# Proposed HBS Sitemap

## Goals

The structure gives prospective students a short path from discovery to program comparison, admissions information, and application. It keeps institutional material accessible without overwhelming the main navigation.

## Primary navigation

1. **Programs**
2. **Admissions**
3. **About HBS**
4. **Student Experience**
5. **Insights & Events**
6. **Contact**

Persistent actions: **Request information** and **Apply now**.

## Page hierarchy

```text
Home
|
+-- Programs
|   +-- All Programs
|   +-- Bachelor of Business Administration (BBA)
|   +-- Master of Business Administration (MBA)
|   +-- Dual Degrees
|   |   +-- BBA + B.Sc. International Management
|   |   +-- MBA + M.Sc. International Management
|   |   +-- MBA + M.A. Strategic Marketing Management
|   |   +-- MBA + M.Sc. Finance
|   |   +-- MBA + M.Sc. Business Intelligence & Data Science
|   |   +-- MBA + M.A. Digital Marketing
|   |   +-- MBA + M.Sc. International Logistics & Supply Chain Management
|   |   +-- MBA + M.A. Luxury, Fashion & Sales Management
|   |   +-- MBA + M.A. Entrepreneurship
|   |   +-- MBA + M.A. Strategic Sports Management
|   |   +-- MBA + M.Sc. Psychology & Management
|   +-- Executive Certificates
|   +-- Institute of Technology [external link to helvetictech.ch]
|
+-- Admissions
|   +-- How to Apply
|   +-- Entry Requirements
|   +-- Tuition & Fees
|   +-- International Students & Visa Guidance
|   +-- Intakes & Deadlines
|   +-- Request Program Information
|   +-- Frequently Asked Questions
|
+-- About HBS
|   +-- Our Story, Vision & Mission
|   +-- Leadership & Faculty
|   +-- Academic Partnerships
|   +-- Accreditations & Recognition
|   +-- Policies
|
+-- Student Experience
|   +-- Studying in Switzerland
|   +-- La Tour-de-Peilz & the AUS Campus
|   +-- Accommodation
|   +-- Activities & Student Life
|
+-- Insights & Events
|   +-- All Insights & Events
|   +-- Article or Event detail
|
+-- Contact
|   +-- Contact HBS
|   +-- Book a Call
|
+-- Utility / Legal
    +-- Search
    +-- Privacy Policy
    +-- Cookie Policy and Preferences
    +-- Accessibility Statement
    +-- 404 Page
```

## Main menu behavior

### Programs mega-menu

- Two clear columns: **Bachelor** and **Master**.
- A third area introduces **Dual Degrees** without listing every specialization at first level.
- Institute of Technology is visually marked as an external website.
- A featured panel links to the program finder and request-information form.

### Admissions menu

- Put How to Apply, Requirements, Tuition & Fees, Intakes & Deadlines, and FAQ in one compact panel.
- Keep Apply Now visible as a separate high-priority button.

### About menu

- Institutional story, faculty, partnerships, accreditations, and policies.
- Student Experience is separate because it answers a different prospective-student need.

## Program-page template

Every program uses one consistent template:

1. Program hero with degree name, short verified introduction, and application actions
2. At-a-glance facts: award, duration, mode, location, language
3. Why this program
4. Curriculum or program structure
5. Learning outcomes
6. Career outlook
7. Admissions requirements
8. Tuition and fees
9. Dual-degree pathway when applicable
10. Program FAQ
11. Related programs
12. Final admissions call to action

## URL convention

- `/programs/`
- `/programs/bba/`
- `/programs/mba/`
- `/programs/dual-degrees/`
- `/programs/dual-degrees/international-management/`
- `/admissions/how-to-apply/`
- `/about/faculty/`
- `/student-experience/accommodation/`
- `/insights/article-title/`

Existing high-value URLs such as `/bba`, `/mba`, and current dual-degree routes should receive permanent redirects to the new canonical routes during launch.

## Header

- Shared across all pages.
- Transparent over selected heroes, becoming a solid warm-white header after scrolling.
- HBS wordmark at left; primary navigation centered; Request information and Apply now at right.
- On mobile, one accessible full-screen menu replaces the desktop navigation.

## Footer

- Shared across all pages.
- Dark green background with Programs, Admissions, About, and Contact columns.
- Displays `info@hbs.swiss`, `+41 21 921 22 27`, and **La Tour-de-Peilz, Switzerland** until the exact new street address is confirmed.
- Includes legal links, social links, newsletter only if HBS confirms it will be maintained, and a prominent Apply now action.

## Content governance notes

- Do not migrate Vevey copy, the old Vevey address, or claims that HBS is located near Vevey station.
- Do not publish expired 2025 or early-2026 intake dates.
- The exact La Tour-de-Peilz street address, transport instructions, and map pin require confirmation.
- Program data should be entered once and reused across cards, comparison views, and program pages.
