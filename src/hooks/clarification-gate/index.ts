import {
  type ClarificationGateConfig,
  ClarificationGateConfigSchema,
} from '../../config';
import { LITE_INTERNAL_INITIATOR_MARKER } from '../../utils';

export const CLARIFICATION_GATE_TAG = 'clarification-gate';

const DEFAULT_EXPLICIT_KEYWORDS = [
  'brainstorm',
  'think through',
  'scope',
  'plan this',
  'design this',
  'proposal',
  'approach',
  'architecture',
  'requirements',
  'options',
  'trade-offs',
] as const;

const DEFAULT_PLANNING_KEYWORDS = [
  'feature',
  'implement',
  'build',
  'create',
  'add',
  'refactor',
  'restructure',
  'migrate',
  'redesign',
] as const;

interface MessageInfo {
  role: string;
  agent?: string;
  sessionID?: string;
}

interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

interface ScopeSignalMatch {
  label: string;
  matchedTerms: string[];
}

interface AmbiguityDetectionResult {
  explicitMatches: string[];
  planningMatches: string[];
  scopeSignals: ScopeSignalMatch[];
}

export interface CreateClarificationGateHookOptions {
  clarificationGate?: Partial<ClarificationGateConfig>;
}

function normalizeText(text: string): string {
  const collapsed = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return collapsed.length > 0 ? ` ${collapsed} ` : ' ';
}

function findMatchingTerms(text: string, terms: readonly string[]): string[] {
  const normalizedText = normalizeText(text);

  return terms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedText.includes(normalizedTerm);
  });
}

function findScopeSignal(
  text: string,
  label: string,
  terms: readonly string[],
): ScopeSignalMatch | null {
  const matchedTerms = findMatchingTerms(text, terms);

  if (matchedTerms.length === 0) {
    return null;
  }

  return {
    label,
    matchedTerms,
  };
}

function findLayerSignal(text: string): ScopeSignalMatch | null {
  const leftTerms = ['ui', 'frontend', 'client'] as const;
  const rightTerms = ['backend', 'server', 'database'] as const;
  const matchedLeft = findMatchingTerms(text, leftTerms);
  const matchedRight = findMatchingTerms(text, rightTerms);

  if (matchedLeft.length === 0 || matchedRight.length === 0) {
    return null;
  }

  return {
    label: 'scope signal — multiple layers',
    matchedTerms: [`${matchedLeft[0]} + ${matchedRight[0]}`],
  };
}

function detectAmbiguity(
  text: string,
  explicitKeywords: readonly string[],
  planningKeywords: readonly string[],
): AmbiguityDetectionResult {
  const explicitMatches = findMatchingTerms(text, explicitKeywords);
  const planningMatches = findMatchingTerms(text, planningKeywords);
  const scopeSignals = [
    findScopeSignal(text, 'scope signal — multiple views/pages', [
      'page',
      'screen',
      'flow',
      'wizard',
      'dashboard',
      'onboarding',
      'settings',
      'checkout',
      'step',
      'journey',
    ]),
    findScopeSignal(text, 'scope signal — api/data', [
      'api',
      'endpoint',
      'route',
      'mutation',
      'query',
      'schema',
      'table',
      'model',
      'migration',
      'database',
    ]),
    findScopeSignal(text, 'scope signal — restructuring', [
      'refactor',
      'restructure',
      'replace',
      'redesign',
      'rework',
      'consolidate',
      'split',
      'migrate',
    ]),
    findLayerSignal(text),
    findScopeSignal(text, 'scope signal — business/ux phrasing', [
      'users should',
      'support',
      'allow',
      'improve experience',
      'pricing',
      'onboarding',
      'billing',
      'permissions',
    ]),
    findScopeSignal(text, 'scope signal — ambiguous/open-ended', [
      'help me think',
      'best way',
      'how should',
      "what's the right approach",
      'explore',
      'maybe',
      'not sure',
    ]),
    findScopeSignal(text, 'scope signal — cross-directory', [
      'across the app',
      'across the system',
      'multiple files',
      'several components',
    ]),
  ].filter((signal): signal is ScopeSignalMatch => signal !== null);

  return {
    explicitMatches,
    planningMatches,
    scopeSignals,
  };
}

