# Product Requirements Document: LML Design Studio

## 1. Product Overview

LML Design Studio is a portfolio website for Liang Minliang Design Studio. The product presents the studio's philosophy of merging business with art, using interactive visuals, animated reveals, and fluid-scrolling experiences to give brands digital vitality.

**Product**: Portfolio website with interactive showcase and rich visual effects.
**Scope**: Multi-page static experience. No backend, no authentication, no content management system.
**Primary surfaces**:
- Home — introduction, featured work, clients, creative gallery
- Work — portfolio index with 16 projects and view toggle
- Studio — founder portrait, skills, awards, bio
- Contact — image trail exploration and contact options
- Journal — masonry list of articles
- Journal Detail — single article reading experience (Horse Year)
- Sketch — full-screen drawing canvas with toolbar
- Project Detail — 4 project pages: Leeton Pet, Leaf Biotech, DecentralGPT, Zaowujun

**Design viewports**: 1440×900 desktop, 390×844 mobile. The site is self-hosted with external 3D model asset.

## 2. Audience and Core Experience

**Primary audience**: Prospective clients evaluating the studio for brand and digital work, collaborators, design peers.

**Secondary audience**: Students and visitors exploring visual experiments, journal readers, users interested in the sketch tool.

**Core experience**:
- Visitor arrives and sees a loading sequence that completes to a hero introduction.
- Visitor scrolls through homepage narrative: hero statement, pinned video that scales from small to full viewport, work showcase, client list with hover previews, and a creative gallery.
- Visitor enters Work to browse 16 projects through vertical scroll that drives horizontal movement, sees synced project titles, and switches between Overview and Index views.
- Visitor selects a project and enters a detail page with hero title and full-screen carousel where previous/next indicators follow the cursor, click or arrow keys advance, progress shows current index, and next-project link cycles through the four projects.
- Visitor enters Studio to see founder portrait with interactive displacement and tilt, falling words that can be dragged, awards, and bio that reveals on scroll.
- Visitor enters Contact to explore an image trail that appears under cursor movement, and opens a WeChat modal with QR code.

**Secondary flows**:
- Browse Journal masonry grid and read a single article.
- Open Sketch, draw with brush, adjust size, opacity, color from palette and hex input, undo and redo up to 40 states via buttons or keyboard, zoom through stepped presets, and export drawing as timestamped PNG.
- On mobile, open full-screen navigation via hamburger toggle, view language switch and contact link, see 3D dragon element inside rounded frame, and close via toggle or link activation.

## 3. Global Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Red | `#c51110` | Brand accent, interactive hover, selection background, page transition overlay |
| Contrast Black | `#000000` | Primary text, dark backgrounds, UI elements |
| Base White | `#ffffff` | Page backgrounds, text on dark, highlights |
| Border Translucent | `rgba(255,255,255,0.2)` | Borders and dividers |

Selection state uses Primary Red background with Base White text. All color pairs maintain at least 4.5:1 contrast for body text.

### Typography

| Role | Font | Size | Weight | Details |
|------|------|------|--------|---------|
| Body | Neuemontreal | 14px / 1rem, 20px line-height | 400-500 | Default UI and paragraph |
| Display | Neuemontreal | Fluid viewport units | 500 | Headings and large statements |
| Chinese | NotoSansSC | 14px | 400-500 | Localized text support |
| Monospace | System mono | Adaptive | 400 | Loading progress and code-like elements |

Headings use uppercase, tight letter-spacing, line-height 0.9 to 1.1. Display sizes scale with viewport via fluid units. Self-hosted WOFF2 files provide regular and medium weights.

### Visual Treatments

| Element | Required appearance and behavior |
|---------|----------------------------------|
| Imagery | WebP preferred with JPG/PNG fallback. Project images preserve aspect with cover behavior. |
| Metallic character | Footer shows a large metallic Chinese character "亮" with crisp edges, dynamic lighting, subtle reflections, and slow time-based animation. Canvas rendering with fallback to static image if rendering unavailable. |
| Liquid displacement | Project and portrait images show a liquid displacement highlight that follows cursor position, with configurable intensity, smooth onset under 50ms, and returns to rest when cursor leaves. |
| Noise overlay | Fixed full-viewport film grain at 5% opacity, slow animation, non-interactive, above content layer. |
| Grid gaps | 0.2 viewport width gaps between cells on work gallery. |
| Border radius | 0.2em for cards, 0.5em for buttons, subtle rounding. |
| Custom cursor | Ribbon trail canvas follows mouse with smooth interpolation and fade when stationary, disappears on leave. Visible on desktop only. |
| Custom scrollbar | Desktop only at 768px and above. Fixed at right edge, thin thumb, draggable thumb, clickable track, hover increases width, native scrollbar hidden. |
| Hover and audio feedback | Interactive elements show underline growth left to right over 0.3s, color shifts to Primary Red, logo scales slightly on hover. Brief hover sound and click sound play where enabled, respecting browser autoplay policies and muted on touch. |

