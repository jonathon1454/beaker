# Beaker Agent Design Specification

**Date:** 2026-06-23  
**Author:** Jonathon Newby  
**Status:** Design approved, ready for implementation planning

---

## Overview

Beaker is a comprehensive design assistant agent for Zendesk Labs, supporting solo designers through the complete lifecycle of 0-1 concept development. It provides structured workflows for brainstorming, research, design, prototyping, and validation, orchestrating specialist subagents and integrating with Zendesk's design systems and tools.

---

## Section 1: High-Level Architecture

### Core Concept

Beaker is a plugin-based design assistant with a central agent personality and phase-specific workflow skills. Each skill orchestrates specialist subagents to handle focused tasks.

### Component Layers

**1. Agent Layer**  
`beaker.md` provides the personality, tone, memory management, and general design guidance that applies across all phases.

**2. Skill Layer**  
Six workflow skills that define structured processes:
- `ideate` — Problem framing, brainstorming, concept exploration
- `research` — Competitive analysis, internal product search, customer research
- `design` — Pattern selection, component architecture, design decisions
- `prototype` — Build functional prototypes using Flora/Garden + code
- `validate` — Accessibility audits, localization checks, design review prep
- `project` — Full-cycle workflow with approval gates between phases

**3. Subagent Layer**  
Specialist agents spawned by skills to handle focused work:
- Competitive analysis researcher
- Internal product search (via Slack, GitHub, zendeskdev, codebase)
- Pattern/component researcher (Context7 → Flora/Garden docs)
- Feature flag researcher (Unleash → current experiments, rollout status)
- Accessibility auditor
- Localization checker
- User research prep assistant
- Documentation researcher (Google Workspace → design docs, PRDs, research reports)

**4. Integration Layer**  
MCP servers and plugins Beaker depends on:
- `figma@claude-plugins-official` — Design generation and Code Connect
- `context7@claude-plugins-official` — Documentation lookup (Flora, Garden, Polaris, Material, etc.)
- `slack` MCP — Internal research, team context, design discussions
- `researcher` MCP — External web research for competitive analysis
- `z2-help-center` MCP — Customer-facing documentation search
- `unleash` MCP — Feature flag context, experiment status
- `google-calendar` MCP — Team availability, meeting context
- GitHub integration (via Bash/gh CLI) — Pull requests, issues, code search, team activity

**5. Memory Layer**  
Persistent storage across sessions:
- `${CLAUDE_PLUGIN_DATA}/memory.md` — Team patterns, design constraints, learned context
- `${CLAUDE_PLUGIN_DATA}/projects/` — Per-project context and decisions

### Data Flow

```
User invokes skill → Skill workflow loads Beaker agent context → 
Workflow spawns specialist subagents in parallel → 
Subagents query integrations (GitHub/Unleash/Workspace/Slack) → 
Subagents return structured findings → 
Skill synthesizes and presents to user → 
User approves/redirects → 
Next phase or iteration
```

### Integration Use Cases

- **GitHub** — Find related PRs, see implementation patterns, identify active workstreams, search component usage
- **Unleash** — Understand what's currently being A/B tested, check feature rollout status, identify design constraints from experiments
- **Google Workspace** — Access design specs, PRDs, user research reports, prior art in Google Docs/Slides/Sheets (Note: Google Calendar already available for scheduling context)

---

## Section 2: Agent Definition (beaker.md)

### Identity & Personality

Beaker is a senior design partner — opinionated but deferential, thorough but not pedantic. Speaks to the designer as a peer principal-level designer, not a junior needing hand-holding.

### Core Responsibilities

- Frame design problems clearly before jumping to solutions
- Consider the full design stack: user needs, business constraints, technical feasibility, accessibility, localization, team capacity
- Propose strong defaults based on Zendesk patterns, Flora/Garden components, and established conventions
- Catch blind spots early: "Have we considered mobile?", "What's the impact on support load?", "Does this conflict with ongoing experiments?"
- Remember context across sessions — team patterns, project constraints

### Memory Management

At session start, Beaker checks for and reads:
1. `${CLAUDE_PLUGIN_DATA}/memory.md` — Global team patterns and constraints
2. `${CLAUDE_PLUGIN_DATA}/projects/<project-slug>/context.md` — Project-specific decisions and constraints

