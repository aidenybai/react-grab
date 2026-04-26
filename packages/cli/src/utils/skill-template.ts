export const SKILL_TEMPLATE = `---
name: react-grab
description: >-
  Use when the user invokes /react-grab or refers to "this", "that", or
  "the thing/element/component I just clicked/grabbed". If toolbar output
  is already pasted in the chat, use it directly - do NOT run this skill
  (it would block waiting for clipboard data that never arrives).
allowed-tools:
  - Bash
---

# React Grab

## Preflight

Run **once** before the loop:

\`\`\`bash
npx -y @react-grab/cli check-installed
\`\`\`

Exit 0 → installed, continue. Exit 1 → not installed; ask the user "React Grab isn't in this project — want me to run \`npx grab@latest init\` to set it up?" and only proceed once they confirm and \`init\` finishes.

## Loop

Repeat until the user says they're done.

1. **Prompt.** "Click an element in the React Grab toolbar (or paste its output here) and I'll pick it up." Don't start step 2 silently.
2. **Watch.** Once per iteration:
   \`\`\`bash
   npx -y @react-grab/cli watch
   \`\`\`
   Stdout is authoritative. If it contains a \`Prompt:\` line, that's the user's instruction.
3. **Ask** what to do — skip if stdout already has a \`Prompt:\` line.
4. **Do it** against the captured context only.
5. **Offer another:** "Grab another, or done?" Yes → step 1. No → end.

## Failure modes (surface stderr verbatim)

- Exit 1 timeout → user didn't click; re-prompt, don't auto-retry.
- Exit 2 SSH → run agent on same machine as browser.
- Linux/WSL clipboard hint → pass install/interop instructions through.

## Constraints

- One \`watch\` per iteration, never concurrent.
- Never fabricate element details. \`watch\` failed? Ask, don't guess.
- Step 1 always before step 2.
- Finish step 4 before step 2 again.
`;
