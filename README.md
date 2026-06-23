# Beaker

Design assistant for Zendesk Labs — supporting solo designers through the complete lifecycle of 0-1 concept development.

## Install

Add this to your `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "zendesk-labs": {
      "source": {
        "source": "github",
        "repo": "zendesk/zendesk-labs-beaker"
      }
    }
  }
}
```

Then install:

```bash
claude plugin install beaker@zendesk-labs
```

## Usage

### Ideation

```
/beaker:ideate "Your project brief here"
```

Beaker will:
1. Analyze your brief for goals, constraints, assumptions
2. Challenge assumptions and map constraints
3. Present 2-3 concept directions with trade-offs
4. Save the problem statement and chosen direction

## Memory

Beaker remembers team patterns and project context across sessions. Tell it things like:

- "Team standard: never use modals for destructive actions"
- "Design constraint: mobile-first for customer features"

It saves them to `${CLAUDE_PLUGIN_DATA}/memory.md` and applies them to future work.

## Design System

Beaker uses **Zendesk Flora** as the primary design system, falling back to Garden only when Flora doesn't provide the needed component.

## License

MIT
