---
"react-grab": patch
---

fix: prevent form submission during IME composition

When typing CJK (Chinese, Japanese, Korean) characters using IME, pressing Enter to confirm character selection no longer incorrectly submits the form. Added `event.isComposing` check to skip form submission during active IME composition.