function shouldInjectClarificationGate(
  config: ClarificationGateConfig,
  detection: AmbiguityDetectionResult,
): boolean {
  const explicitMatched = detection.explicitMatches.length > 0;
  const planningMatched = detection.planningMatches.length > 0;
  const scopeSignalCount = detection.scopeSignals.length;

  switch (config.mode) {
    case 'off':
      return false;
    case 'explicit-only':
      return explicitMatched;
    case 'auto':
      return explicitMatched || scopeSignalCount >= config.min_scope_signals;
    case 'auto-for-planning':
      return (
        explicitMatched ||
        (planningMatched && scopeSignalCount >= 1) ||
        scopeSignalCount >= config.hard_complex_signal_threshold
      );
  }
}

function buildMatchedSignals(
  detection: AmbiguityDetectionResult,
  config: ClarificationGateConfig,
): string[] {
  const matchedSignals: string[] = [];

  if (detection.explicitMatches.length > 0) {
    matchedSignals.push(
      `explicit keywords: ${detection.explicitMatches.join(', ')}`,
    );
  }

  if (detection.planningMatches.length > 0) {
    matchedSignals.push(
      `planning keywords: ${detection.planningMatches.join(', ')}`,
    );
  }

  for (const signal of detection.scopeSignals) {
    matchedSignals.push(`${signal.label}: ${signal.matchedTerms.join(', ')}`);
  }

  if (matchedSignals.length === 0) {
    matchedSignals.push(
      `configured threshold allows injection (mode=${config.mode})`,
    );
  }

  return matchedSignals;
}

function buildClarificationGateBlock(
  detection: AmbiguityDetectionResult,
  config: ClarificationGateConfig,
): string {
  const matchedSignals = buildMatchedSignals(detection, config)
    .map((signal) => `- ${signal}`)
    .join('\n');

  return `<${CLARIFICATION_GATE_TAG}>
Potentially ambiguous or substantial request detected.

Matched signals:
${matchedSignals}

Load the brainstorming skill and follow its workflow before implementing.
Ask one clarifying question at a time, max 5 total, prefer multiple choice.
Assess scope using the seven scope signals.
Propose 2-3 approaches with trade-offs and a recommendation.
Wait for explicit user approval before implementation or SDD handoff.

Do not implement during brainstorming.
</${CLARIFICATION_GATE_TAG}>`;
}

/**
 * Creates the experimental.chat.messages.transform hook for clarification gate injection.
 * This hook runs right before sending to API, so it doesn't affect UI display.
 * Only injects for the orchestrator agent.
 */
export function createClarificationGateHook(
  options: CreateClarificationGateHookOptions = {},
) {
  const config = ClarificationGateConfigSchema.parse(
    options.clarificationGate ?? {},
  );
  const explicitKeywords = config.explicit_keywords ?? [
    ...DEFAULT_EXPLICIT_KEYWORDS,
  ];
  const planningKeywords = config.planning_keywords ?? [
    ...DEFAULT_PLANNING_KEYWORDS,
  ];

  return {
    'experimental.chat.messages.transform': async (
      _input: Record<string, never>,
      output: { messages: MessageWithParts[] },
    ): Promise<void> => {
      const { messages } = output;

      if (messages.length === 0) {
        return;
      }

      // Find the last user message
      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].info.role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }

      if (lastUserMessageIndex === -1) {
        return;
      }

      const lastUserMessage = messages[lastUserMessageIndex];

      // Only inject for orchestrator (or if no agent specified = main session)
      const agent = lastUserMessage.info.agent;
      if (agent && agent !== 'orchestrator') {
        return;
      }

      // Find the first text part
      const textPartIndex = lastUserMessage.parts.findIndex(
        (p) => p.type === 'text' && p.text !== undefined,
      );

      if (textPartIndex === -1) {
        return;
      }

      const originalText = lastUserMessage.parts[textPartIndex].text ?? '';
      if (originalText.includes(LITE_INTERNAL_INITIATOR_MARKER)) {
        return;
      }

      const detection = detectAmbiguity(
        originalText,
        explicitKeywords,
        planningKeywords,
      );
      if (!shouldInjectClarificationGate(config, detection)) {
        return;
      }

      const clarificationGateBlock = buildClarificationGateBlock(
        detection,
        config,
      );

      // Prepend the reminder to the existing text
      lastUserMessage.parts[textPartIndex].text =
        `${clarificationGateBlock}\n\n---\n\n${originalText}`;
    },
  };
}
