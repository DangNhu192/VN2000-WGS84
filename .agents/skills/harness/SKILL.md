---
name: harness
description: "Builds a harness. A meta-skill that defines Personas (Knowledge Items) and generates the skills they will use. Use this when (1) requested to 'build a harness', (2) 'design an architecture', (3) building an automated system for a new domain/project, (4) expanding an existing harness, (5) requested to 'audit harness' or 'sync agents', (6) requested to 'pull' a template from harness-100 catalog."
---

# Harness — Architecture & Skill Generator

A meta-skill that configures a harness for a domain/project, defines the Persona roles (as Knowledge Items), and creates the skills those Personas will use.

**Core Principles:**
1. Generates Persona Knowledge Items (`.agent/knowledge/`) and Skills (`.agent/skills/`).
2. **Hybrid Execution Architecture is the default.** 
   - Uses **Single-Agent Role Switching** (sequentially adopting Personas) for sequential tasks.
   - Uses **Subagent Spawning** (acting as a Supervisor) only for highly parallel tasks.
3. **Registers pointers in `GEMINI.md` and coordinates via `task.md`.**
4. **The Harness is not static; it evolves.** — Reflect user feedback after execution by updating KIs, skills, and the `task.md`.

## Workflow

### Phase 0: Template Puller & Project Setup (Catalog Integration)

1. **Pull Command**: If the user's request starts with `pull <template-id>` (e.g., `pull 01-youtube-production`):
   - Immediately run the `pull_template.sh` script located in `skills/harness/` with the given ID.
   - Example: `bash ~/.agent/skills/harness/pull_template.sh 01-youtube-production` (or local path if running locally).
   - Report success to the user and halt further execution. Do not generate a new harness.

2. **Project Kickoff via prompt.txt**: If the user's request mentions reading a file (e.g., `/harness read prompt.txt`):
   - Read the contents of `prompt.txt`.
   - Parse the `Domain`, `Scale`, and `Desc`.
   - Analyze the Domain to find the closest match among the 100 templates. If a close match exists, ask the user if they want to pull it. Otherwise, proceed to generate a custom harness architecture based on the Scale and Desc provided.

### Phase 1: State Audit

When the harness skill is triggered for generation, first check the existing harness state.

1. Read `.agent/knowledge/`, `.agent/skills/`, and `task.md`/`GEMINI.md`.
2. **ALWAYS** ensure the `_workspace/` directory is created (e.g. `mkdir -p _workspace`) to store all execution outputs.
3. Branch execution mode based on the state:
   - **New Setup**: No directories exist or they are empty → Run from Phase 1.
   - **Expansion**: Existing harness needs new Personas/skills → Selectively run phases to add without destroying existing context.
   - **Maintenance**: Audit or sync existing harness.

### Phase 2: Domain Analysis & Architecture Selection

1. Understand the domain/project from the user's request.
2. Identify core task types (generation, review, edit, analysis, etc.).
3. Analyze project codebase — tech stack, data models, core modules.
4. **Detect user proficiency** — Adjust communication tone based on context clues.
5. **Interactive Architecture Menu**: If the architectural pattern is not explicitly requested, you MUST pause and ask the user to select one:
   - Ask: "Which architecture pattern do you want for this project?"
   - Present options: [1. Pipeline, 2. Fan-out/Fan-in, 3. Producer-Reviewer, 4. Expert Pool, 5. Supervisor, 6. Hierarchical Delegation].
   - Also ask: "Please provide a short description of your project."
   - Halt execution and wait for the user's response before moving to Phase 3.

### Phase 3: Architecture Design (Hybrid Approach)

#### 3-1. Select Execution Mode

**Single-Agent Role Switching is the primary default.** 

| Mode | When to use | Characteristics |
|------|-------------|-----------------|
| **Single-Agent Role Switching** (Default) | Sequential dependent tasks (Pipeline, Producer-Reviewer). Context is shared inherently because it's the same agent switching Personas. | Generates a detailed `task.md` orchestrating when to load which `.agent/knowledge/` Persona. |
| **Explicit Subagents** (Alternative) | Parallel independent tasks (Fan-out/Fan-in) where subagents can run asynchronously without sharing intermediate state. | The Main Agent acts as a Supervisor and uses subagent tools to delegate. |

#### 3-2. Select Architecture Pattern

1. Decompose the task into specialized domains.
2. Choose a team structure:
   - **Pipeline**: Sequential dependent tasks (Role Switching).
   - **Fan-out/Fan-in**: Parallel independent tasks (Subagents).
   - **Expert Pool**: Context-dependent selective invocation (Role Switching).
   - **Producer-Reviewer**: Generation followed by quality review (Role Switching).
   - **Supervisor**: Central agent with dynamic task distribution (Subagents).
   - **Hierarchical Delegation**: Top-down recursive delegation.

### Phase 4: Persona Knowledge Generation

#### 4-0. Duplicate Check

Before creating a new Persona, check existing files in `.agent/knowledge/` to prevent overlap.

#### 4-1. Generate Persona Definitions

**Every Persona MUST be defined as a Knowledge Item in `.agent/knowledge/{name}_persona.md`.**
Do not hardcode roles directly into prompts.

