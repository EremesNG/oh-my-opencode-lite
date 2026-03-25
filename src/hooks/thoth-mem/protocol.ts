export const SDD_TOPIC_KEY_FORMAT = 'sdd/{change}/{artifact}';

export const FIRST_ACTION_INSTRUCTION =
  'FIRST ACTION REQUIRED: Call mem_session_summary before ending the session. If this session resumed after compaction, call mem_context immediately before continuing so you can recover durable project memory.';

export const MEMORY_INSTRUCTIONS = `
<memory_protocol>
Persistent memory is available through thoth-mem. Use it intentionally.

When to save memory:
- bugfixes
- decisions
- architecture changes
- discoveries
- reusable patterns
- configuration changes
- learnings and gotchas

Save format:
- What: concise description of what changed or was learned
- Why: why it mattered or what problem it solved
- Where: files, paths, or systems involved
- Learned: edge cases, caveats, or follow-up notes

When to search memory:
- at the start of ambiguous or resumed work
- before repeating prior investigation
- when a prior design decision or bugfix might matter

Session close protocol:
- before ending the session, call mem_session_summary with a concise Goal / Instructions / Discoveries / Accomplished / Relevant Files summary
- do not claim memory was saved unless the tool call succeeded

After compaction protocol:
- first recover durable context with mem_context before continuing work
- if there is no returned context, continue without inventing missing memory

SDD topic_key convention:
- use ${SDD_TOPIC_KEY_FORMAT}
- examples: sdd/create-omolite-plugin/spec, sdd/create-omolite-plugin/design, sdd/create-omolite-plugin/tasks
</memory_protocol>
`.trim();
