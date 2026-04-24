# Neo-Brutalist Style Guide

NexusVault is defined by its bold, high-contrast, and technically raw aesthetic. This guide ensures that all UI contributions maintain the integrity of the design system.

## 1. The Palette (Signals)
*   **Background (Void):** `#000000` (Black)
*   **Foreground (Paper):** `#ffffff` (White)
*   **Primary Signal (Anomaly):** `#dc2626` (Red-600)
*   **Neutral Signal:** `#71717a` (Zinc-500)

## 2. Borders & Structure
*   **Width:** All primary containers must have a `3px` or `4px` black border.
*   **Radius:** Sharp corners only (`0px`). Rounded corners are prohibited in the core anomaly.
*   **Layout:** Use CSS Grid with 12-column systems or Flexbox for simpler alignments.

## 3. The Shadow (Hard Shadows)
*   **Logic:** Shadows must be hard (non-blurred) and solid.
*   **Standard:** `8px 8px 0px 0px rgba(0,0,0,1)` (Black)
*   **Alert:** `8px 8px 0px 0px rgba(220,38,38,1)` (Red)

## 4. Typography
*   **Headers:** `Outfit-Bold` or `Inter-Black`. All-caps for Level 1 and Level 2 headers.
*   **Body:** `Inter-Bold` or `Outfit-Medium`.
*   **Code:** `JetBrains Mono` or `Fira Code`.

## 5. Micro-Animations
*   **Hover:** Buttons should translate `-2px -2px` and increase their shadow size.
*   **Active:** On click, elements should translate `2px 2px` and remove their shadow to simulate a physical "press."

**Design Architect:** Luohino
