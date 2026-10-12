# Orchestrator Template: task.md

Antigravity uses `task.md` as its orchestration engine. When building a Harness, generate a `task.md` that guides the Main Agent through the execution using one of the 6 architectural patterns.

## 0. Workspace Context Check (REQUIRED FOR ALL PATTERNS)
```markdown
- `[ ]` **Phase 0: Workspace Context Check**
    - **Action:** Check if `_workspace/` directory exists.
    - **Condition 1:** If exists AND user requested partial changes -> **Partial Rerun** (only invoke specific Agents).
    - **Condition 2:** If exists AND user provided new input -> **New Run** (rename `_workspace/` to `_workspace_prev/`, then `mkdir _workspace`).
    - **Condition 3:** If does NOT exist -> **Initial Run** (`mkdir -p _workspace`).
```

## 1. Producer-Reviewer (Sequential Loop)
```markdown
- `[ ]` **Phase 1: Generation**
    - **Action:** Load `.agent/knowledge/coder_persona.md`.
    - **Task:** Read requirements and generate code.
    - **Output:** Save code to workspace.
- `[ ]` **Phase 2: Review**
    - **Action:** Drop Persona, load `.agent/knowledge/qa_persona.md`.
    - **Task:** Review code against constraints.
    - **Output:** If failed, loop back to Phase 1. If passed, proceed.
```

## 2. Fan-out / Fan-in (Parallel Execution)
```markdown
- `[ ]` **Phase 1: Fan-out**
    - **Action:** Act as Supervisor (`.agent/knowledge/supervisor_persona.md`). Explicitly spawn subagents.
    - **Subagent 1:** [Task 1] -> Output: `_workspace/out1.md`
    - **Subagent 2:** [Task 2] -> Output: `_workspace/out2.md`
    - **Barrier:** Wait for all subagents to finish.
- `[ ]` **Phase 2: Fan-in**
    - **Action:** Drop Persona, load `.agent/knowledge/architect_persona.md`.
    - **Task:** Synthesize outputs into final result.
```

## 3. Pipeline (One-Way Sequential)
```markdown
- `[ ]` **Phase 1: Extraction**
    - **Action:** Load `.agent/knowledge/extractor_persona.md`.
    - **Output:** `_workspace/raw_data.json`
- `[ ]` **Phase 2: Transformation**
    - **Action:** Drop Persona, load `.agent/knowledge/transformer_persona.md`.
    - **Output:** `_workspace/clean_data.json`
- `[ ]` **Phase 3: Loading**
    - **Action:** Drop Persona, load `.agent/knowledge/loader_persona.md`.
    - **Output:** Final commit/save.
```

## 4. Expert Pool (Context-Dependent Routing)
```markdown
- `[ ]` **Phase 1: Routing**
    - **Action:** Load `.agent/knowledge/router_persona.md`.
    - **Task:** Analyze request and determine the right expert.
    - **Output:** `_workspace/route.txt`
- `[ ]` **Phase 2: Expert Execution**
    - **Action:** Read route, load the corresponding Expert Persona (`expertA_persona.md` or `expertB_persona.md`).
    - **Output:** Expert result.
```

## 5. Supervisor (Dynamic Delegation)
```markdown
- `[ ]` **Phase 1: Continuous Delegation**
    - **Action:** Act as Supervisor (`.agent/knowledge/supervisor_persona.md`).
    - **Task:** Break down incoming tasks dynamically. Spawn Subagent for each subtask.
    - **Barrier:** Wait for Subagent reports.
    - **Loop:** Repeat until the global goal is met.
```

## 6. Hierarchical Delegation (Tree Structure)
```markdown
- `[ ]` **Phase 1: Top-Level Direction**
    - **Action:** Act as Director. Spawn Manager subagent for Feature A, and Manager subagent for Feature B.
- `[ ]` **Phase 2: Mid-Level Execution (Subagent level)**
    - **Action:** Manager subagent spawns Worker subagents to do the coding.
    - **Barrier:** Director waits for Managers to finish.
```

## Error Handling
If a phase fails (e.g., QA rejects), the Agent should:
1. Log the failure reason in `task.md`.
2. Re-load the Producer Persona.
3. Attempt fix.
4. If it fails 3 times, halt and ask the USER for help.
