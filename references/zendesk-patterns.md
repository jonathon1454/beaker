# Zendesk Product Design Patterns

Common patterns across Zendesk products. Follow these for consistency.

## Layout Patterns

### Settings Pages
- **Pattern:** Left sidebar navigation + content area
- **Sidebar:** Vertical nav with nested sections
- **Content:** Form fields with clear section headers
- **Actions:** Sticky footer with Save/Cancel buttons

### Admin Tools
- **Pattern:** Desktop-first, full-featured
- **Layout:** Multi-column when screen allows
- **Navigation:** Top bar + side nav
- **Bulk actions:** Toolbar above data tables

### Agent/Customer-Facing
- **Pattern:** Mobile-first, focused workflows
- **Layout:** Single column, progressive disclosure
- **Navigation:** Bottom tabs on mobile, top bar on desktop
- **Actions:** Primary action always visible

## Navigation Patterns

### Settings Navigation
- Use **Tabs** for top-level switching (Account, Security, Notifications)
- Use **Left sidebar** for nested settings within a section
- Avoid Accordion for settings nav (usability issues with deep nesting)

### Bulk Actions
- **Toolbar pattern:** Checkbox select → Toolbar appears with actions
- Always include: Select All, Clear Selection, Action count ("3 items selected")
- Destructive actions require confirmation modal

## Modal Usage

### When to Use Modals
- Quick create forms (< 5 fields)
- Confirmations (especially destructive actions)
- Focused tasks that benefit from blocking other UI

### When NOT to Use Modals
- Destructive actions without confirmation (use confirmation modal pattern)
- Long forms (> 5 fields) — use drawer or full page
- Multi-step workflows — use drawer or dedicated page

## Form Patterns

### Validation
- Inline validation on blur
- Error summary at top of form if multiple errors
- Disable submit button until form is valid

### Required Fields
- Mark with asterisk (*)
- Include hint text: "* Required fields"
- Don't rely on color alone

### Field Sizing
- **Short inputs** (zip code, quantity): width matches expected content
- **Medium inputs** (name, email): default width
- **Long inputs** (address, notes): full-width or textarea

## Accessibility Requirements

- WCAG 2.1 AA minimum
- Keyboard navigation for all interactions
- Focus indicators on all interactive elements
- Color contrast ratios: 4.5:1 for text, 3:1 for UI components
- ARIA labels for icon-only buttons
- Screen reader announcements for dynamic content changes

## Localization Considerations

- Allow 30% text expansion for translations
- RTL support for Arabic/Hebrew
- Date/number formats vary by locale
- Icon meanings vary by culture (no thumbs-up, hand gestures)
- Avoid text in images
