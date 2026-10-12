# Skill Writing Guide

Skills in Antigravity are specialized scripts or exact tool usage definitions stored in `.agent/skills/`.

## General Principles

1. **Leverage the Terminal:** Antigravity has native terminal access. Skills should heavily utilize bash scripts, python utilities, or CLI commands.
2. **Pushy Descriptions:** The `description` field is the only way Antigravity knows to use the skill. Make it explicitly clear exactly when to trigger it.
3. **Keep it Lean:** The `SKILL.md` file should be under 500 lines. Move heavy logic to `scripts/` folder.

## Structure

```
.agent/skills/my_skill/
├── SKILL.md (Required)
└── scripts/
    └── execute.sh (Optional, but recommended)
```

## Example: Database Migration Skill

**Bad Description:** "Runs migrations."
**Good Description:** "Executes PostgreSQL database migrations. ALWAYS use this skill when the user asks to update the database schema or run 'prisma migrate'."

**SKILL.md Body:**
```markdown
When triggered, execute the script located at `.agent/skills/db_migrate/scripts/run.sh`.
Do not try to write the SQL manually. Always use the script.
If the script returns an error, analyze the stderr and propose a fix.
```
