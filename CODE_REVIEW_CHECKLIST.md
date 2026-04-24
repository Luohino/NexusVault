# Code Review Checklist

This checklist provides a rigorous standard for all code contributions to the NexusVault network. All "Sentinels" (reviewers) must verify these points before merging.

## 1. Engineering Rigor
- [ ] **Strict Typing:** No `any` types are permitted. All data structures must be explicitly typed via TypeScript interfaces or types.
- [ ] **Error Handling:** All asynchronous transmissions (fetch calls) must include `try/catch` blocks and user-facing error feedback.
- [ ] **Performance:** Frontend components must be optimized to prevent redundant re-renders. Avoid O(n^2) logic on the client side.

## 2. Security & Sovereignty
- [ ] **Sanitization:** All Markdown and user-generated content must be sanitized before rendering.
- [ ] **Authorization:** Verify that API endpoints are protected by Clerk authentication and Supabase RLS.
- [ ] **Secrets:** Ensure no API keys, credentials, or `.env` entries are committed to the repository.

## 3. Neo-Brutalist Aesthetic
- [ ] **Visual Consistency:** Borders are 3px or 4px black. Shadows are hard, non-blurred, and use the established palette.
- [ ] **Typography:** All headers and body text follow the [Style Guide](STYLE_GUIDE.md) specifications.
- [ ] **Animations:** Hover and active states are implemented using the established "Translate" method.

## 4. Documentation & Maintenance
- [ ] **Manual Update:** If the feature changes the user experience, [USER_MANUAL.md](USER_MANUAL.md) has been updated.
- [ ] **Change Log:** Significant changes are prepared for the next entry in [RELEASES.md](RELEASES.md).
- [ ] **Clean Code:** Comments are used to explain the "Why" of complex logic, not the "How."

**Quality Control by Luohino.**