### Motion and Transitions

| Trigger | Behavior |
|---------|----------|
| Page load | Loading overlay covers viewport with dark background, ASCII art centered, progress counter 000 to 100 bottom-right, studio logo top-left matching home header initial size. Minimum visible time about 1.5s, then slide up out of view over 600ms. Session persistence tracks transition state via sessionStorage key `lml-transition`. |
| Page navigation | Red overlay slides in from top, studio logo appears on black background, then red overlay slides out. Each phase 0.5s, two overlapping phases, eased in-out. Header, footer, and tabs fade in on new page entry. |
| Scroll reveal | Text splits into characters or words, fades in and rises from 50px offset to rest, trigger at 80% viewport, stagger 0.02s, duration 0.8s. Includes Business & Art statement. |
| Video pin | Featured video pins to viewport while page scrolls, scales from 0.35 to 1.0, pin duration covers 200% viewport height, centered, scrubbed with scroll. |
| Work horizontal | Vertical scroll drives horizontal movement. Container remains pinned while content translates. Snaps to nearest project at scroll rest. Single timeline drives both images and titles. |
| Title tilt | Project titles tilt toward cursor with perspective 1000px, constrained to plus/minus 8 degrees maximum, animated over 0.3s. |
| Tooltip | On desktop, hover over project shows tooltip with title and tags, follows cursor with gentle lag, fades 200ms, stays within viewport bounds. |
| Gallery typewriter | Creative gallery types text character by character with blinking cursor, loops through phrases. |
| Parallax | Project images and studio portrait shift at different speeds based on depth attribute ranging 0.5 to 1.5, scrubbed with scroll. |
| Typewriter and word cycle | Hero rotating phrase "Business & Art" cycles through variations. Creative gallery cycles phrases with typewriter. |

### Layout and Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | Below 768px | Single column, hamburger navigation, native scrollbar, touch interactions, simplified animations, minimum 44px touch targets, Overview/Index toggle visible in header area for work. |
| Desktop | 768px and above | Full header navigation, custom scrollbar, hover states, multi-column grids, ribbon cursor visible, magnetic tilt active, horizontal scroll active. |
| Large | 1024px and above | Increased spacing, larger typographic scale, wider content max-width, enhanced hover. |

Mobile menu fades in and out via opacity over 0.4s. Body scroll locks when menu open. 3D dragon element lazy-loads on first menu open and appears inside rounded frame with spin-in entrance.

Work page maintains horizontal scroll on mobile with touch drag, simplified title overlay, no displacement effect, no tooltips.

Sketch toolbar on mobile optimizes for touch with 44px targets, simplified controls, finger and stylus drawing, no hover states.

## 4. Global Accessibility Requirements

- Every image includes descriptive alternative text.
- Heading hierarchy follows h1 to h2 to h3 without skipping levels. Landmark elements header, nav, main, footer structure each page.
- Icon buttons such as hamburger, close, undo, redo provide accessible labels and ARIA where needed.
- All interactive elements are keyboard focusable with logical tab order. Enter activates buttons and links. Visible focus uses browser default indicator.
- Color contrast meets at least 4.5:1 for body text on white and black backgrounds.
- Screen reader support via proper landmarks, list semantics, and label associations.
- Touch targets on mobile meet at least 44 by 44 pixels.
- WeChat modal includes focus trap while open, close button with label, backdrop non-interactive for modal close, close via close button or embedded link activation.
- Project detail carousel is navigable via keyboard left/right arrows and clickable prev/next areas.
- Sketch canvas toolbar controls have labels, color picker exposes hex input, preset palette has accessible names.
- Footer clock provides text alternative and updates without breaking reading order.
- Requests animation frames target 60fps on desktop and 30fps on mobile, but does not block main thread or keyboard interaction.

## 5. Global Content and Data

### Brand Copy

- **Homepage description**: Liang Minliang Design Studio (LML) merges business with art, using cutting-edge technology to craft unique digital experiences that give brands digital vitality and lasting impact.
- **Studio description**: Founded in 2014 by Liang Minliang, a full-stack visual designer with over 20 years of experience.
- **Work description**: Craft with dedication, shape unique brand experiences.

