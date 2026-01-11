# Miao Vision UI Design System

> A modern, Gemini-inspired design system for data analytics applications.

## Table of Contents
- [Design Principles](#design-principles)
- [Color System](#color-system)
- [Typography](#typography)
- [Components](#components)
  - [Buttons](#buttons)
  - [Forms](#forms)
  - [Navigation](#navigation)
  - [Cards](#cards)
- [Layout](#layout)
- [Animations & Transitions](#animations--transitions)
- [Responsive Design](#responsive-design)
- [Accessibility](#accessibility)

---

## Design Principles

### 1. **Modern & Professional**
- Clean, minimalist interface with focus on content
- Subtle gradients and smooth animations
- Dark-first design with light mode support

### 2. **Data-Focused**
- Clear visual hierarchy for analytics
- High contrast for readability
- Optimized for data visualization

### 3. **Accessible**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Focus indicators on all interactive elements

### 4. **Performant**
- Smooth 60fps animations
- Optimized font loading
- Minimal CSS bundle size

---

## Color System

### Base Colors (Dark Mode)

```css
/* Backgrounds */
--bg-primary: #030712;      /* gray-950 - Main background */
--bg-secondary: #111827;    /* gray-900 - Cards, panels */
--bg-tertiary: #1F2937;     /* gray-800 - Hover states, borders */

/* Text */
--text-primary: #F3F4F6;    /* gray-100 - Primary text */
--text-secondary: #9CA3AF;  /* gray-400 - Secondary text */
--text-tertiary: #6B7280;   /* gray-500 - Disabled, hints */

/* Borders */
--border-primary: #1F2937;  /* gray-800 */
--border-secondary: #374151; /* gray-700 */
--border-hover: #4B5563;    /* gray-600 */
```

### Gemini Gradient Colors

```css
/* Primary Gradient (Blue → Purple → Pink) */
--gemini-blue: #4285F4;
--gemini-purple: #8B5CF6;
--gemini-pink: #EC4899;

/* Gradient Definitions */
background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%);
background: linear-gradient(90deg, #4285F4 0%, #A855F7 50%, #EC4899 100%); /* Text gradient */
```

### Semantic Colors

```css
/* Success - Green */
--success-400: #4ADE80;
--success-500: #22C55E;
--success-600: #16A34A;

/* Warning - Amber */
--warning-400: #FBBF24;
--warning-500: #F59E0B;
--warning-600: #D97706;

/* Error - Red */
--error-400: #F87171;
--error-500: #EF4444;
--error-600: #DC2626;

/* Info - Blue */
--info-400: #38BDF8;
--info-500: #0EA5E9;
--info-600: #0284C7;

/* Primary - Evidence Blue */
--primary-400: #60A5FA;
--primary-500: #3B82F6;
--primary-600: #2563EB;
```

---

## Typography

### Font Families

```css
/* UI Text - Inter (Google Sans alternative) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Helvetica Neue', Arial, sans-serif;

/* Code - JetBrains Mono */
font-family: 'JetBrains Mono', Monaco, Consolas, 'Courier New', monospace;
```

### Font Sizes

```css
/* Scale: 11px, 14px, 16px, 18px, 20px, 24px, 30px, 36px */
--text-xs: 0.6875rem;    /* 11px - Labels, badges */
--text-sm: 0.875rem;     /* 14px - Body small, inputs */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Subheadings */
--text-xl: 1.25rem;      /* 20px - Headings */
--text-2xl: 1.5rem;      /* 24px - Page titles */
--text-3xl: 1.875rem;    /* 30px - Large headings */
--text-4xl: 2.25rem;     /* 36px - Hero text */
```

### Font Weights

```css
--font-normal: 400;      /* Regular text */
--font-medium: 500;      /* Emphasized text */
--font-semibold: 600;    /* Headings, active states */
--font-bold: 700;        /* Strong emphasis */
```

### Letter Spacing

```css
/* Tighter spacing for larger text */
--tracking-tight: -0.015em;  /* xl sizes */
--tracking-normal: 0;        /* base sizes */
--tracking-wide: 0.08em;     /* uppercase labels */
```

---

## Components

### Buttons

#### Base Button Classes

```html
<!-- Primary Button (Gemini Gradient) -->
<button class="btn btn-md btn-primary">
  Create Report
</button>

<!-- Secondary Button -->
<button class="btn btn-md btn-secondary">
  Cancel
</button>

<!-- Ghost Button -->
<button class="btn btn-md btn-ghost">
  Learn More
</button>

<!-- Danger Button -->
<button class="btn btn-md btn-danger">
  Delete
</button>

<!-- Outline Button -->
<button class="btn btn-md btn-outline">
  Export
</button>
```

#### Button Sizes

```html
<!-- Small -->
<button class="btn btn-sm btn-primary">Small Button</button>

<!-- Medium (Default) -->
<button class="btn btn-md btn-primary">Medium Button</button>

<!-- Large -->
<button class="btn btn-lg btn-primary">Large Button</button>
```

#### Icon Buttons

```html
<!-- Regular Icon Button -->
<button class="btn btn-icon btn-ghost">
  <svg>...</svg>
</button>

<!-- Small Icon Button -->
<button class="btn btn-icon-sm btn-ghost">
  <svg>...</svg>
</button>
```

#### Button States

```css
/* Default */
.btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover */
.btn-primary:hover {
  box-shadow: 0 4px 16px rgba(66, 133, 244, 0.2);
  transform: translateY(-1px);
}

/* Focus (Keyboard Navigation) */
.btn:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* Disabled */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Button CSS Reference

```css
/* Base */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Sizes */
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
.btn-md { padding: 0.5rem 1rem; font-size: 0.875rem; }
.btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }

/* Variants */
.btn-primary {
  background: linear-gradient(to right, #4285F4, #8B5CF6);
  color: white;
  border-color: transparent;
}

.btn-secondary {
  background-color: #1F2937;
  color: #E5E7EB;
  border-color: #374151;
}

.btn-ghost {
  background-color: transparent;
  color: #D1D5DB;
  border-color: transparent;
}

.btn-danger {
  background-color: #DC2626;
  color: white;
  border-color: transparent;
}

.btn-outline {
  background-color: transparent;
  color: #D1D5DB;
  border-color: #374151;
}
```

---

### Forms

#### Input Fields

```html
<!-- Text Input -->
<div class="form-group">
  <label class="form-label" for="name">Report Name</label>
  <input
    type="text"
    id="name"
    class="form-input"
    placeholder="Enter report name"
  />
  <span class="form-hint">Choose a descriptive name</span>
</div>

<!-- Input with Error -->
<div class="form-group">
  <label class="form-label" for="email">Email</label>
  <input
    type="email"
    id="email"
    class="form-input"
    placeholder="your@email.com"
  />
  <span class="form-error">Please enter a valid email</span>
</div>

<!-- Small Input -->
<input type="text" class="form-input form-input-sm" placeholder="Small" />

<!-- Large Input -->
<input type="text" class="form-input form-input-lg" placeholder="Large" />
```

#### Select Dropdowns

```html
<div class="form-group">
  <label class="form-label" for="type">Chart Type</label>
  <select id="type" class="form-select">
    <option>Bar Chart</option>
    <option>Line Chart</option>
    <option>Pie Chart</option>
  </select>
</div>
```

#### Textarea

```html
<div class="form-group">
  <label class="form-label" for="description">Description</label>
  <textarea
    id="description"
    class="form-textarea"
    rows="4"
    placeholder="Enter description..."
  ></textarea>
</div>
```

#### Form CSS Reference

```css
/* Input Base */
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: #111827;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  color: #F3F4F6;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-input:hover:not(:disabled):not(:focus) {
  border-color: #4B5563;
}

.form-input:focus {
  outline: none;
  ring: 2px solid #3B82F6;
  border-color: transparent;
}

/* Labels */
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #D1D5DB;
  margin-bottom: 0.375rem;
}

/* Helper Text */
.form-hint {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #6B7280;
}

.form-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #F87171;
}

/* Form Groups */
.form-group {
  margin-bottom: 1rem;
}
```

---

### Navigation

#### Sidebar Navigation Items

```html
<!-- Navigation Item -->
<button class="nav-item">
  <span class="nav-label">Upload Data</span>
</button>

<!-- Active Navigation Item -->
<button class="nav-item active">
  <span class="nav-label">Query Data</span>
</button>

<!-- Disabled Navigation Item -->
<button class="nav-item" disabled>
  <span class="nav-label">Visualize</span>
</button>
```

#### Navigation CSS Reference

```css
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: #9CA3AF;
  font-size: 0.9375rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover:not(:disabled) {
  background-color: #1F2937;
  color: #F3F4F6;
  transform: translateX(2px);
}

.nav-item:focus-visible {
  outline: 2px solid #4285F4;
  outline-offset: -2px;
}

.nav-item.active {
  background-color: rgba(66, 133, 244, 0.1);
  border-left-color: #4285F4;
  color: #F3F4F6;
  font-weight: 600;
}

.nav-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

### Cards

#### Basic Card

```html
<div class="evidence-card">
  <h3>Card Title</h3>
  <p>Card content goes here...</p>
</div>

<!-- Gemini Card with Gradient Overlay -->
<div class="gemini-card">
  <h3>Featured Report</h3>
  <p>This card has a subtle gradient overlay</p>
</div>
```

#### Card CSS Reference

```css
.evidence-card {
  background-color: #111827;
  border: 1px solid #1F2937;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.gemini-card {
  position: relative;
  background-color: #111827;
  border: 1px solid #1F2937;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  overflow: hidden;
}

.gemini-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%);
  pointer-events: none;
}
```

---

## Layout

### Spacing Scale

```css
/* 4px base scale */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Border Radius

```css
--radius-sm: 0.125rem;   /* 2px - Badges */
--radius-DEFAULT: 0.25rem; /* 4px - Small elements */
--radius-md: 0.375rem;   /* 6px - Buttons, inputs */
--radius-lg: 0.5rem;     /* 8px - Cards */
--radius-xl: 0.75rem;    /* 12px - Panels */
--radius-2xl: 1rem;      /* 16px - Large cards */
--radius-3xl: 1.5rem;    /* 24px - Gemini style */
--radius-full: 9999px;   /* Circle */
```

### Container Widths

```css
/* Main Content Area */
.content-wrapper {
  max-width: 80rem;  /* 1280px */
  margin: 0 auto;
  padding: 2rem;
}

/* Report Content (Narrower for readability) */
.report-content {
  max-width: 56rem;  /* 896px */
  margin: 0 auto;
}
```

### Grid Layouts

```css
/* Two-Column Layout */
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* Three-Column Layout */
.three-column {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* Auto-fit Responsive Grid */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

---

## Animations & Transitions

### Easing Functions

```css
/* Standard easing (use for most animations) */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Fast easing (for micro-interactions) */
transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

/* Slow easing (for large movements) */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide In Up */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse Glow */
@keyframes pulseGlow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.8);
  }
}
```

### Hover Effects

```css
/* Subtle Lift */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Scale */
.hover-scale:hover {
  transform: scale(1.05);
}

/* Glow */
.hover-glow:hover {
  box-shadow: 0 0 20px rgba(66, 133, 244, 0.4);
}
```

---

## Responsive Design

### Breakpoints

```css
/* Small Mobile */
@media (max-width: 480px) {
  /* Phone portrait */
}

/* Mobile */
@media (max-width: 768px) {
  /* Phone landscape, small tablets */
}

/* Tablet */
@media (max-width: 1024px) {
  /* Tablets, small laptops */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Desktops and larger */
}
```

### Mobile-First Approach

```css
/* Base styles for mobile */
.container {
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: 2rem;
  }
}
```

### Responsive Patterns

```css
/* Stack on mobile, side-by-side on desktop */
.responsive-flex {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 768px) {
  .responsive-flex {
    flex-direction: row;
  }
}

/* Full-width buttons on mobile */
@media (max-width: 768px) {
  .btn-lg,
  .btn-md {
    width: 100%;
  }
}
```

---

## Accessibility

### Focus Indicators

```css
/* Always provide visible focus indicators */
*:focus-visible {
  outline: 2px solid #4285F4;
  outline-offset: 2px;
}

/* Custom focus for buttons */
.btn:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

### Color Contrast

- **Text on Background**: Minimum 4.5:1 ratio (WCAG AA)
- **Large Text (18px+)**: Minimum 3:1 ratio
- **Interactive Elements**: Minimum 3:1 ratio

```css
/* Good contrast examples */
.good-contrast {
  background: #111827;  /* gray-900 */
  color: #F3F4F6;       /* gray-100 - Ratio: 15.8:1 ✓ */
}

.secondary-text {
  background: #111827;  /* gray-900 */
  color: #9CA3AF;       /* gray-400 - Ratio: 6.4:1 ✓ */
}
```

### Keyboard Navigation

```html
<!-- Proper tab order -->
<button tabindex="0">Focusable</button>
<div role="button" tabindex="0">Custom button</div>

<!-- Skip to content link -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

### ARIA Labels

```html
<!-- Icon buttons need labels -->
<button class="btn btn-icon" aria-label="Close dialog">
  <svg>...</svg>
</button>

<!-- Loading states -->
<button class="btn" aria-busy="true">
  Loading...
</button>

<!-- Disabled states -->
<button class="btn" disabled aria-disabled="true">
  Submit
</button>
```

---

## Usage Examples

### Complete Form Example

```html
<form class="max-w-md">
  <div class="form-group">
    <label class="form-label" for="report-name">
      Report Name *
    </label>
    <input
      type="text"
      id="report-name"
      class="form-input"
      placeholder="Q4 Sales Analysis"
      required
    />
    <span class="form-hint">
      This will be visible to all team members
    </span>
  </div>

  <div class="form-group">
    <label class="form-label" for="chart-type">
      Chart Type
    </label>
    <select id="chart-type" class="form-select">
      <option value="">Select a chart type</option>
      <option value="bar">Bar Chart</option>
      <option value="line">Line Chart</option>
      <option value="pie">Pie Chart</option>
    </select>
  </div>

  <div class="form-group">
    <label class="form-label" for="description">
      Description
    </label>
    <textarea
      id="description"
      class="form-textarea"
      rows="4"
      placeholder="Describe your report..."
    ></textarea>
  </div>

  <div class="flex gap-3">
    <button type="submit" class="btn btn-md btn-primary">
      Create Report
    </button>
    <button type="button" class="btn btn-md btn-ghost">
      Cancel
    </button>
  </div>
</form>
```

### Card with Actions

```html
<div class="evidence-card">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-xl font-semibold text-gray-100">
      Sales Dashboard
    </h3>
    <button class="btn btn-icon-sm btn-ghost" aria-label="More options">
      <svg>...</svg>
    </button>
  </div>

  <p class="text-sm text-gray-400 mb-6">
    Last updated: 2 hours ago
  </p>

  <div class="flex gap-2">
    <button class="btn btn-sm btn-primary">
      Open
    </button>
    <button class="btn btn-sm btn-outline">
      Share
    </button>
  </div>
</div>
```

### Navigation Sidebar

```html
<aside class="sidebar">
  <div class="sidebar-header">
    <h1 class="sidebar-logo">Miao Vision</h1>
    <p class="sidebar-subtitle">Local-First Analytics</p>
  </div>

  <nav class="sidebar-nav">
    <button class="nav-item active">
      <span class="nav-label">Upload Data</span>
    </button>
    <button class="nav-item">
      <span class="nav-label">Query Data</span>
    </button>
    <button class="nav-item">
      <span class="nav-label">Visualize</span>
    </button>
    <button class="nav-item">
      <span class="nav-label">Reports</span>
    </button>
  </nav>
</aside>
```

---

## Development Guidelines

### Component Development Checklist

When creating new components, ensure:

- [ ] Uses design system colors from Tailwind config
- [ ] Uses Inter font for UI, JetBrains Mono for code
- [ ] Includes hover states with smooth transitions
- [ ] Has focus-visible styles for keyboard navigation
- [ ] Includes disabled states where applicable
- [ ] Is responsive across all breakpoints
- [ ] Meets WCAG 2.1 AA contrast requirements
- [ ] Has proper ARIA labels for accessibility
- [ ] Uses consistent spacing from the scale
- [ ] Follows naming conventions (BEM or utility-first)

### CSS Architecture

```
src/
├── app.css                 # Global styles, design system
├── components/
│   ├── Button.svelte      # Component-specific styles
│   └── Input.svelte
└── lib/
    └── styles/
        ├── utilities.css  # Custom utility classes
        └── animations.css # Shared animations
```

### Best Practices

1. **Use Tailwind classes first** - Leverage existing utilities
2. **Component-scoped styles** - Keep styles close to components
3. **Semantic class names** - Use descriptive, purposeful names
4. **Avoid inline styles** - Prefer classes for maintainability
5. **Mobile-first** - Start with mobile, enhance for desktop
6. **Performance** - Minimize custom CSS, use transforms over positions

---

## Version History

- **v1.1.0** (2024-12-23) - Updated for 43-component architecture
  - Added component count and plugin architecture notes
  - Updated to reflect Bootstrap layer and clean architecture
  - Enhanced accessibility guidelines
  - Added responsive design patterns for 43+ components

- **v1.0.0** (2024-12-14) - Initial design system documentation
  - Modern dark-mode UI with Gemini inspiration
  - Complete button and form component system
  - Responsive layout patterns
  - Accessibility guidelines

---

## Component Integration

### Plugin Components (43 Total)

This design system is applied across all 43 plugin components:

**Input Components (8)**: Dropdown, ButtonGroup, TextInput, Slider, DateRange, Checkbox, DimensionGrid
- Use `form-input`, `form-select`, `btn` classes
- Consistent focus states and validation styling

**Data Display (22)**: BigValue, DataTable, Value, Sparkline, Charts, Gauge, KPIGrid, etc.
- Use `evidence-card` for containers
- Gradient accents via `bg-gemini-primary`
- High-contrast text for readability

**UI Components (6)**: Alert, Tabs, Accordion, Tooltip, Details, Modal
- Consistent spacing and border radius
- Smooth transitions (200-300ms)
- Accessible keyboard navigation

**Layout (1)**: Grid
- Responsive grid system with 12-column layout
- Consistent gaps and margins

### Architecture Compliance

All components must follow:
- ✅ Tailwind utility-first approach
- ✅ Design token consistency (colors, spacing, typography)
- ✅ WCAG 2.1 AA accessibility
- ✅ Responsive breakpoints (sm, md, lg, xl, 2xl)
- ✅ Dark mode optimization

For component development, see: [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md)

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Inter Font Family](https://fonts.google.com/specimen/Inter)
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Cubic Bezier Easing](https://cubic-bezier.com/)
- [Plugin Architecture Guide](./docs/PLUGIN_ARCHITECTURE.md)
- [Component Quick Reference](./COMPONENTS_QUICK_REFERENCE.md)

---

**Maintained by**: Miao Vision Team
**Last Updated**: December 23, 2024
