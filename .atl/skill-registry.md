# Skill Registry — p4int

Generated: 2026-06-15

## User Skills

| Skill | Trigger | Path |
|-------|---------|------|
| branch-pr | PR creation workflow | ~/.claude/skills/branch-pr/SKILL.md |
| go-testing | Go tests, Bubbletea TUI testing | ~/.claude/skills/go-testing/SKILL.md |
| issue-creation | Issue creation workflow | ~/.claude/skills/issue-creation/SKILL.md |
| judgment-day | Parallel adversarial review | ~/.claude/skills/judgment-day/SKILL.md |
| skill-creator | Creating new AI skills | ~/.claude/skills/skill-creator/SKILL.md |

## Project Conventions

| Source | Path | Notes |
|--------|------|-------|
| Parent CLAUDE.md | P4_backend/CLAUDE.md | Project-level conventions for P4 backend course |

## Compact Rules

### Python Backend (FastAPI)
- Spanish naming for business entities (clientes, productos, pedidos)
- Three-layer: routers (HTTP) → services (business logic) → repository (data)
- Use Pydantic models for request/response validation
- Raise HTTPException from services for API errors
- Always specify response_model on router functions
- Status codes: 200 (success), 201 (created), 400 (bad request), 404 (not found)

### Testing (Backend)
- pytest + httpx for testing
- Test services independently of HTTP layer
- Test routers with TestClient from fastapi.testclient
- conftest.py uses SQLite in-memory with StaticPool
- Structure: tests/test_{module}/test_router.py + test_service.py

### Frontend (React/TypeScript)
- Vite + TypeScript + Zustand + React Query + TailwindCSS
- ESLint for linting, tsc --noEmit for type checking
- No test runner configured