### Project Inventory

| Project | Theme |
|---------|-------|
| Leeton Pet | Pet care brand identity and digital experience |
| Leaf Biotech | Biotech company branding and website |
| DecentralGPT | Decentralized AI platform interface |
| Zaowujun | Cultural project branding |

Each project includes hero image, full-screen image carousel, index-based progress bar, and next-project link that cycles through the four projects. No description or credits sections are required inside the carousel view.

Work index shows 16 projects total with titles and tags in tooltip and overlay.

### Navigation Labels

- "Work" routes to work portfolio.
- "Studio" routes to studio information.
- "LML Design Studio" is the home logo title.
- "Contact" appears in mobile menu with icon.
- "Overview" and "Index" are the work view toggle options.
- Language toggle shows Chinese and English options in mobile menu footer.
- Sketch toolbar groups: Navigation (home, undo, redo), Zoom (percentage display), Brush (settings, clear), Export.

### Assets

| Category | Count | Format | Where used |
|----------|-------|--------|------------|
| Project images | 16 | WebP with JPEG/PNG fallback | Work horizontal scroll, project detail carousels |
| Studio portrait | 1 | WebP | Studio page hero with interactive overlay |
| Fonts | 3 | WOFF2 | neuemontreal regular, neuemontreal medium, noto sans SC covering 400 and 500 |
| Favicon | 1 | ICO | Browser tab |
| Open Graph image | 1 | WebP | Social sharing preview |
| Audio feedback | 2 | MP3 | Hover feedback and click feedback, at root |
| 3D dragon model | 1 | Hosted via external 3D service | Homepage background eager, inner pages lazy on first mobile menu open, scroll-driven, non mouse-interactive, fallback to canvas animation |

Fonts are preloaded to avoid flash of unstyled text. Critical images are preloaded above the fold. Below-fold images lazy-load.

### Audio

- Hover feedback plays subtle sound on interactive hover, disabled on touch, respects autoplay policies.
- Click feedback plays short click on button activation, file at `/click.mp3`, hover at `/hover.mp3`.

## 6. Product Surfaces

### 6.1 Global Shell

**What user sees**:
- Fixed header with logo on left, primary navigation centered (Work, Studio) on desktop, hamburger on right for mobile. Logo shrinks from large initial size (about 25 viewport width up to 480px at 768px) to compact on scroll.
- Footer with live clock updating every second in HH:MM format, copyright text, navigation links.
- On desktop, thin custom scrollbar at right edge and ribbon cursor trail. On mobile, native scrollbar and no ribbon.

**What happens when user acts**:
- Clicking logo navigates to home.
- Clicking Work or Studio navigates with red overlay transition: red slides in, logo on black shows, red slides out, each phase 0.5s overlapping, eased in-out, with sessionStorage tracking.
- Hovering navigation link triggers underline growth left to right over 0.3s and color shift to Primary Red.
- Desktop scroll uses smooth interpolation with gentle deceleration. Resize recalculates layout after 250ms debounce.
- If next-generation graphics unavailable, static image replaces canvas effects with no console errors and layout preserved.

### 6.2 Loading Experience

**What user sees**: Full-screen dark overlay with ASCII art centered in monospace, progress counter showing 000 to 100 with LOADING label at bottom-right in large fluid type, LML logo top-left matching home header position.

**What happens**: Progress increments with randomized timing, reaches 100, then overlay slides up out of viewport via translate over 600ms, and sessionStorage sets `lml-transition` to indicate first load completed. Page content underneath fades in.

### 6.3 Home

**What user sees**:
- 3D dragon background behind content, full-screen, behind content layer, scroll-driven, not mouse-interactive, eager on home.
- Hero statement with rotating phrase "Business & Art" that cycles variations.
- Video section where video starts small and grows to full as user scrolls, pinned for duration.
- Work showcase strip previewing projects.
- Client list.
- Studio intro summary.
- Creative gallery in footer area showing metallic large character "亮" with dynamic lighting and reflections and slow time animation, typewriter phrases looping with blinking cursor, three draggable easter eggs (Happy, Graffiti, Journal) that snap back on release.

**What happens when user acts**:
- Scrolling triggers text character reveals, video scale, and dragon scroll position.
- Hovering client names shows trailing images following cursor.
- Dragging easter eggs moves them around screen, releasing snaps back.
- Clicking work preview navigates to Work or directly to project detail.

### 6.4 Work

**What user sees**:
- Header with view toggle buttons Overview and Index, active state shows filled background, hover preview shows image.
- Horizontal pinned gallery of 16 projects, each full viewport width, images with cover behavior, 0.2 viewport width gaps.
- Vertical title overlay on left side with current project name, responsive fluid type.
- Tooltip on hover showing project title and tags.

