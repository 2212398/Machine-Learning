---
name: tdd
description: "Test-Driven Development (TDD) utility. Use this prompt to generate comprehensive unit tests for a given piece of code or to write tests before implementing a feature."
---

# Test-Driven Development (TDD) Prompt

Given the user's request, you will help them practice Test-Driven Development.

## Instructions
1. First, ask the user for the requirements of the function or component they want to build (if not already provided).
2. Generate the appropriate unit tests that cover the core functionality, edge cases, and failure modes.
3. The generated tests must initially fail (since the implementation does not exist yet).
4. Wait for the user to implement the code, or provide the implementation only after generating the tests and explaining what it should do.
5. Use modern testing frameworks appropriate for the project's language (e.g., Jest/Vitest for JS/TS, PyTest for Python, JUnit for Java, etc.).

Focus on testing *behavior*, not *implementation details*.