When the designer expresses team standards or learned constraints ("team standard: never use modals for destructive actions"), Beaker saves them to memory with context about why.

**Memory Usage Policy:**

DO save to memory:
- Team-wide standards and patterns
- Technical constraints (platform, browser support)
- Established design system rules
- Process preferences (how to work, when to validate)
- Organizational context (who to consult, where to research)

DO NOT auto-apply to designs:
- Personal component preferences without research validation
- Aesthetic choices without research backing
- Convenience shortcuts that bypass validation

**Brainstorming Behavior:**

When Beaker has a designer preference in memory, it should:
1. Present it as ONE option during brainstorming, not the default
2. Flag that it's a preference, not research-validated
3. Ask if user research supports this choice
4. If research contradicts the preference, recommend the research-backed approach and offer to update memory

### Tone & Communication

- Concise, structured output — use tables and lists, not paragraphs
- Multiple-choice questions when possible
- No over-explaining — designer is an expert
- Flag assumptions explicitly: "I'm assuming this is agent-facing, not end-user — correct?"
- When presenting research, lead with insights, not raw data dumps

### Design System Adherence

Beaker uses **Zendesk Flora** as the primary design system, falling back to **Zendesk Garden** only when Flora doesn't yet provide the needed component or pattern.

**Component Selection Priority:**
1. **Flora first** — Check Flora documentation via Context7 for components, tokens, patterns
2. **Garden fallback** — If Flora doesn't have it, use Garden equivalent
3. **Custom only when necessary** — Requires explicit justification and approval

Before proposing any component or pattern, Beaker verifies it exists in the design system via Context7. The agent should flag when it's falling back to Garden or proposing custom work, with reasoning.

### Integration Awareness

Beaker understands it has access to:
- GitHub (code patterns, team activity, related work)
- Unleash (active experiments, feature flags, rollout status)
- Slack (design discussions, team context, tribal knowledge)
- Google Workspace (design docs, PRDs, research reports)
- zendeskdev (engineering documentation, ADRs)
- Figma (existing designs, component libraries, Code Connect mappings)

It proactively suggests relevant research based on the problem space.

---

## Section 3: Skill Definitions

Each skill is a workflow script that orchestrates specialist subagents. They all follow a common pattern: **gather → synthesize → present → approve → next step**.

### `/beaker:ideate <brief>`

**Purpose:** Problem framing and concept exploration before any research or design work.

**Workflow:**
1. Load Beaker agent context + memory
2. Analyze the brief — extract goals, constraints, assumptions
3. Spawn parallel subagents:
   - **Assumption challenger** — What are we assuming that might be wrong?
   - **Constraint mapper** — What limits this (tech, business, team, time)?
   - **User impact analyzer** — Who is this for and what changes for them?
4. Synthesize findings into a problem statement
5. Present 2-3 high-level concept directions with trade-offs
6. Get approval on direction before moving forward
7. Output: Problem statement doc + chosen direction saved to `${CLAUDE_PLUGIN_DATA}/projects/<slug>/ideation.md`

### `/beaker:research <topic>`

**Purpose:** Multi-source research orchestration — competitive, internal, customer.

**Workflow:**
1. Load Beaker context + project context
2. Determine research dimensions based on topic (e.g., "competitive", "internal patterns", "customer pain points")
3. Spawn parallel research subagents:
   - **Competitive analyst** — Web research via `researcher` MCP, screenshot analysis, pattern extraction
   - **Internal searcher** — GitHub code search, Slack design discussions, zendeskdev ADRs, Google Workspace docs
   - **Feature flag researcher** — Unleash query for related experiments and rollout status
   - **Customer context** — z2-help-center search for support doc patterns and common issues
4. Synthesize findings into structured insights (not raw data dumps)
5. Present: "Here's what exists, here's what's missing, here's what's surprising"
6. Output: Research report saved to `${CLAUDE_PLUGIN_DATA}/projects/<slug>/research-<topic>.md`

### `/beaker:design <concept>`

**Purpose:** Translate concept into concrete component architecture and design decisions.

**Workflow:**
1. Load Beaker context + project context (ideation, research)
2. Spawn parallel design subagents:
   - **Component researcher** — Context7 lookup of Flora/Garden components that fit the concept
   - **Pattern finder** — Search existing Figma files and GitHub for similar implementations
   - **Information architect** — Structure content hierarchy, navigation, states
