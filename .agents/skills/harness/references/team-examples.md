# Harness Team Examples (Antigravity Hybrid)

Here are examples of how Antigravity manages different architectures.

## 1. Website Development (Pipeline)
**Goal:** Build a React website from scratch.
**Execution Mode:** Single-Agent Role Switching.

**task.md Flow:**
1. `analyst_persona.md` extracts requirements.
2. `designer_persona.md` creates a UI mockup plan.
3. `coder_persona.md` writes the React components.
4. `qa_persona.md` runs UI tests.

## 2. Research & Report (Fan-out / Fan-in)
**Goal:** Research 3 competitors simultaneously and write a combined report.
**Execution Mode:** Subagent Spawning (Parallel).

**task.md Flow:**
1. Main Agent spawns Subagent A to research Competitor 1.
2. Main Agent spawns Subagent B to research Competitor 2.
3. Main Agent spawns Subagent C to research Competitor 3.
4. Main Agent waits for tasks to finish.
5. Load `editor_persona.md` to combine all 3 reports into a final document.

## 3. Persistent Refactoring (Producer-Reviewer)
**Goal:** Refactor a legacy codebase incrementally.
**Execution Mode:** Single-Agent Role Switching.

**task.md Flow:**
1. `refactor_persona.md` refactors `module_a.py`.
2. `qa_persona.md` runs `pytest`. If it fails, loops back to step 1.
3. `refactor_persona.md` refactors `module_b.py`.
4. `qa_persona.md` runs `pytest`.
