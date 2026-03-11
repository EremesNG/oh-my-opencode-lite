# Antigravity Setup Guide

## Quick Setup

1. Install with Antigravity support:
   ```bash
   bunx oh-my-opencode-lite install --antigravity=yes
   ```

2. Authenticate:
   ```bash
   opencode auth login
   # Select "google" provider
   ```

3. Start using:
   ```bash
   opencode
   ```

## How It Works

The installer automatically:
- Adds `opencode-antigravity-auth@latest` plugin
- Configures Google provider with all Antigravity and Gemini CLI models
- Sets up Antigravity-focused agent mapping presets

## Models Available

### Antigravity Models (via Google Infrastructure)

1. **antigravity-gemini-3.1-pro**
   - Name: Gemini 3.1 Pro (Antigravity)
   - Context: 1M tokens, Output: 65K tokens
   - Variants: low, high thinking levels
   - Best for: Complex reasoning, high-quality outputs

2. **antigravity-gemini-3-flash**
   - Name: Gemini 3 Flash (Antigravity)
   - Context: 1M tokens, Output: 65K tokens
   - Variants: minimal, low, medium, high thinking levels
   - Best for: Fast responses, efficient agent tasks

3. **antigravity-claude-sonnet-4-5**
   - Name: Claude Sonnet 4.5 (Antigravity)
   - Context: 200K tokens, Output: 64K tokens
   - Best for: Balanced performance

4. **antigravity-claude-sonnet-4-5-thinking**
   - Name: Claude Sonnet 4.5 Thinking (Antigravity)
   - Context: 200K tokens, Output: 64K tokens
   - Variants: low (8K budget), max (32K budget)
   - Best for: Deep reasoning tasks

5. **antigravity-claude-opus-4-5-thinking**
   - Name: Claude Opus 4.5 Thinking (Antigravity)
   - Context: 200K tokens, Output: 64K tokens
   - Variants: low (8K budget), max (32K budget)
   - Best for: Most complex reasoning

### Gemini CLI Models (Fallback)

6. **gemini-2.5-flash**
   - Name: Gemini 2.5 Flash (Gemini CLI)
   - Context: 1M tokens, Output: 65K tokens
   - Requires: Gemini CLI authentication

7. **gemini-2.5-pro**
   - Name: Gemini 2.5 Pro (Gemini CLI)
   - Context: 1M tokens, Output: 65K tokens
   - Requires: Gemini CLI authentication

8. **gemini-3-flash-preview**
   - Name: Gemini 3 Flash Preview (Gemini CLI)
   - Context: 1M tokens, Output: 65K tokens
   - Requires: Gemini CLI authentication

9. **gemini-3.1-pro-preview**
   - Name: Gemini 3.1 Pro Preview (Gemini CLI)
   - Context: 1M tokens, Output: 65K tokens
   - Requires: Gemini CLI authentication

## Agent Configuration

When you install with `--antigravity=yes`, the preset depends on other providers:

### antigravity-mixed-both (Kimi + OpenAI + Antigravity)
- **Engineer**: Kimi k2p5
- **Oracle**: OpenAI model
- **Explorer**: Gemini 3 Flash (Antigravity)
- **Librarian/Designer**: Chutes models when Chutes is enabled; otherwise Gemini 3 Flash (Antigravity)
- **Quick/Deep**: OpenAI defaults

### antigravity-mixed-kimi (Kimi + Antigravity)
- **Engineer**: Kimi k2p5
- **Oracle**: Gemini 3.1 Pro (Antigravity)
- **Explorer**: Gemini 3 Flash (Antigravity)
- **Librarian/Designer**: Chutes models when Chutes is enabled; otherwise Gemini 3 Flash (Antigravity)
- **Quick/Deep**: Chutes defaults when Chutes is enabled; otherwise Antigravity defaults

### antigravity-mixed-openai (OpenAI + Antigravity)
- **Engineer**: Chutes primary model when Chutes is enabled; otherwise Gemini 3 Flash (Antigravity)
- **Oracle**: OpenAI model
- **Explorer**: Gemini 3 Flash (Antigravity)
- **Librarian/Designer**: Chutes models when Chutes is enabled; otherwise Gemini 3 Flash (Antigravity)
- **Quick/Deep**: OpenAI defaults

### antigravity (Pure Antigravity)
- **Engineer**: Gemini 3 Flash (Antigravity)
- **Oracle**: Gemini 3.1 Pro (Antigravity)
- **Explorer/Librarian/Designer**: Gemini 3 Flash (Antigravity)
- **Quick/Deep**: Antigravity defaults

> If OpenCode free mode is enabled, support agents may be reassigned to selected free `opencode/*` models (`explorer`, `librarian`, `quick`, `deep`) while `designer` remains on external mapping.

## Manual Configuration

If you prefer to configure manually, edit `~/.config/opencode/omolite.json` (or `.jsonc`) and add a pure Antigravity preset:

```json
{
  "preset": "antigravity",
  "presets": {
    "antigravity": {
      "engineer": {
        "model": "google/antigravity-gemini-3-flash",
        "skills": ["*"],
        "mcps": ["websearch"]
      },
      "oracle": {
        "model": "google/antigravity-gemini-3.1-pro",
        "skills": [],
        "mcps": []
      },
      "explorer": {
        "model": "google/antigravity-gemini-3-flash",
        "variant": "low",
        "skills": [],
        "mcps": []
      },
      "librarian": {
        "model": "google/antigravity-gemini-3-flash",
        "variant": "low",
        "skills": [],
        "mcps": ["websearch", "context7", "grep_app"]
      },
      "designer": {
        "model": "google/antigravity-gemini-3-flash",
        "variant": "medium",
        "skills": ["agent-browser"],
        "mcps": []
      },
      "quick": {
        "model": "google/antigravity-gemini-3-flash",
        "variant": "low",
        "skills": [],
        "mcps": []
      },
      "deep": {
        "model": "google/antigravity-gemini-3.1-pro",
        "skills": [],
        "mcps": []
      }
    }
  }
}
```

## Troubleshooting

### Authentication Failed
```bash
# Ensure Antigravity service is running
# Check service status
curl http://127.0.0.1:8317/health

# Re-authenticate
opencode auth login
```

### Models Not Available
```bash
# Verify plugin is installed
cat ~/.config/opencode/opencode.json | grep antigravity

# Reinstall plugin
bunx oh-my-opencode-lite install --antigravity=yes --no-tui --kimi=no --openai=no --tmux=no --skills=no
```

### Wrong Model Selected
```bash
# Check current preset
echo $OMOLITE_PRESET

# Change preset
export OMOLITE_PRESET=antigravity
opencode
```

### Service Connection Issues
```bash
# Check if Antigravity service is running on correct port
lsof -i :8317

# Restart the service
# (Follow your Antigravity/LLM-Mux restart procedure)
# Or edit ~/.config/opencode/omolite.json (or .jsonc)
# Change the "preset" field and restart OpenCode
```

## Notes

- **Terms of Service**: Using Antigravity may violate Google's ToS. Use at your own risk.
- **Performance**: Antigravity models typically have lower latency than direct API calls
- **Fallback**: Gemini CLI models require separate authentication but work as fallback
- **Customization**: You can mix and match any models across agents by editing the config