3. Present component architecture:
   - Layout structure (page/modal/drawer/etc)
   - Component choices with Flora-first priority
   - Interaction patterns
   - State management approach
   - Responsive considerations
4. Get approval on architecture
5. Output: Design spec saved to `${CLAUDE_PLUGIN_DATA}/projects/<slug>/design-spec.md`

### `/beaker:prototype <spec>`

**Purpose:** Build a working prototype using Flora/Garden components.

**Workflow:**
1. Load design spec
2. Determine tech stack (React + Garden React, HTML + Garden CSS, Figma prototype)
3. If code prototype:
   - Scaffold project structure
   - Implement components following design spec
   - Wire up basic interactions
   - Add placeholder data
4. If Figma prototype:
   - Use `/figma-generate-design` patterns
   - Build interactive prototype with Flora/Garden components
5. Output: Working prototype + documentation on how to run/view it

### `/beaker:validate <prototype>`

**Purpose:** Pre-launch checks — accessibility, localization, design review prep.

**Workflow:**
1. Load prototype context
2. Spawn parallel validation subagents:
   - **A11y auditor** — Check WCAG compliance, keyboard nav, screen reader compatibility
   - **i18n checker** — Flag hardcoded strings, RTL concerns, text expansion issues
   - **Design review prepper** — Generate review checklist, prepare comparison screenshots, document decisions
3. Present findings as prioritized issues (blockers vs nice-to-haves)
4. Optionally auto-fix simple issues
5. Output: Validation report saved to `${CLAUDE_PLUGIN_DATA}/projects/<slug>/validation.md`

### `/beaker:project <brief>`

**Purpose:** Full-cycle workflow with approval gates.

**Workflow:**
1. Run `/beaker:ideate <brief>` → wait for approval
2. Ask: "What research do we need?" → run relevant `/beaker:research` calls in parallel
3. Run `/beaker:design` based on ideation + research → wait for approval
4. Ask: "Prototype type?" → run `/beaker:prototype`
5. Run `/beaker:validate` → present findings
6. Output: Complete project directory with all phase artifacts

**Common Pattern Across Skills:**
- All skills check memory at start
- All use structured schemas for subagent output (ensures consistent data format)
- All save artifacts to project directory for future reference
- All follow "present insights, not data dumps" principle

---

## Section 4: Subagent Specifications

These are the specialist subagents that skills spawn to handle focused tasks. Each has a specific role, output schema, and integration dependencies.

### Competitive Analysis Researcher

**Role:** Research competitor products, extract patterns, identify design trends.

**Spawned by:** `research` skill

**Integrations:** `researcher` MCP (web search + fetch)

**Input:** Product name or feature area

**Output Schema:**
```json
{
  "competitors": [
    {
      "name": "Product Name",
      "approach": "How they solve this problem",
      "patterns": ["Pattern 1", "Pattern 2"],
      "strengths": ["What works well"],
      "weaknesses": ["What doesn't work"],
      "screenshots": ["url1", "url2"]
    }
  ],
  "insights": ["Cross-cutting observations"],
  "recommendations": ["What to adopt/avoid"]
}
```

**Behavior:** Search competitor sites, take screenshots, extract UI patterns, compare approaches, synthesize insights.

---

### Internal Product Searcher

**Role:** Find related work, existing patterns, and team context within Zendesk.

**Spawned by:** `research` skill, `design` skill

**Integrations:** GitHub (gh CLI), Slack MCP, Google Workspace (via links/search), zendeskdev MCP

**Input:** Topic or feature area

**Output Schema:**
```json
{
  "github_findings": {
    "related_prs": ["PR links with descriptions"],
    "code_patterns": ["Component usage examples"],
    "active_work": ["In-progress initiatives"]
  },
  "slack_context": {
    "design_discussions": ["Relevant thread summaries"],
    "team_decisions": ["Key decisions from channels"]
  },
  "documentation": {
    "adrs": ["Architecture decisions"],
    "design_docs": ["Related specs"],
    "help_center": ["Customer-facing patterns"]
  },
  "insights": ["What's already solved, what's in progress, what's missing"]
}
```

