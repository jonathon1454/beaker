import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  ASSUMPTION_SCHEMA,
  CONSTRAINT_SCHEMA,
  USER_IMPACT_SCHEMA,
  SYNTHESIS_SCHEMA
} from './schemas.js';

export const meta = {
  name: 'beaker-ideate',
  description: 'Problem framing and concept exploration',
  phases: [
    { title: 'Analyze', detail: 'Challenge assumptions, map constraints, assess user impact' },
    { title: 'Synthesize', detail: 'Frame problem statement and explore concept directions' }
  ]
};

/**
 * Read memory file if it exists
 */
async function readMemory(filePath) {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Load project context and global memory
 */
async function readProjectContext(projectSlug) {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (!pluginData) {
    throw new Error('CLAUDE_PLUGIN_DATA environment variable not set');
  }

  const globalMemory = await readMemory(join(pluginData, 'memory.md'));

  let projectContext = null;
  if (projectSlug) {
    projectContext = await readMemory(
      join(pluginData, 'projects', projectSlug, 'context.md')
    );
  }

  return { globalMemory, projectContext };
}

/**
 * Format synthesis data as Markdown
 */
function formatSynthesisMarkdown(brief, analysis, synthesis) {
  const { assumptions, constraints, userImpact } = analysis;
  const { problem_statement, concepts } = synthesis;

  let md = `# Ideation Session\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `## Design Brief\n\n${brief}\n\n`;

  md += `## Problem Statement\n\n`;
  md += `**What:** ${problem_statement.what}\n\n`;
  md += `**Why:** ${problem_statement.why}\n\n`;
  md += `**For whom:** ${problem_statement.for_whom}\n\n`;
  md += `**Success looks like:** ${problem_statement.success_looks_like}\n\n`;

  md += `## Concepts\n\n`;
  concepts.forEach((concept, idx) => {
    md += `### ${idx + 1}. ${concept.name} (${concept.recommendation})\n\n`;
    md += `${concept.approach}\n\n`;
    md += `**Strengths:**\n`;
    concept.strengths.forEach(s => md += `- ${s}\n`);
    md += `\n**Trade-offs:**\n`;
    concept.trade_offs.forEach(t => md += `- ${t}\n`);
    md += `\n`;
  });

  md += `## Analysis\n\n`;
  md += `### Assumptions Challenged\n\n`;
  assumptions.assumptions.forEach(a => {
    md += `**Assumption:** ${a.assumption}\n`;
    md += `- Challenge: ${a.challenge}\n`;
    md += `- Validation: ${a.validation_approach}\n`;
    md += `- Risk if wrong: ${a.risk_if_wrong}\n\n`;
  });

  md += `**Key Questions:**\n`;
  assumptions.questions.forEach(q => md += `- ${q}\n`);
  md += `\n`;

  md += `### Constraints Mapped\n\n`;
  constraints.constraints.forEach(c => {
    md += `**[${c.category}]** ${c.description}\n`;
    md += `- Impact: ${c.impact}\n`;
    md += `- Flexibility: ${c.flexibility}\n\n`;
  });

  md += `**Opportunities:**\n`;
  constraints.opportunities.forEach(o => md += `- ${o}\n`);
  md += `\n`;

  md += `### User Impact\n\n`;
  userImpact.users.forEach(u => {
    md += `**${u.persona}**\n`;
    md += `- Current: ${u.current_state}\n`;
    md += `- Future: ${u.future_state}\n`;
    md += `- Value: ${u.value}\n\n`;
  });

  md += `**Impact Summary:** ${userImpact.impact_summary}\n`;

  return md;
}

/**
 * Save ideation artifacts to project directory
 */
async function saveIdeation(projectSlug, brief, analysis, synthesis) {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  const projectDir = join(pluginData, 'projects', projectSlug);

  await mkdir(projectDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ideation-${timestamp}.md`;
  const filePath = join(projectDir, filename);

  const markdown = formatSynthesisMarkdown(brief, analysis, synthesis);
  await writeFile(filePath, markdown, 'utf-8');

  return filePath;
}

// ===== WORKFLOW EXECUTION (top-level script) =====

/**
 * Workflow API Globals
 *
 * The following globals are available in the workflow execution context:
 *
 * - `args`: Object containing workflow input arguments passed from the skill
 * - `agent(prompt, options)`: Spawn a subagent to execute a task. Options:
 *     - label: Short identifier for logging
 *     - schema: JSON schema for structured output validation
 *     - subagent_type: Agent type to use (e.g., 'general-purpose')
 * - `parallel(tasks)`: Execute array of functions concurrently, returns array of results
 * - `phase(title)`: Mark the start of a new workflow phase for progress tracking
 * - `log(message)`: Log a message to the workflow execution console
 */

const { brief } = args;
const projectSlug = args.projectSlug || args.brief.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);

if (!brief) {
  throw new Error('Required argument "brief" missing');
}

log('Loading context...');
const { globalMemory, projectContext } = await readProjectContext(projectSlug);

const contextPrompt = `
**Global Memory:**
${globalMemory || 'No global memory yet'}

**Project Context:**
${projectContext || 'No project context yet'}

**Design Brief:**
${brief}
`;

// Phase 1: Parallel Analysis
phase('Analyze');
log('Spawning parallel analysis subagents...');

const analysisResults = await parallel([
  // Assumption Challenger
  () => agent(`You are an assumption challenger. Your job is to identify unstated assumptions in this design brief and challenge them constructively.

${contextPrompt}

Review the brief and:
1. Identify 4-6 key assumptions being made
2. For each assumption:
   - State what we're assuming
   - Explain why it might be wrong
   - Suggest how to validate it
   - Describe the risk if we're wrong

3. List 3-5 critical questions we must answer before proceeding

Return ONLY valid JSON matching this schema:
${JSON.stringify(ASSUMPTION_SCHEMA, null, 2)}`, {
    label: 'assumptions',
    schema: ASSUMPTION_SCHEMA,
    subagent_type: 'general-purpose'
  }),

  // Constraint Mapper
  () => agent(`You are a constraint mapper. Your job is to identify technical, business, and team constraints that will shape this design.

${contextPrompt}

Analyze the brief and context to:
1. Identify 5-8 constraints across categories: technical, business, team, timeline, platform, policy
2. For each constraint:
   - Categorize it
   - Describe what it is
   - Explain how it limits the design
   - Mark flexibility: fixed (cannot change), negotiable (can discuss), preference (can ignore)

3. Identify 2-4 areas where we have freedom to explore

Return ONLY valid JSON matching this schema:
${JSON.stringify(CONSTRAINT_SCHEMA, null, 2)}`, {
    label: 'constraints',
    schema: CONSTRAINT_SCHEMA,
    subagent_type: 'general-purpose'
  }),

  // User Impact Analyzer
  () => agent(`You are a user impact analyzer. Your job is to identify who this affects and how it changes their workflow.

${contextPrompt}

Analyze the brief to:
1. Identify 2-4 user personas affected by this design
2. For each persona:
   - Describe who they are
   - Explain their current state (how they work today)
   - Describe the future state (how this changes their workflow)
   - Articulate the value this brings them

3. Write a 2-3 sentence impact summary covering overall user benefit

Return ONLY valid JSON matching this schema:
${JSON.stringify(USER_IMPACT_SCHEMA, null, 2)}`, {
    label: 'userImpact',
    schema: USER_IMPACT_SCHEMA,
    subagent_type: 'general-purpose'
  })
]);

// Guard against failed subagents
const assumptions = analysisResults[0];
const constraints = analysisResults[1];
const userImpact = analysisResults[2];

if (!assumptions || !constraints || !userImpact) {
  throw new Error('One or more analysis subagents failed. Cannot proceed.');
}

log('Analysis complete. Synthesizing findings...');

// Phase 2: Synthesis
phase('Synthesize');

const synthesis = await agent(`You are a synthesis agent. Your job is to integrate the analysis from three specialist agents into a coherent problem statement and concept directions.

**Original Brief:**
${brief}

**Assumptions Analysis:**
${JSON.stringify(assumptions, null, 2)}

**Constraints Analysis:**
${JSON.stringify(constraints, null, 2)}

**User Impact Analysis:**
${JSON.stringify(userImpact, null, 2)}

Your task:
1. Write a problem statement with:
   - What: What we are building (1 sentence)
   - Why: Why it matters (1-2 sentences, grounded in user impact)
   - For whom: Who it's for (1 sentence referencing personas)
   - Success looks like: How we'll know it worked (1-2 sentences, measurable)

2. Propose 2-3 concept directions:
   - Each concept should take a different strategic approach
   - Name: Short, memorable name for the concept
   - Approach: 2-3 sentences describing the concept
   - Strengths: 2-4 bullet points on what makes this strong
   - Trade-offs: 2-4 bullet points on what you give up
   - Recommendation: "recommended", "viable", or "not_recommended"

Consider:
- Fixed constraints must be respected in all concepts
- Negotiable constraints can be challenged in some concepts
- Address key assumptions and questions from the analysis
- Different concepts should explore different areas of flexibility

Return ONLY valid JSON matching this schema:
${JSON.stringify(SYNTHESIS_SCHEMA, null, 2)}`, {
  schema: SYNTHESIS_SCHEMA,
  subagent_type: 'general-purpose'
});

log('Synthesis complete. Saving artifacts...');

// Save artifacts
let savedPath = null;
if (projectSlug) {
  savedPath = await saveIdeation(projectSlug, brief, { assumptions, constraints, userImpact }, synthesis);
  log(`Saved to ${savedPath}`);
}

// Return structured results - spread synthesis into result
return {
  project_slug: projectSlug,
  saved_to: savedPath,
  ...synthesis
};
