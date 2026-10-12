# Skill Testing Guide

Testing skills in Antigravity involves ensuring that the custom skills execute flawlessly in the terminal environment and that the Personas trigger the right actions at the right time.

## 1. Structure Check
Ensure that the `.agent/knowledge/` and `.agent/skills/` directories are fully populated without orphaned or duplicate files.

## 2. Dry-Run of task.md
Before executing the Harness, the Antigravity Main Agent should mentally step through `task.md`.
- Are dependencies logical?
- Does Phase 2 expect an artifact that Phase 1 never produces?

## 3. Skill Execution Test
Write a test prompt targeting the skill's description.
- **Should-Trigger**: Does the Main Agent successfully decide to use the skill based on the prompt?
- **Execution**: Does the skill script run successfully in the terminal?
- **Output**: Does the skill return clean, actionable output for the Main Agent?

## 4. Persona Switching Test
To test Single-Agent Role Switching:
1. Start execution of `task.md`.
2. Monitor if the Agent successfully alters its behavior upon reading `_persona.md`.
3. Check if context leakage occurs (e.g., the Developer persona writing QA reports).