**Behavior:** Multi-source search, filter for relevance, prioritize recent/active work, summarize context.

---

### Feature Flag Researcher

**Role:** Understand current experiments, feature rollout status, and design constraints from A/B tests.

**Spawned by:** `research` skill, `ideate` skill

**Integrations:** Unleash MCP

**Input:** Feature area or project name

**Output Schema:**
```json
{
  "active_flags": [
    {
      "name": "Flag name",
      "status": "enabled|disabled|gradual",
      "rollout_percentage": 50,
      "description": "What it controls",
      "design_impact": "How it affects design decisions"
    }
  ],
  "experiments": [
    {
      "name": "Experiment name",
      "variants": ["A", "B"],
      "design_differences": "What varies between variants",
      "status": "running|concluded"
    }
  ],
  "constraints": ["Design constraints from active experiments"],
  "opportunities": ["Areas not currently being tested"]
}
```

**Behavior:** Query Unleash for related flags, identify design implications, flag conflicts with proposed work.

---

### Component Researcher

**Role:** Find the right Flora/Garden components for a design need.

**Spawned by:** `design` skill, `prototype` skill

**Integrations:** Context7 MCP (Flora + Garden docs)

**Input:** Design requirement (e.g., "navigation with nested sections", "data table with sorting")

**Output Schema:**
```json
{
  "flora_options": [
    {
      "component": "Component name",
      "use_case": "When to use it",
      "props": ["Key props"],
      "examples": ["Code examples"],
      "documentation_url": "Link"
    }
  ],
  "garden_fallbacks": [
    "Garden components if Flora doesn't have it"
  ],
  "recommendation": "Which component to use and why",
  "tokens": ["Relevant design tokens (spacing, color, etc.)"]
}
```

**Behavior:** Search Flora first, fallback to Garden, verify component exists, provide usage guidance.

---

### Pattern Finder

**Role:** Find existing implementations of similar designs in the codebase and Figma.

**Spawned by:** `design` skill

**Integrations:** GitHub (code search), Figma MCP (design search)

**Input:** Pattern description (e.g., "settings page layout", "bulk action toolbar")

**Output Schema:**
```json
{
  "code_examples": [
    {
      "file_path": "Path to file",
      "component": "Component name",
      "pattern": "What pattern it implements",
      "usage_notes": "How it's used"
    }
  ],
  "figma_designs": [
    {
      "file_url": "Figma file link",
      "frame_name": "Frame name",
      "pattern": "What it demonstrates",
      "screenshot_url": "Screenshot if available"
    }
  ],
  "recommendation": "Which pattern to follow and why"
}
```

**Behavior:** Search codebase and Figma for similar patterns, extract reusable approaches, recommend consistency.

---

### Accessibility Auditor

**Role:** Check designs and prototypes for WCAG compliance.

**Spawned by:** `validate` skill

**Integrations:** Browser tools (for code prototypes), Figma MCP (for design prototypes)

**Input:** Prototype URL or Figma file

**Output Schema:**
```json
{
  "issues": [
    {
      "severity": "blocker|major|minor",
      "category": "keyboard|screen-reader|color-contrast|focus|aria|semantic",
      "description": "What's wrong",
      "location": "Where the issue is",
      "fix": "How to fix it",
      "wcag_criterion": "WCAG reference"
    }
  ],
  "summary": {
    "blockers": 0,
    "major": 0,
    "minor": 0
  },
  "recommendations": ["General a11y improvements"]
}
```

**Behavior:** Run automated checks, flag common issues, provide fix guidance, prioritize by impact.

---

### Localization Checker

**Role:** Identify internationalization concerns before they become problems.

**Spawned by:** `validate` skill

**Integrations:** Code analysis tools (grep for hardcoded strings), Figma MCP

**Input:** Prototype or design

**Output Schema:**
```json
{
  "issues": [
    {
      "severity": "blocker|major|minor",
      "category": "hardcoded-text|text-expansion|rtl|date-format|number-format|icon-meaning",
      "description": "What's wrong",
      "location": "Where the issue is",
      "fix": "How to fix it"
    }
  ],
  "recommendations": ["i18n best practices for this design"]
}
```

**Behavior:** Scan for hardcoded strings, check text expansion allowances, flag RTL concerns, verify icon meanings are universal.

---

### Assumption Challenger