Include essential sections in each Persona file:
Include exactly 5 essential sections in each Persona file:
1. **Role**: The core identity and purpose of this Persona.
2. **Constraints**: Critical rules and limitations (e.g., "NEVER write to DB directly"). **MUST INCLUDE**: "TUYỆT ĐỐI KHÔNG IN KẾT QUẢ RA KHUNG CHAT. Bạn BẮT BUỘC phải sử dụng công cụ ghi file (write_to_file / bash) để lưu các **tài liệu trung gian, bản nháp, và báo cáo phân tích** vào bên trong thư mục `_workspace/`. **Riêng source code cuối cùng (final output) phải được ghi vào đúng cấu trúc thư mục của dự án (ví dụ: src/, lib/...) chứ KHÔNG để trong _workspace/.**"
3. **Context Scope**: The specific directories/files this Persona is allowed to read/write.
4. **Available Skills**: The explicit list of skills this Persona is permitted to invoke. **MUST INCLUDE** `write_to_file` or `run_terminal_command`.
5. **Output Format**: The exact format and location of the deliverables this Persona must produce.

**For Fan-out/Fan-in architecture:**
- Automatically generate `supervisor_persona.md`: Defines the Supervisor role. Supervisor must only spawn subagents and wait for them to finish, without executing the tasks themselves.
- Automatically generate `architect_persona.md`: Defines the Fan-in Aggregator role. Architect reads multiple outputs from subagents and synthesizes a final report or feature.

### Phase 5: Skill Generation

Create custom skills in `.agent/skills/{skill_name}/`.

#### 5-1. Skill Structure

Each generated skill MUST contain exactly 2 core files:
```text
{skill_name}/
├── {skill_name}_manifest.md (Required) - Explains how the AI should use the skill, its parameters, and when to trigger it.
└── {skill_name}.py (or .js/.sh) (Required) - The executable script containing the actual logic.
```

#### 5-2. Description Writing — Be "Pushy"

The description is the sole trigger mechanism. Write it aggressively so it triggers when needed.

**Bad:** `"Skill for processing PDF docs"`
**Good:** `"Performs all PDF operations including reading, text extraction, merging, rotating, and OCR. If the user mentions a .pdf file or requests a PDF output, YOU MUST USE THIS SKILL."`

#### 5-3. Body Writing Principles

- **Explain Why:** Instead of just "ALWAYS/NEVER", explain the reasoning.
- **Keep it Lean:** Aim for <500 lines. Use `references/` for extra weight.
- **Generalize:** Don't overfit to specific examples.
- **Use Imperative Tone:** Use commands ("Do this", "Run that").

### Phase 6: Artifact Integration (task.md & GEMINI.md)

Unlike older systems, Antigravity orchestrates work via **Artifacts**. You must generate a `task.md` that serves as the state machine.

#### 6-1. Generate `task.md`

Create an `implementation_plan.md` first for approval, then a `task.md` outlining the exact sequence of steps.

**CRITICAL: Every `task.md` MUST start with a Workspace Context Check phase:**
```markdown
- `[ ]` **Phase 0: Workspace Context Check**
    - **Action:** Check if `_workspace/` directory exists.
    - **Condition 1:** If it exists AND user requested partial changes -> **Partial Rerun** (only spawn/load specific Agents to update).
    - **Condition 2:** If it exists AND user provided new input -> **New Run** (rename existing `_workspace/` to `_workspace_prev/` to preserve it, then create new `_workspace/`).
    - **Condition 3:** If it does NOT exist -> **Initial Run** (create `_workspace/`).
```

If using **Single-Agent Role Switching**, the `task.md` should have explicit checkboxes instructing the agent:
```markdown
- [ ] Phase 1: Load `.agent/knowledge/analyst_persona.md` and perform domain analysis.
- [ ] Phase 2: Load `.agent/knowledge/builder_persona.md` and write the code based on Phase 1 output.
```

If using **Explicit Subagents (Fan-out/Fan-in)**, the `task.md` must contain explicit `spawn` commands and a Barrier:
```markdown
- [ ] **Phase 1: Fan-out (Parallel Execution)**
    - **Action:** Act as Supervisor. Explicitly spawn subagents to execute tasks independently.
    - **Subagent 1:** [Task 1] -> Output: `_workspace/output_1.md`
    - **Subagent 2:** [Task 2] -> Output: `_workspace/output_2.md`
    - **Barrier:** Do NOT proceed until all subagents generate their output files.
- [ ] **Phase 2: Fan-in (Aggregation)**
    - **Action:** Drop Persona, load `.agent/knowledge/architect_persona.md`.
    - **Task:** Read all output files from `_workspace/` and synthesize the final result.
```

#### 6-2. Register Pointers in `GEMINI.md`

Update `GEMINI.md` (or the core KI) with a minimal pointer so the system knows this harness exists in future sessions.

```markdown
## Harness: {Domain Name}
**Goal:** {One line description}
**Trigger:** Use the `{orchestrator-skill-name}` when handling {Domain} tasks.
```

### Phase 7: Validation & Testing

Validate the generated harness.

1. **Structure Check**: Ensure all `.agent/knowledge/` and `.agent/skills/` files exist.
2. **Execution Mode Check**: Verify the `task.md` correctly outlines the Persona switching or subagent spawning.
3. **Dry-Run**: Review the `task.md` to ensure data passes logically from one phase to the next (e.g., files saved in `_workspace/` by the Producer are read by the Reviewer).

### Phase 8: Harness Evolution

After execution, always ask the user for feedback.
If the Reviewer Persona consistently finds the same flaws, update the Producer Persona's Knowledge Item to prevent them.
Log all changes in the `GEMINI.md` changelog.

## Deliverable Checklist

- [ ] `.agent/knowledge/` — Persona definition files created.
- [ ] `.agent/skills/` — Custom skills generated.
- [ ] `task.md` — The execution state machine is generated.
- [ ] Execution mode (Role Switching vs Subagents) is explicitly documented in `task.md`.
- [ ] Duplicates in knowledge and skills checked before generation.
- [ ] `GEMINI.md` updated with harness pointers and changelog.
