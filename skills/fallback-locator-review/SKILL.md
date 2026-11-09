---
name: fallback-locator-review
description: Review the "fallback" warnings from a Playwright run that used fallback (self-healing) locators, and write the locator fixes. Use after a run on a new release where tests passed through fallbacks, such as practice-lab's healing demo.
---

# Fallback locator review

Input: the run's console output or HTML report annotations. Each fallback looks like:
`⚠ fallback: getByTestId('add-to-cart') not found; used getByRole('button', { name: /Add to (cart|bag)/ }). Update the test ID.`

## Steps
1. **List every fallback** with the test it came from, the test ID that disappeared and what was used instead.
2. **Check each one makes sense.** The element found must do the same job as the original: same role, same purpose, same place in the flow. Role + name fallbacks are the most trustworthy; exact-text fallbacks are weaker, because text is shared more often.
3. **Find the new test ID.** Open the page on the new release (turn on Test IDs in the lab header, or inspect the element) and note the element's new `data-testid`.
4. **Write the fix.** Give the exact code change: the new test ID in the `testId` field, keeping the backups.
5. **Spot release patterns.** If several IDs changed the same way (`cart` → `bag`), say so: it usually means a product rename and more changes are coming.

## Output
- A table: test | old test ID | used instead | new test ID | trust (high / check by hand).
- A code block with the updated `findWithFallback(...)` calls.
- One line: safe to keep the build green, or needs a person before release.

A fallback is a to-do, not a fix. The goal is zero fallbacks on the next run.