**What happens when user acts**:
- Vertical scroll drives horizontal translation. At 50% visibility, active title switches. Scroll end snaps to nearest project.
- Hovering title triggers magnetic tilt toward cursor up to 8 degrees with perspective 1000.
- Hovering project image triggers liquid displacement that follows cursor, under 50ms onset.
- Clicking toggle switches between Overview (large focus) and Index (list) views, preference stored for session.
- Clicking project navigates to its detail page with transition overlay.

### 6.5 Project Detail (4 projects: Leeton Pet, Leaf Biotech, DecentralGPT, Zaowujun)

**What user sees**:
- Hero with project title.
- Full-screen click carousel showing one image at a time, with previous and next invisible hotspots that follow cursor position, index-based progress bar, and next-project link at end that cycles to next project in order.
- All four projects share same template, differing only in image set and title.

**What happens when user acts**:
- Moving cursor shows prev/next indicators near cursor.
- Clicking left or right side or pressing left/right arrow steps carousel.
- Progress bar updates to reflect current index over total.
- Clicking next-project link navigates to next project in cycle: Leeton Pet → Leaf Biotech → DecentralGPT → Zaowujun → Leeton Pet.

### 6.6 Studio

**What user sees**:
- Founder portrait with interactive canvas overlay, responsive aspect, parallax on scroll.
- Skills section with words falling under physics simulation, bouncing with restitution, walls at container edges.
- Honner and Awards section, horizontal layout on desktop, vertical on mobile.
- Bio text that reveals via clip-path on scroll, split into lines.
- Contact call-to-action block.

**What happens when user acts**:
- Moving cursor over portrait creates magnetic tilt up to 8 degrees and displacement distortion following cursor.
- Dragging a falling word allows reposition and throw on release via mouse constraint.
- After 10 seconds of no interaction, falling words reset.
- Scrolling triggers bio line reveals.

### 6.7 Contact

**What user sees**:
- Gallery area intended for exploratory image trail.
- Contact information block with address and links.
- WeChat button that opens modal with QR code.

**What happens when user acts**:
- Moving mouse in gallery area creates image elements at cursor that fade out over 1 second and scale down, maximum 10 in DOM at once, transform-based for performance, disabled on touch devices.
- Clicking WeChat button opens modal with backdrop, QR, close button. Modal closes only via X button or link activation inside, not via backdrop or Escape, per design. Focus remains trapped inside while open.
- Clicking contact link navigates or copies as defined.

### 6.8 Journal

**What user sees**:
- Header navigation.
- Masonry grid of article cards, 1 column on mobile, 2 to 3 columns on desktop, consistent gutters, cards show image, title, date, excerpt.
- Footer.

**What happens when user acts**:
- Images lazy-load as they enter viewport.
- Resizing triggers recalculation of row spans based on image height.
- Clicking card navigates to journal detail.

### 6.9 Journal Detail (Horse Year)

**What user sees**:
- Article title, meta, body content with text and images, readable line length, 20px base line-height.
- Navigation to return to journal list and optional next article.

**What happens when user acts**:
- Scrolling reads article with smooth scroll interpolation.
- Clicking back returns to Journal grid.

### 6.10 Sketch

**What user sees**:
- Full-screen drawing canvas.
- Top toolbar with groups: Navigation (home, undo, redo), Zoom percentage, Brush settings and clear, Export. Dark background, light icons, minimum 44px touch targets.
- Color control with hex input and preset palette of 12 colors.
- Brush controls for size 1 to 80px and opacity 0 to 1.
- Zoom display showing current percentage.
- Undo and redo buttons with keyboard hints.

**What happens when user acts**:
- Pointer down and move draws line with round caps, size and opacity applied.
- Adjusting size slider changes brush from 1 to 80.
- Adjusting opacity changes from 0 to 1.
- Selecting color via hex input or preset updates brush color immediately.
- Pressing undo pops history stack and restores previous canvas image, up to 40 states. Redo re-applies undone state. Keyboard Ctrl+Z and Ctrl+Shift+Z trigger same.
- Clicking zoom cycles through 0.5, 0.75, 1, 1.25, 1.5, 2 presets, canvas centers缩放, percentage display updates, no panning.
- Clicking export renders canvas as PNG via data URL, filename includes timestamp `sketch-YYYY-MM-DD-HHMMSS.png`, download triggers, visual success feedback appears.
- Clicking clear removes all strokes after confirmation.

