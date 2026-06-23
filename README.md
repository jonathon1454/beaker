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

## Testing

### Local Installation

For plugin development, you can install Beaker from a local directory:

1. Add to your `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "beaker-local": {
      "source": {
        "source": "directory",
        "path": "/absolute/path/to/beaker"
      }
    }
  },
  "enabledPlugins": {
    "beaker@beaker-local": true
  }
}
```

2. Restart Claude Code to load the plugin

3. Verify installation:

```bash
claude plugin list
```

You should see `beaker@beaker-local` in the list.

### Testing the Ideate Skill

The ideate skill uses the Workflow API which requires Claude Code's plugin execution environment. To test:

1. **In a Claude Code session**, invoke the skill:

```
/beaker:ideate "Your design brief here"
```

2. **Expected behavior:**
   - Phase 1: Three parallel analysis subagents (assumptions, constraints, user impact)
   - Phase 2: Synthesis agent integrating findings into problem statement and concepts
   - Results saved to `${CLAUDE_PLUGIN_DATA}/projects/{slug}/ideation-{date}.md`

3. **Verify artifacts:**

```bash
ls -la ~/.claude/plugin-data/beaker/projects/
```

Each project should contain:
- `context.md` (project-specific memory)
- `ideation-{date}.md` (ideation session outputs)

4. **Check memory:**

```bash
cat ~/.claude/plugin-data/beaker/memory.md
```

Should contain global team patterns and constraints you've shared.

### Environment Variables

The workflow script expects:
- `CLAUDE_PLUGIN_DATA`: Set by Claude Code to `~/.claude/plugin-data/{plugin-name}`

### Known Limitations

- The Workflow API (`agent()`, `parallel()`, `phase()`, `log()`) is only available in Claude Code's plugin execution environment
- Direct Node.js execution of `workflow.js` will fail due to missing Workflow API globals
- Skills must be invoked through Claude Code session, not via direct script execution

## License

MIT