**Role:** Question assumptions in the problem statement to uncover blind spots.

**Spawned by:** `ideate` skill

**Integrations:** None (reasoning-based)

**Input:** Problem brief

**Output Schema:**
```json
{
  "assumptions": [
    {
      "assumption": "What we're assuming",
      "challenge": "Why it might be wrong",
      "validation_approach": "How to verify",
      "risk_if_wrong": "Impact if we're wrong"
    }
  ],
  "questions": ["Critical questions to answer before proceeding"]
}
```

**Behavior:** Extract implicit assumptions, challenge them, identify validation approaches.

---

## Section 5: Technical Implementation

### Plugin Structure

```
beaker@zendesk-labs/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   └── beaker.md
├── skills/
│   ├── ideate/
│   │   └── SKILL.md
│   ├── research/
│   │   └── SKILL.md
│   ├── design/
│   │   └── SKILL.md
│   ├── prototype/
│   │   └── SKILL.md
│   ├── validate/
│   │   └── SKILL.md
│   └── project/
│       └── SKILL.md
├── references/
│   ├── flora-quickstart.md
│   ├── garden-fallbacks.md
│   ├── zendesk-patterns.md
│   └── research-sources.md
├── README.md
└── settings.json (optional hook config)
```

### plugin.json

```json
{
  "name": "beaker",
  "version": "1.0.0",
  "description": "Design assistant for Zendesk Labs — brainstorming, research, design, prototyping, and validation",
  "author": {
    "name": "Zendesk Labs"
  },
  "repository": "https://github.com/zendesk/zendesk-labs-beaker",
  "license": "MIT",
  "keywords": ["design", "research", "prototyping", "zendesk", "flora", "garden"],
  "dependencies": [
    "figma@claude-plugins-official",
    "context7@claude-plugins-official"
  ]
}
```

**Note:** Slack, Unleash, Researcher, z2-help-center, and Google Calendar are MCP servers configured separately in user settings, not plugin dependencies.

---

### Memory Schema

**`${CLAUDE_PLUGIN_DATA}/memory.md`** — Global team patterns and constraints

```markdown
# Beaker Memory

## Team Patterns
- Never use modals for destructive actions (team standard, all products)
- Settings pages use left sidebar nav + content area (established pattern)

## Design Constraints
- Mobile-first for customer-facing features
- Desktop-only acceptable for admin/agent tools
- A11y is non-negotiable — WCAG 2.1 AA minimum

## Design System
- Flora primary, Garden fallback only when Flora lacks the component
- Follow techmenu.zende.sk for endorsed technologies

## Research Sources
- Primary competitive references: [List of products to check]
- Internal Slack channels: #design, #labs, #accessibility
- Key stakeholders: [Names/roles for specific domains]

## Process Preferences
- Always validate component choices against user research before proposing
- Present user preference suggestions during brainstorming, don't auto-apply
- Flag when personal preference conflicts with user research
```

**`${CLAUDE_PLUGIN_DATA}/projects/<project-slug>/`** — Per-project context

```
projects/
└── ticket-workflow-redesign/
    ├── context.md          # Project overview, stakeholders, timeline
    ├── ideation.md         # Problem statement + chosen direction
    ├── research-competitive.md
    ├── research-internal.md
    ├── design-spec.md
    ├── validation.md
    └── decisions.md        # Key design decisions + rationale
```

---

### Skill Implementation Pattern

Each skill is a workflow script following this structure:

```javascript
export const meta = {
  name: 'beaker-research',
  description: 'Multi-source research orchestration',
  phases: [
    { title: 'Research', detail: 'Query integrations in parallel' },
    { title: 'Synthesize', detail: 'Extract insights from findings' }
  ]
}

// Load Beaker context
const memory = await readMemory()
const projectContext = await readProjectContext(args.project)

phase('Research')

// Spawn specialist subagents in parallel
const results = await parallel([
  () => agent('Competitive analysis: ' + args.topic, {
    label: 'competitive',
    schema: COMPETITIVE_SCHEMA,
    agentType: 'general-purpose'
  }),
  () => agent('Internal search: ' + args.topic, {
    label: 'internal',
    schema: INTERNAL_SEARCH_SCHEMA,
    agentType: 'general-purpose'
  }),
  () => agent('Feature flag check: ' + args.topic, {
    label: 'unleash',
    schema: FEATURE_FLAG_SCHEMA,
    agentType: 'general-purpose'
  })
])

phase('Synthesize')

// Synthesize findings
const synthesis = await agent('Synthesize research findings', {
  prompt: `Given these research results, extract key insights:\n${JSON.stringify(results)}`,
  schema: SYNTHESIS_SCHEMA
})

return synthesis
```

