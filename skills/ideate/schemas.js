// JSON Schema definitions for ideate skill subagent outputs

export const ASSUMPTION_SCHEMA = {
  type: 'object',
  required: ['assumptions', 'questions'],
  properties: {
    assumptions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['assumption', 'challenge', 'validation_approach', 'risk_if_wrong'],
        properties: {
          assumption: { type: 'string', description: 'What we are assuming' },
          challenge: { type: 'string', description: 'Why it might be wrong' },
          validation_approach: { type: 'string', description: 'How to verify' },
          risk_if_wrong: { type: 'string', description: 'Impact if we are wrong' }
        }
      }
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Critical questions to answer before proceeding'
    }
  }
}

export const CONSTRAINT_SCHEMA = {
  type: 'object',
  required: ['constraints', 'opportunities'],
  properties: {
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'description', 'impact', 'flexibility'],
        properties: {
          category: {
            type: 'string',
            enum: ['technical', 'business', 'team', 'timeline', 'platform', 'policy'],
            description: 'Type of constraint'
          },
          description: { type: 'string', description: 'What the constraint is' },
          impact: { type: 'string', description: 'How it limits the design' },
          flexibility: {
            type: 'string',
            enum: ['fixed', 'negotiable', 'preference'],
            description: 'How strict this constraint is'
          }
        }
      }
    },
    opportunities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Areas where we have freedom to explore'
    }
  }
}

export const USER_IMPACT_SCHEMA = {
  type: 'object',
  required: ['users', 'impact_summary'],
  properties: {
    users: {
      type: 'array',
      items: {
        type: 'object',
        required: ['persona', 'current_state', 'future_state', 'value'],
        properties: {
          persona: { type: 'string', description: 'Who this user is' },
          current_state: { type: 'string', description: 'How they work today' },
          future_state: { type: 'string', description: 'How this changes their workflow' },
          value: { type: 'string', description: 'What value this brings them' }
        }
      }
    },
    impact_summary: { type: 'string', description: 'Overall impact in 2-3 sentences' }
  }
}

export const SYNTHESIS_SCHEMA = {
  type: 'object',
  required: ['problem_statement', 'concepts'],
  properties: {
    problem_statement: {
      type: 'object',
      required: ['what', 'why', 'for_whom', 'success_looks_like'],
      properties: {
        what: { type: 'string', description: 'What we are building' },
        why: { type: 'string', description: 'Why it matters' },
        for_whom: { type: 'string', description: 'Who it is for' },
        success_looks_like: { type: 'string', description: 'How we will know it worked' }
      }
    },
    concepts: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['name', 'approach', 'strengths', 'trade_offs', 'recommendation'],
        properties: {
          name: { type: 'string', description: 'Concept name' },
          approach: { type: 'string', description: '2-3 sentences describing the concept' },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            description: 'What makes this approach strong'
          },
          trade_offs: {
            type: 'array',
            items: { type: 'string' },
            description: 'What you give up with this approach'
          },
          recommendation: {
            type: 'string',
            enum: ['recommended', 'viable', 'not_recommended'],
            description: 'Your assessment'
          }
        }
      }
    }
  }
}
