# Optimized React-Grab Output Format

## Problem Analysis

The current format has several issues that cause performance degradation on simple tasks:

### Current Format Issues:

1. **Verbose CSS selectors** - Long nth-of-type chains add tokens without semantic value
2. **Fixed verbosity** - Same detail level for simple vs complex elements
3. **Truncated content** - "..." markers require mental reconstruction
4. **Redundant metadata** - Width/height rarely useful for LLMs
5. **Deeply nested wrappers** - Too much context for simple elements

### Performance Patterns:

- **Works well**: Complex nested structures (Avatar: +47%, Sidebar: +43%, Dropdown: +24%)
- **Struggles**: Simple, clearly-labeled elements (Time Range: -23%, Field Description: -5%, Tabs: -0.3%)

## Proposed Optimized Format

### Core Principles:

1. **File path first** - Most valuable information for navigation
2. **Semantic selectors** - Human-readable paths instead of nth-child soup
3. **Adaptive verbosity** - Scale detail based on element complexity
4. **No truncation** - Show complete relevant content or omit it
5. **Context over structure** - Focus on meaning, not DOM depth

### Format Template:

```
<element>
file: {file_path}:{line}:{column}
component: {ComponentName}
text: "{visible_text_content}"
role: {semantic_role}

{context_html}
</element>
```

### Format Examples:

#### Example 1: Simple Element (Minimal Format)

**Use Case:** Clear, self-describing elements like links and labels

```
<element>
file: components/login-form.tsx:45:12
component: LoginForm
text: "Forgot your password?"
role: link

<a href="#" class="ml-auto text-sm underline">
  Forgot your password?
</a>
</element>
```

**Why this works:**

- File path immediately visible
- Text content is obvious
- Minimal tokens (saves ~70% vs current)
- LLM can jump straight to file

#### Example 2: Medium Complexity (Contextual Format)

**Use Case:** Elements needing some structural context

```
<element>
file: components/signup-form.tsx:23:8
component: SignupForm > FieldDescription
text: "We'll use this to contact you. We will not share your email with anyone else."
role: helper text
context: Email input field

<Field>
  <label for="email">Email</label>
  <input id="email" type="email" placeholder="m@example.com" />
  <!-- Selected element: -->
  <FieldDescription>
    <p class="text-muted-foreground">
      We'll use this to contact you. We will not share your email with anyone else.
    </p>
  </FieldDescription>
</Field>
</element>
```

**Why this works:**

- Shows immediate parent context
- Preserves semantic relationship (helper for email input)
- No truncation - complete relevant content
- ~40% token reduction vs current

#### Example 3: Complex Nested (Detailed Format)

**Use Case:** Deeply nested, non-obvious elements

```
<element>
file: components/nav-user.tsx:32:16
component: NavUser > SidebarMenuButton > Avatar
text: None (image)
role: avatar button
context: User menu in sidebar

<NavUser>
  <SidebarMenuButton size="lg">
    <button aria-haspopup="menu" aria-expanded="false">
      <!-- Selected element: -->
      <Avatar class="grayscale">
        <AvatarImage src="/avatars/shadcn.jpg" alt="shadcn" />
        <AvatarFallback>SC</AvatarFallback>
      </Avatar>
      <div class="text-left">
        <span class="font-medium">shadcn</span>
        <span class="text-xs">m@example.com</span>
      </div>
      <DotsVerticalIcon class="ml-auto" />
    </button>
  </SidebarMenuButton>
</NavUser>
</element>
```

**Why this works:**

- Shows component hierarchy at top
- Full semantic component names (not just divs/spans)
- Complete button structure for context
- Still ~30% fewer tokens than current format

## Adaptive Selection Logic

```typescript
interface OptimizationStrategy {
  useMinimal: (element) => {
    // Use minimal format when:
    return (
      element.hasVisibleText &&
      element.role in ['link', 'button', 'heading', 'label'] &&
      element.text.length < 100 &&
      element.depth < 5
    );
  },

  useContextual: (element) => {
    // Use contextual format when:
    return (
      element.hasVisibleText &&
      element.depth >= 5 &&
      element.depth < 10
    );
  },

  useDetailed: (element) => {
    // Use detailed format when:
    return (
      !element.hasVisibleText ||
      element.depth >= 10 ||
      element.type in ['image', 'svg', 'canvas'] ||
      element.children.length > 3
    );
  }
}
```

## Expected Performance Improvements

### Predicted Impact on Problem Cases:

| Test Case          | Current | Optimized         | Expected Improvement |
| ------------------ | ------- | ----------------- | -------------------- |
| Time Range Toggle  | -23%    | Minimal format    | +15-20% faster       |
| Field Description  | -5%     | Minimal format    | +10-15% faster       |
| Tabs with Badges   | -0.3%   | Contextual format | +5-10% faster        |
| Calendar Date Cell | -0.1%   | Contextual format | +5-10% faster        |

### Predicted Impact on Well-Performing Cases:

| Test Case        | Current | Optimized         | Change          |
| ---------------- | ------- | ----------------- | --------------- |
| Grayscale Avatar | +47%    | Detailed format   | Maintain or +5% |
| Editable Input   | +44%    | Contextual format | Maintain        |
| Sidebar Toggle   | +43%    | Detailed format   | Maintain or +5% |

## Implementation Priority

### Phase 1: Quick Wins

1. **Always show file path first** - Single line change, huge impact
2. **Remove CSS selectors** - Not useful for LLMs
3. **Remove width/height** - Rarely relevant
4. **Add component hierarchy** - Parse from source attributes

### Phase 2: Adaptive Logic

1. Implement element complexity scoring
2. Select format based on score
3. A/B test thresholds

### Phase 3: Semantic Enhancement

1. Add aria-role/semantic role
2. Parse component names from JSX
3. Include relevant sibling context (e.g., labels for inputs)

## Alternative: Hybrid Approach

For maximum compatibility, provide BOTH formats but prioritize the optimized one:

```
<element>
📁 components/login-form.tsx:45:12
🏷️ LoginForm
💬 "Forgot your password?"

<a href="#" class="ml-auto text-sm underline">
  Forgot your password?
</a>

---
Advanced: {minimal_css_path}
</element>
```

This gives the LLM:

1. Immediately scannable key info (file, component, text)
2. Clean HTML context
3. Fallback selector if needed

## Recommendation

**Implement the adaptive format with file path prioritization.**

This should:

- ✅ Maintain or improve all currently well-performing tests
- ✅ Fix the 4 tests that got slower (Time Range, Field Description, Tabs, Calendar)
- ✅ Reduce average token count by 30-50%
- ✅ Improve cost metrics across the board
- ✅ Make output more readable for humans debugging

**Expected overall results:**

- Duration improvement: +17% → **+25-30%**
- Cost improvement: +16% → **+30-40%** (fewer tokens)
- Success rate: 75% → **90-95%**