**Key Patterns:**
- Use `parallel()` for independent research tasks
- Use structured schemas for subagent output (ensures consistency)
- Pass Beaker memory context in subagent prompts
- Save artifacts to project directory after each phase
- Return structured data, not prose

---

### Integration Setup

**Required MCP Servers (user must configure):**
- `slack` — Already configured in user's settings
- `unleash` — Needs authentication: `mcp__unleash__authenticate`
- `researcher` — Needs authentication: `mcp__researcher__authenticate`
- `z2-help-center` — Needs authentication: `mcp__z2-help-center__authenticate`
- `google-calendar` — Already has auth flow: `mcp__google-calendar__authenticate`

**GitHub Integration:**
- Uses `gh` CLI via Bash tool (assumes user has `gh auth login` configured)
- Common commands: `gh pr list`, `gh issue search`, `gh search code`

**Figma Integration:**
- Via `figma@claude-plugins-official` dependency
- Can call figma MCP tools directly: `mcp__plugin_figma_figma__*`

---

### Error Handling

**Missing integrations:**
- Skills should check if required integrations are available before spawning dependent subagents
- If Unleash not configured, skip feature flag research and note it in output
- If Slack not available, fall back to GitHub-only internal search

**Subagent failures:**
- Workflow `parallel()` and `agent()` calls return `null` on failure
- Skills should filter nulls: `results.filter(Boolean)`
- Present partial results with note about what failed

**Memory corruption:**
- If memory file is malformed, log warning and continue with empty memory
- Don't block workflow on memory read failures

---

### Token Budget Considerations

**Research skills can be expensive:**
- Competitive analysis: ~20-40k tokens (web searches + screenshots)
- Internal search: ~10-30k tokens (multi-source queries)
- Full project workflow: ~100-200k tokens

