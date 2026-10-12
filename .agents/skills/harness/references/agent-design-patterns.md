# Antigravity Architecture Design Patterns

Antigravity operates effectively with a Hybrid Architecture that blends Single-Agent Role Switching and Explicit Subagents. 
The appropriate pattern dictates how `task.md` is structured.

## Execution Modes

| Mode | Trigger Condition | How it works |
|------|-------------------|--------------|
| **Single-Agent Role Switching** (Default) | Sequential dependency. Output of step N is input of step N+1. | Main Agent loads Persona A from `.agent/knowledge/A.md`, completes the step, then loads Persona B from `.agent/knowledge/B.md`. State is preserved in context. |
| **Explicit Subagents** | Highly parallel execution needed. High independence between tasks. | Main Agent acts as Supervisor. Modifies `task.md` to trigger parallel subagents (e.g., using a subagent API or tool if available, or just running terminal tasks in background). |

## 6 Architectural Patterns

### 1. Pipeline (Role Switching)
- **Description:** A linear sequence of steps where each phase depends entirely on the previous phase's output.
- **Example:** Analyst → Designer → Developer → QA.
- **Implementation:** `task.md` defines sequential checkboxes. The Agent switches Personas at each check.

### 2. Fan-out / Fan-in (Explicit Subagents)
- **Description:** Parallel tasks that must be executed simultaneously, then aggregated.
- **Example:** Search 5 different websites simultaneously.
- **Implementation:** Main Agent delegates 5 parallel background tasks to subagents. Waits for all to finish, then loads the "Aggregator" Persona to merge results.

### 3. Expert Pool (Role Switching)
- **Description:** Conditional execution based on the context. Only the relevant expert is called.
- **Example:** If AWS → Load AWS Expert Persona. If GCP → Load GCP Expert Persona.
- **Implementation:** `task.md` contains conditional logic. Main agent analyzes state, chooses the correct Knowledge Item to load.

### 4. Producer-Reviewer (Role Switching)
- **Description:** An iterative loop of generation and critique.
- **Example:** Developer writes code → QA Reviews → Developer Fixes.
- **Implementation:** Main agent loops between "Producer" and "Reviewer" Personas. Intermediate files are saved in `_workspace/` for transparency.

### 5. Supervisor (Subagents)
- **Description:** A central agent delegates tasks dynamically to specialized workers.
- **Example:** Project Manager delegating UI, Backend, and DB tasks to distinct workers.
- **Implementation:** Main Agent stays in Supervisor Persona, monitors `task.md`, and spawns subagents to resolve pending items.

### 6. Hierarchical Delegation (Subagents)
- **Description:** Top-down recursive delegation for extremely large tasks.
- **Example:** Epic → Feature → Story → Task.
- **Implementation:** Supervisor subagents spawn their own lower-level subagents. Rarely needed except for massive codebases.
