export const SDD_TOPIC_KEY_FORMAT = 'sdd/{change}/{artifact}';

export const FIRST_ACTION_INSTRUCTION =
  'FIRST ACTION REQUIRED: Call mem_session_summary with the content of the compacted summary. This preserves what was accomplished before compaction. Do this BEFORE any other work. Then call mem_context to recover additional context from previous sessions.';

export const SESSION_SUMMARY_TEMPLATE = `Use this exact structure for \`mem_session_summary\` content:

## Goal
[What we were working on this session]

## Instructions
[User preferences or constraints discovered during this session]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Accomplished
- [Completed items with key details]

## Next Steps
- [What remains to be done]

## Relevant Files
- path/to/file.ts - [what it does or what changed]`;

export function buildCompactionReminder(sessionID: string): string {
  return `FIRST ACTION REQUIRED: this session was compacted. Call \`mem_session_summary\` with the content of the compacted summary and \`session_id\` \`${sessionID}\`. This preserves what was accomplished before compaction. Do this BEFORE any other work. After that, call \`mem_capture_passive\` if the summary includes \`## Key Learnings:\`, and call \`mem_context\` if you need to restore recent memory.`;
}

export function buildCompactorInstruction(project: string): string {
  return `CRITICAL INSTRUCTION: place this at the TOP of the compacted summary exactly as an action item for the resumed agent: "FIRST ACTION REQUIRED: Call mem_session_summary with the content of this compacted summary. Use project: '${project}'. This preserves what was accomplished before compaction. Do this BEFORE any other work."`;
}

export function buildMemoryInstructions(
  sessionID: string,
  project: string,
): string {
  return `
<memory_protocol>
Persistent memory is available through thoth-mem. Follow this protocol.

IMPORTANT: Your current session_id is \`${sessionID}\` and project is \`${project}\`.
Always pass these values when calling memory tools that accept them (mem_session_summary, mem_save, mem_capture_passive, etc.).

WHEN TO SAVE
- Call \`mem_save\` IMMEDIATELY after bug fixes, architecture decisions, discoveries, config changes, reusable patterns, and user preferences.
- Use \`title\` as Verb + what changed or was learned.
- Use \`type\` from: bugfix | decision | architecture | discovery | pattern | config | learning | manual.
- Set \`scope\` intentionally.
- Reuse \`topic_key\` for the same evolving topic. Do not overwrite unrelated topics.
- If unsure about a stable \`topic_key\`, call \`mem_suggest_topic_key\` first.
- If you need to modify a known observation by exact ID, call \`mem_update\` instead of creating a new record.
- Put the durable details in \`content\` with this structure:
  - What: concise description of what changed or was learned
  - Why: why it mattered or what problem it solved
  - Where: files, paths, or systems involved
  - Learned: edge cases, caveats, or follow-up notes

WHEN TO SEARCH MEMORY
- If the user asks to recall prior work, call \`mem_context\` first, then \`mem_search\`, then \`mem_get_observation\` for exact records you need.
- Search proactively on the first message about a project, feature, or problem when prior context may matter.
- Search before starting work that may have been done before.
- Search when the user mentions a topic that lacks enough local context.

SESSION CLOSE PROTOCOL
- Before ending the session, call \`mem_session_summary\` with this exact template.
- This is NOT optional. If you skip this, the next session starts blind.
- Do not claim memory was saved unless the tool call succeeded.
- If your response includes \`## Key Learnings:\`, also call \`mem_capture_passive\`.

${SESSION_SUMMARY_TEMPLATE}

AFTER COMPACTION
- IMMEDIATELY call \`mem_session_summary\` with the compacted summary content.
- Then call \`mem_context\`.
- Only then continue working.

SDD topic_key convention:
- use ${SDD_TOPIC_KEY_FORMAT}
- examples: sdd/add-user-auth/spec, sdd/add-user-auth/design, sdd/add-user-auth/tasks
</memory_protocol>
`.trim();
}
