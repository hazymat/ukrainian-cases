# Ukrainian Cases: House Style & Conventions

One page. If this grows past one page, cut it down, don't add a second.

## Audience & scope
- English L1 speakers, A1 level, learning Ukrainian noun cases one at a time.
- Each file is **self-contained**: assume the Nominative case only. Never assume another case has been studied, unless the file is an explicit "combo" review of specific named cases.
- Combo files come later, after their component single-case files exist.

## Language accuracy
- Ukrainian is a distinct language with its own norms. Where a word, ending, or rule looks similar to another Slavic language, always verify the Ukrainian form against a reputable modern Ukrainian source before using it. Never let another language's pattern leak in by assumption.
- All Ukrainian text must give the learner authentic, contemporary standard Ukrainian.

## Typography: hard rules
- **Never italicize Ukrainian (Cyrillic) text.** Italic Cyrillic renders certain letters (e.g. п, т, ш) in ways that are hard to recognize, especially for learners. Italics are fine for the **English** translation/gloss only.
- Display font: PT Sans, upright for Ukrainian, italic for English glosses/translations, muted color (`#9FB0CC`).
- Body/UI text: same PT Sans stack (`'PT Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`).
- No em dashes anywhere, in prose or in generated content. Use a semicolon, colon, comma, or a restructured sentence instead; whichever actually reads best for that sentence. (Genuine Ukrainian punctuation, like the dash marking an omitted "є", stays untouched: it's grammar, not a style tic.)

## Palette (dark theme, all files)
Background `#1B2A4A` · card `#24365C` · sub-card `#1E2F52` · input/chip `#233A63` · border `#37507F` · text `#F2EEE3` · muted `#9FB0CC` · gold accent `#D4A24C` · correct `#4C9A6A`/`#BFE8CE` · incorrect `#C4553F`/`#F2C6BA`.

## Page skeleton (every file)
`noscript` warning (WhatsApp/in-app-browser preview can't run JS) → sticky progress bar (answered/total, correct count, reset button) → hero (UK question words, EN gloss, H1, summary of triggers) → collapsible "Detailed notes" accordion with rule tables → practice sections → footer. Progress persists to `localStorage`, keyed uniquely per file (e.g. `uk_case_genitive_progress_v2`).

## Exercise taxonomy: reuse these, don't invent one-offs
1. **Usage recognition** (MC): why does this sentence need this case?
2. **Vocabulary + endings** (two-step MC): confirm meaning, then pick the correct case form; distractors are *other case forms of the same word*, never random words.
3. **Apply the case** (typed input, toggleable to MC): fill the blank; typed mode uses lenient normalization (case/apostrophe/whitespace insensitive).
4. **Revision** (click-the-word): three modes; find-the-target-word (one try), find-the-mistake (retry until correct), false-friends (an extra "none of these" chip for sentences that are actually Nominative). The trap must genuinely have no instance of the target case, and the explanation text must agree with the graded answer.

Keep all four types in every single-case file. Combo files may drop some, but should still include a real side-by-side comparison table, not just mixed questions.

## Content hygiene
- Every exercise item needs a plain-language `explain` string that names the rule, and it must actually match the graded answer.
- Trick/false-friend items must visually and logically signal what's being tested; don't silently drop the `<mark>` highlight pattern learners rely on.
- Don't recycle the exact same 10 words across a "mixed review"; use it to test transfer, not the same items twice.
- Never say "file" in learner-facing copy; say "page" or "set of exercises" instead. "File" is implementation detail.
- Every subpage gets a small "‹ All cases" link back to `index.html` at the top of the hero.

## Distribution
These files are shared as links to a hosted GitHub Pages site, not as raw `.html` attachments, since chat apps' in-file previews often can't run JavaScript. Keep the `noscript` fallback anyway, for anyone who does open the raw file.
