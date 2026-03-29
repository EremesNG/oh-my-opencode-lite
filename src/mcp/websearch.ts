import type { RemoteMcpConfig } from './types';

/**
 * Exa AI web search - real-time web search
 * @see https://exa.ai/docs/reference/exa-mcp
 */
const baseUrl = 'https://mcp.exa.ai/mcp?tools=web_search_exa';
const url = process.env.EXA_API_KEY
  ? `${baseUrl}&exaApiKey=${process.env.EXA_API_KEY}`
  : baseUrl;

export const websearch: RemoteMcpConfig = {
  type: 'remote',
  url,
  oauth: false,
};