**Optimization strategies:**
- Use `effort: 'low'` for mechanical subagents (code search, flag lookup)
- Use `effort: 'medium'` (default) for synthesis tasks
- Reserve `effort: 'high'` only for critical design decisions
- Provide focused prompts to subagents (not "research everything")
- Reuse artifacts from previous phases (don't re-research)

**Budget-aware project workflow:**
- If user sets token budget with `+500k`, scale research depth accordingly
- Check `budget.remaining()` before spawning expensive research subagents
- Offer "quick research" vs "thorough research" modes

---

## Section 6: Deployment & Team Rollout

### Installation Process

**Step 1: Marketplace Setup**

Add Beaker marketplace to `~/.claude/settings.json`:
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

**Step 2: Install Plugin**
```bash
claude plugin install beaker@zendesk-labs
```

This auto-installs dependencies (figma, context7).

**Step 3: Configure Required MCP Servers**

Team members need to authenticate these MCP servers (one-time setup):
- Slack: Should already be configured for most team members
- Unleash: Run authentication flow in Claude Code session
- Researcher: Run authentication flow
- z2-help-center: Run authentication flow
- Google Calendar: Run authentication flow (optional, for team context)

GitHub integration uses `gh` CLI — ensure `gh auth login` is configured.

**Step 4: Verify Installation**

Test with a simple invocation:
```
/beaker:ideate "Improve ticket assignment flow"
```

Should load Beaker agent context and start ideation workflow.

---

### Testing Strategy

**Phase 1: Solo validation**
- Test each skill independently with real Labs projects
- Validate subagent output quality
- Tune memory schema based on actual usage
- Identify missing integrations or capabilities
- Document gotchas and workarounds

**Phase 2: Alpha testing (1-2 trusted teammates)**
- Share plugin with selected designers
- Observe their usage patterns
- Collect feedback on:
  - Skill naming/organization (is it intuitive?)
  - Subagent output quality (useful insights vs noise?)
  - Integration pain points (auth issues, missing data?)
  - Memory behavior (is it helping or confusing?)
- Iterate on skills based on feedback

**Phase 3: Team rollout**
- Document installation process
- Create example workflows ("How to use Beaker for...")
- Host demo session showing each skill
- Provide template memory.md for team patterns
- Set up shared project directory structure conventions

---

### Iteration Plan

**v1.0 Scope (MVP):**
- Core 6 skills (ideate, research, design, prototype, validate, project)
- Basic subagent set (8 specialists)
- Memory system (global + per-project)
- Integration with existing MCP servers

**Post-v1.0 Enhancements:**
- Additional specialist subagents based on usage patterns:
  - User testing script generator
  - Design review facilitator
  - Metrics/analytics researcher
  - Technical feasibility checker
- Skill refinements:
  - Add "quick research" vs "deep research" modes
  - Budget-aware research (scale to token limits)
  - Better artifact management (versioning, search)
- Integration expansions:
  - Jira integration (track design work)
  - Confluence integration (design documentation)
  - Figma Code Connect deeper integration
- Team features:
  - Shared memory patterns across team
  - Project templates for common Labs workflows
  - Cross-project pattern extraction

**Feedback Loop:**
- Track which skills get used most/least
- Monitor subagent failure rates
- Collect qualitative feedback on output quality
- Identify gaps in research coverage

---

### Team Rollout Considerations

**Documentation Needs:**
- README with installation instructions
- Skill reference guide (when to use each skill)
- Integration setup guide (MCP server auth)
- Example workflows for common Labs projects
- Memory usage guide (what to save, what not to save)

**Training Approach:**
- Live demo session (30-45 min)
- Office hours for installation help
- Example project walkthrough (recorded)
- Async Slack support channel

**Adoption Metrics:**
- Track skill invocation counts
- Monitor project artifact creation
- Survey team satisfaction quarterly
- Document time savings vs manual process

**Governance:**
- Who maintains the plugin? (Initially solo, then shared ownership)
- How do team members suggest new skills/subagents?
- How do shared memory patterns get updated?
- What's the process for breaking changes?

---

### Maintenance Considerations

**Regular maintenance:**
- Update Flora/Garden component references as design system evolves
- Refresh competitive analysis sources
- Prune stale memory entries
- Update integration auth as APIs change

**Dependency updates:**
- Monitor upstream plugin updates (figma, context7)
- Test Beaker compatibility before team-wide updates
- Document breaking changes in release notes

**Error monitoring:**
- Log subagent failures to identify integration issues
- Track token usage patterns to optimize costs
- Monitor memory file growth (cleanup strategy?)

---

### Success Criteria

Beaker is successful if:
1. **Regular usage** — It becomes the default workflow for 0-1 concepts
2. **Research quality improves** — Less time searching, more time synthesizing
3. **Design consistency increases** — Better adherence to Flora/patterns
4. **Team adopts it** — Other designers start using it without prompting
5. **Prototyping accelerates** — Faster from concept to testable prototype
6. **Validation catches issues earlier** — A11y/i18n problems found in design phase

---

## Appendix: Command Reference

### Primary Commands

```bash
/beaker:ideate "<brief>"           # Problem framing + concept exploration
/beaker:research "<topic>"         # Multi-source research orchestration
/beaker:design "<concept>"         # Component architecture + design decisions
/beaker:prototype "<spec>"         # Build working prototype
/beaker:validate "<prototype>"     # A11y, i18n, design review prep
/beaker:project "<brief>"          # Full-cycle workflow with gates
```

### Specialist Functions (Direct Invocation)

```bash
/beaker:competitive "<product>"    # Competitive analysis only
/beaker:internal-search "<topic>"  # Internal product search only
/beaker:a11y-audit "<design>"      # Accessibility audit only
/beaker:i18n-check "<design>"      # Localization check only
```

---

## Summary

Beaker is designed as a modular, extensible design assistant that orchestrates specialist subagents through structured workflows. By separating concerns into agent personality, phase-specific skills, and focused subagents, it provides both flexibility for solo use and predictability for team adoption. The staged workflow approach ensures the designer maintains control while benefiting from parallel research orchestration and comprehensive validation checks.

The plugin architecture allows for iterative enhancement based on real usage patterns, and the memory system enables Beaker to learn team patterns and project context over time without imposing personal preferences on design decisions.
