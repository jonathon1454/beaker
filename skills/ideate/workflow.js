import { Agent } from '@anthropic-ai/agent-toolkit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  ASSUMPTION_SCHEMA,
  CONSTRAINT_SCHEMA,
  USER_IMPACT_SCHEMA,
  SYNTHESIS_SCHEMA
} from './schemas.js';

const meta = {
  name: 'ideate',
  description: 'Parallel ideation workflow: challenge assumptions, map constraints, analyze user impact, synthesize concepts',
  phases: ['context_loading', 'parallel_analysis', 'synthesis', 'artifact_save']
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
 * Save ideation artifacts to project directory
 */
async function saveIdeation(projectSlug, synthesis) {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  const projectDir = join(pluginData, 'projects', projectSlug);

  // Create project directory if needed
  const { mkdir, writeFile } = await import('fs/promises');
  await mkdir(projectDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `ideation-${timestamp}.json`;

  await writeFile(
    join(projectDir, filename),
    JSON.stringify(synthesis, null, 2),
    'utf-8'
  );

  return filename;
}

/**
 * Main workflow execution
 */
export async function execute(args) {
  const { brief, projectSlug } = args;

  if (!brief) {
    throw new Error('Required argument "brief" missing');
  }

  // Phase 1: Load context
  const { globalMemory, projectContext } = await readProjectContext(projectSlug);

  const contextPrompt = `
**Global Memory:**
${globalMemory || 'No global memory yet'}

**Project Context:**
${projectContext || 'No project context yet'}

**Design Brief:**
${brief}
`;

  // Phase 2: Spawn parallel analysis subagents
  const [assumptionsResult, constraintsResult, userImpactResult] = await Promise.all([
    // Assumption Challenger
    Agent({
      description: 'Challenge assumptions',
      prompt: `You are an assumption challenger. Your job is to identify unstated assumptions in this design brief and challenge them constructively.

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
${JSON.stringify(ASSUMPTION_SCHEMA, null, 2)}`,
      model: 'sonnet'
    }),

    // Constraint Mapper
    Agent({
      description: 'Map constraints',
      prompt: `You are a constraint mapper. Your job is to identify technical, business, and team constraints that will shape this design.

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
${JSON.stringify(CONSTRAINT_SCHEMA, null, 2)}`,
      model: 'sonnet'
    }),

    // User Impact Analyzer
    Agent({
      description: 'Analyze user impact',
      prompt: `You are a user impact analyzer. Your job is to identify who this affects and how it changes their workflow.

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
${JSON.stringify(USER_IMPACT_SCHEMA, null, 2)}`,
      model: 'sonnet'
    })
  ]);

  // Parse subagent outputs
  const assumptions = JSON.parse(assumptionsResult);
  const constraints = JSON.parse(constraintsResult);
  const userImpact = JSON.parse(userImpactResult);

  // Phase 3: Synthesis
  const synthesisResult = await Agent({
    description: 'Synthesize findings',
    prompt: `You are a synthesis agent. Your job is to integrate the analysis from three specialist agents into a coherent problem statement and concept directions.

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
${JSON.stringify(SYNTHESIS_SCHEMA, null, 2)}`,
    model: 'sonnet'
  });

  const synthesis = JSON.parse(synthesisResult);

  // Phase 4: Save artifacts
  let savedFile = null;
  if (projectSlug) {
    savedFile = await saveIdeation(projectSlug, {
      brief,
      analysis: { assumptions, constraints, userImpact },
      synthesis,
      timestamp: new Date().toISOString()
    });
  }

  // Return structured results
  return {
    meta,
    problem_statement: synthesis.problem_statement,
    concepts: synthesis.concepts,
    analysis: {
      assumptions: assumptions.assumptions,
      key_questions: assumptions.questions,
      constraints: constraints.constraints,
      opportunities: constraints.opportunities,
      users: userImpact.users,
      impact_summary: userImpact.impact_summary
    },
    artifacts: {
      saved_to: savedFile ? `${projectSlug}/${savedFile}` : null
    }
  };
}
