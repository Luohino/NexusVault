# Coding Standards & Engineering Ethos

NexusVault is built for performance and bold aesthetics. All contributions must adhere to these standards to maintain the integrity of the anomaly.

## 1. Clean Code Principles
*   **Naming:** Use descriptive, semantic names. No `temp`, `data`, or `obj`.
*   **Functions:** Keep functions small and focused on a single responsibility.
*   **TypeScript:** No `any`. Define rigorous interfaces for all repository and user models.

## 2. Neo-Brutalist Technical Ethos
Our design is our code.
*   **Borders:** Use consistent 3px or 4px black borders for UI containers.
*   **Shadows:** Shadows must be hard, non-blurred, and use either `rgba(0,0,0,1)` or `rgba(220,38,38,1)`.
*   **Responsiveness:** Use grid and flexbox for layouts that adapt perfectly to the "Edge."

## 3. Performance Benchmarks
*   **Lighthouse:** Core pages should aim for a 90+ score in Performance and Accessibility.
*   **Hydration:** Minimize the use of heavy client-side libraries. Favor native browser APIs where possible.
*   **Images:** All assets must be optimized and served in WebP format.

## 4. Documentation
Every new feature must be documented in the [Wiki](WIKI) and, if it changes the API, in the [ARCHITECTURE.md](ARCHITECTURE.md) file.

**Cultivated by Luohino.**
