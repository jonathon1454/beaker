# Flora Design System Quick Reference

Zendesk Flora is the primary design system. Check Flora first before falling back to Garden.

## How to Check Flora

Use Context7 to query Flora documentation:

```
Use context7 to search Flora docs for: [component name or pattern]
```

Examples:
- "Flora button component"
- "Flora navigation patterns"
- "Flora color tokens"
- "Flora spacing scale"

## Common Component Categories

### Layout
- Grid (12-column)
- Flex utilities
- Spacing tokens (4, 8, 12, 16, 20, 32px scale)

### Navigation
- Tabs
- Breadcrumbs
- Pagination
- Sidebar

### Forms
- Input
- Select
- Checkbox
- Radio
- Toggle
- Form validation patterns

### Data Display
- Table
- List
- Card/Pane
- Tag
- Badge
- Tooltip

### Actions
- Button (primary, secondary, tertiary)
- IconButton
- Menu/Dropdown
- Modal
- Drawer

### Feedback
- Alert
- Toast/Notification
- Loading states
- Empty states

## When Flora Doesn't Have It

1. **Check Garden** — Query Context7 for Garden equivalent
2. **Document the gap** — Note in your design spec that this is a Garden fallback
3. **Consider custom** — Only if neither Flora nor Garden provides it

## Design Tokens

Flora uses design tokens for:
- **Colors** — Semantic color names, not hex values
- **Spacing** — 4px scale (xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 20px, xxl: 32px)
- **Typography** — Font sizes, weights, line heights
- **Elevation** — Shadow depths for layering

Always use tokens, never hardcoded values.
