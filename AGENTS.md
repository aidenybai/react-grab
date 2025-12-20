- MUST: Use @antfu/ni. Use `ni` to install, `nr SCRIPT_NAME` to run. `nun` to uninstall.
- MUST: Use TypeScript interfaces over types.
- MUST: Keep all types in the global scope.
- MUST: Use arrow functions over function declarations
- MUST: Never comment unless absolutely necessary.
  - If the code is a hack (like a setTimeout or potentially confusing code), it must be prefixed with // HACK: reason for hack
- MUST: Use kebab-case for files
- MUST: Use descriptive names for variables (avoid shorthands, or 1-2 character names).
  - Example: for .map(), you can use `innerX` instead of `x`
  - Example: instead of `moved` use `didPositionChange`
- MUST: Frequently re-evaluate and refactor variable names to be more accurate and descriptive.
- MUST: Do not type cast ("as") unless absolutely necessary
- MUST: Remove unused code and don't repeat yourself.
- MUST: Always search the codebase, think of many solutions, then implement the most _elegant_ solution.
Copywriting
Active voice.
Instead of “The CLI will be installed,” say “Install the CLI.”
Headings & buttons use Title Case (Chicago). On marketing pages, use sentence case.
Be clear & concise. Use as few words as possible.
Prefer & over and.
Action-oriented language.
Instead of “You will need the CLI…” say “Install the CLI…”.
Keep nouns consistent. Introduce as few unique terms as possible.
Write in second person. Avoid first person.
Use consistent placeholders.
Strings: YOUR_API_TOKEN_HERE. Numbers: 0123456789.
Use numerals for counts.
Instead of “eight deployments” say “8 deployments”.
Consistent currency formatting. In any given context, display currency with either 0 or 2 decimal places, never mix both.
Separate numbers & units with a space.
Instead of 10MB say 10 MB.
Use a non-breaking space e.g., 10&nbsp;MB.
Default to positive language. Frame messages in an encouraging, problem-solving way, even for errors.
Instead of “Your deployment failed,” say “Something went wrong—try again or contact support.”
Error messages guide the exit. Don’t just state what went wrong—tell the user how to fix it.
Instead of “Invalid API key,” say “Your API key is incorrect or expired. Generate a new key in your account settings.” The copy & buttons/links should educate & give a clear action.
Avoid ambiguity. Labels are clear & specific.
Instead of the button label “Continue” say “Save API Key”.