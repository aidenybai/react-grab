---
"react-grab": minor
---

Add a time-travel render-history plugin. React Grab now records what changed on every React commit (props and `useState`/`useReducer` state, resolved through bippy's commit instrumentation) into a bounded ring buffer. Selecting an element and choosing **History** (toolbar menu, right-click menu, or the `H` shortcut) opens a compact panel that scrubs that component's timeline: ←/→ (or the on-screen arrows) step back and forward through every recorded re-render, showing each `prev → next` change, and Enter/Copy hands the current moment to a coding agent.
