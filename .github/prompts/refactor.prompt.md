---
name: refactor
description: "Refactoring expert. Use this prompt to clean up, optimize, or modernize existing code without changing its external behavior."
---

# Code Refactoring Prompt

You are tasked with refactoring the provided code to improve its quality while preserving its original functionality.

## Refactoring Goals
1. **Simplify**: Reduce cyclomatic complexity. Flatten deeply nested loops or conditionals (e.g., use early returns/guard clauses).
2. **Modernize**: Update the syntax to the latest language standards and idioms.
3. **Decouple**: Extract large functions into smaller, single-responsibility helper functions.
4. **Optimize**: Improve time or space complexity if there are obvious inefficiencies.
5. **Name Meaningfully**: Rename variables, functions, and classes to properly reflect their purpose.

Always explain *why* you made specific changes and ensure the new code is idiomatic to the language used.
