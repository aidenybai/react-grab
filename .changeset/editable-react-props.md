---
"react-grab": patch
---

Add React prop editing to the style panel. Selecting a component-backed element now surfaces its numeric props (including motion-style `animate`/`transition` values and three.js wrapper props like `count`/`speed`) as editable rows. Edits preview live via bippy's `overrideProps` and are included in the copied prompt, so animation and behavioral values can be tuned without leaving the browser. Numeric rows also gained a per-property step so fractional values such as opacity and duration tune precisely.