### 6.11 Mobile Navigation

**What user sees**:
- Hamburger button with two bars that animate to X when open.
- Full-screen menu fading in and out via opacity, containing Home, Work, Studio links, language toggle Chinese/English in footer, contact link with icon, 3D dragon inside rounded square frame with spin-in entrance.
- Menu content centered with large type.

**What happens when user acts**:
- Tapping hamburger toggles menu open and closed, locking body scroll when open.
- Tapping a link navigates and closes menu.
- Tapping toggle again closes menu. Close occurs only via toggle button or link activation, not via Escape or backdrop.
- On first open, 3D dragon asset lazy-loads with guard to avoid duplicate loads.

## 7. Acceptance Criteria

- Loading overlay appears on first entry
- Loading progress counts 000 to 100 and auto-dismisses with slide-up
- Loading does not reappear in same session after transition flag set
- Home shows 3D dragon background that moves with scroll
- Home hero rotating phrase cycles through variations
- Home video pins and scales from 0.35 to 1.0 over scroll duration
- Home text reveals with fade and rise on scroll
- Home client list shows image trail on hover
- Footer metallic character shows dynamic lighting and slow animation with static fallback
- Page transitions use red overlay slide in and out with logo on black in between
- Each transition phase lasts 0.5s with overlapping timing and eased in-out
- Header and footer fade in on new page entry
- Work horizontal movement is driven by vertical scroll
- Work snaps to nearest project among 16 at scroll rest
- Work titles sync when project reaches 50% visibility
- Work title tilt is limited to 8 degrees
- Work tooltip shows title and tags and follows cursor within viewport
- Work view toggle switches Overview and Index and persists for session
- Project detail provides full-screen carousel with prev/next areas that follow cursor
- Project detail carousel navigates via click or left/right arrow keys
- Project detail progress bar reflects current index
- Project detail next-project link cycles through 4 projects
- Studio portrait shows displacement that follows cursor
- Studio portrait tilts up to 8 degrees and has parallax on scroll
- Studio skills words fall, bounce, can be dragged and thrown
- Studio skills reset after 10 seconds of inactivity
- Studio bio reveals on scroll via clip
- Contact image trail appears on mouse move and fades out within 1s
- Contact trail limits to 10 simultaneous images and is disabled on touch
- Contact WeChat modal opens on button click and shows QR
- WeChat modal closes only via close button or link click and traps focus while open
- Journal grid uses masonry layout 1 column mobile and 2 to 3 columns desktop
- Journal cards include image, title, date, excerpt
- Journal images lazy-load and resize recalculates row spans
- Journal detail shows article content with proper heading order
- Sketch canvas draws with brush size 1 to 80px
- Sketch opacity adjusts 0 to 1
- Sketch color updates via hex input and 12 preset palette
- Sketch undo and redo support up to 40 states via buttons and keyboard shortcuts
- Sketch zoom cycles through 0.5, 0.75, 1, 1.25, 1.5, 2 presets centered with percentage display
- Sketch export creates PNG named `sketch-YYYY-MM-DD-HHMMSS.png` and triggers download
- Global shell provides fixed header with logo, nav, and hamburger
- Footer clock updates every second in HH:MM format
- Custom scrollbar appears on desktop only at 768px and above
- Ribbon cursor trail appears on desktop only with fade when stationary
- Noise overlay covers viewport at 5% opacity and is non-interactive
- Mobile navigation opens via hamburger with opacity fade and locks body scroll
- Mobile menu shows language toggle and contact link
- Mobile menu lazy-loads 3D dragon once and closes via toggle or link activation
- Colors use Primary Red `#c51110`, Black `#000000`, White `#ffffff`, translucent border
- Contrast meets at least 4.5 to 1 for body text
- Typography uses self-hosted Neuemontreal and NotoSansSC with correct weights and uppercase headings
- Accessibility provides alt text for all images
- Heading order follows h1 to h2 to h3 without skipping
- Landmark structure header, nav, main, footer is present
- Interactive elements are keyboard focusable with logical tab order
- Icon buttons include accessible labels
- Touch targets meet at least 44px minimum
- Performance preloads critical resources and fonts
- Images use WebP preferred with fallback and lazy-load below fold
- Animations target 60fps on desktop and page remains navigable if canvas effects unavailable
- Brand copy matches required statements for home, studio, and work
- Navigation labels match Work, Studio, LML Design Studio, Contact, Overview, Index
- Four project identities are presented in work and detail surfaces
- Sixteen work items are visible in work surface
- Three font files, favicon, open graph image, and audio feedback files are present at expected locations
