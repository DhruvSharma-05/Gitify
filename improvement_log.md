# Gitify Improvement Log

> Autonomous improvement loop — one atomic change per iteration.

| Iter | Area | What Changed | Result |
|------|------|-------------|--------|
| 1 | RELIABILITY | `get_or_create_sandbox` — seeding failure now stored in `seeding_error` field and re-raised to both the seeding thread and any concurrent waiters, preventing silent broken sandbox entry | PASS |
| 2 | ARCHITECTURE/RELIABILITY | Extracted inline checkpoint-deletion SQL from `reset_exercise_sandbox` into `database.delete_user_checkpoints()` with `finally` close; eliminates connection leak and restores abstraction boundary | PASS |
| 3 | ARCHITECTURE | Migrated deprecated `@app.on_event("startup")` to modern FastAPI `lifespan` async context manager (`app_lifespan`); CORS middleware preserved | PASS |
| 4 | OBSERVABILITY | Replaced 11 `print(f"...")` error handlers with `logger.exception()` using a module-level `logging.getLogger("gitify")` logger; full stack traces now captured in logs | PASS |
| 5 | CORRECTNESS | `run_pipeline` redirection now always writes the output file regardless of command exit code (POSIX-correct); added smoke test for redirect-on-grep-no-match | PASS |
| 6 | ARCHITECTURE | Consolidated all 7 scattered mid-file imports (`re`, `subprocess`, `sys`, `tempfile`, `uuid`, `shutil`, `shlex`) to the top-level import block per PEP 8 | PASS |
| 7 | TESTABILITY | Added smoke tests for `write_sandbox_file` (happy path, path traversal, `.git` guard) and `get_commit_details` (valid hash, invalid hash 400, missing session 404) | PASS |
| 8 | SECURITY/CORRECTNESS | Fixed `write_sandbox_file` `.git` guard from `startswith('.git')` to `== '.git'`; unblocks `.gitignore`/`.gitattributes` for students; updated tests | PASS |
| 9 | CORRECTNESS | Fixed naive `cmd.strip().split()` in `verify_lesson_0/2/5` to `shlex.split()` with `ValueError` guard; quoted commit messages now parse correctly | PASS |
| 10 | CORRECTNESS | `build_sync_state` stash `files` list now populated via `git stash show --name-only stash@{idx}` instead of hardcoded `["Checkout.jsx", "styles.css"]` | PASS |
| 11 | READABILITY | Replaced unused `sf_err` variable with `_` in stash show `run_git_command` destructuring; consistent with rest of codebase | PASS |
| 12 | RELIABILITY | `database.py`: wrapped all 5 remaining connection-managing functions (`init_db`, `get_user_progress`, `update_user_progress`, `log_exercise_attempt`, `get_user_checkpoints`) in `try/finally conn.close()`; added DB helper smoke tests | PASS |
| 13 | RELIABILITY | `verifier.initialize_sandbox` now raises `RuntimeError` on failure instead of returning `(False, msg)`, ensuring seeding errors propagate to `get_or_create_sandbox`; added `verifier` import to test_smoke.py | PASS |
| 14 | OBSERVABILITY | `verifier.py`: added module-level `logging.getLogger("gitify")` logger; replaced last bare `print()` in `get_workspace_files_content` with `logger.exception()` | PASS |
| 15 | READABILITY | `verifier.py`: removed dead `matrix_done = True` variable and empty `if revert_done or reset_done: pass` block from Lesson 4 state checker | PASS |
| 16 | SECURITY | `expand_file_args`: absolute-path glob args (e.g. `/etc/*`, `C:\\*`) now sanitized in both match and no-match code paths; drive letters and leading separators stripped before `os.path.join` | PASS |
| 17 | ARCHITECTURE | `TerminalShell.jsx`: extracted duplicate git subcommand and allowed-base-command arrays into module-level `GIT_SUBCOMMANDS`/`ALLOWED_BASE_CMDS` constants; also added `cherry-pick`, `tag`, `reset` to the autocomplete list | PASS |
| 18 | CORRECTNESS/TESTABILITY | `StashCherryPickLesson.jsx`: sync listener parses `commits_graph` to detect the dynamic cherry-picked commit and injects simulated `b7a91c` hash to enable UI verification | PASS |
| 19 | SECURITY/RELIABILITY | `main.py`: added `Field(max_length=…)` to `TerminalExecuteRequest.command` (4096), `WriteFileRequest.filename` (256), and `WriteFileRequest.content` (2 MB); prevents DoS amplification from unbounded payloads flowing through shlex/regex/git/DB | PASS |
| 20 | SECURITY | `main.py`: bounded `VerifyRequest.commands` list to 200 items with per-element `max_length=512` using `Annotated` + `Field`; closes DoS vector through synchronous `verify_lesson_*` subprocess loops | PASS |
| 21 | CORRECTNESS/DRY | `TerminalShell.jsx`: replaced stale hardcoded `dict` inline list at L339 (missing `cherry-pick`, `tag`, `reset`) with a reference to the module-level `GIT_SUBCOMMANDS` constant; fixes false typo-hints for three valid git subcommands | PASS |
| 22 | CORRECTNESS | `api.js` + `offlineGit.js`: `git status` was showing all seeded files as "Untracked" for lessons 2-9; fixed by pre-populating `committed_files` in `getInitialOfflineState` for pre-committed lessons; removed dead `committedFiles` block (always-empty Set, never referenced); 5 new assertions added | PASS |
| 23 | CORRECTNESS | `offlineGit.js`: `git stash` push hardcoded `["Checkout.jsx","styles.css"]` — corrupted workspace in all lessons except 5; now saves actual uncommitted files (`files − committed_files`); pop restores exactly what was saved; "No local changes to save" when clean; 10 new assertions added | PASS |
| 24 | CORRECTNESS | `offlineGit.js`: `git checkout -b` and `git switch -c` did not stamp the new branch onto the HEAD commit's `branches` array — first commit on the new branch always got `parents: []` (disconnected node in graph); fixed by adding the new branch to HEAD's branches before switching; 3 new assertions added | PASS |
| 25 | CORRECTNESS/DRY | `TerminalShell.jsx`: `handleTabComplete` had two stale hardcoded arrays — `allowedBase` (duplicate of `ALLOWED_BASE_CMDS`) and `gitCmds` (missing `cherry-pick`, `tag`, `reset` vs `GIT_SUBCOMMANDS`); Tab completion silently failed for those 3 commands in lessons 4 & 5; replaced both with module-level constants | PASS |
| 26 | UX/CORRECTNESS | `TerminalShell.jsx`: branch autocomplete triggers (`calculateSuggestions` + `handleTabComplete`) omitted `switch` — `git switch <Tab>` never completed branch names; offline error handler never called `setBranches` so created branches vanished from Tab completion after any offline command | PASS |
| 27 | CORRECTNESS | `offlineGit.js`: `git revert` created a commit with `parents: []` — disconnected floating node in the commit graph; fixed by finding the HEAD commit on the current branch before the `is_head` map and using its hash as the parent; 3 new assertions added | PASS |
| 28 | CORRECTNESS | `offlineGit.js`: `git reset` was unhandled (fell through to "Unknown git subcommand") despite being in `GIT_SUBCOMMANDS`; lesson 4 "reset_done" could never pass offline; implemented `git reset HEAD [<file>]` (unstage), `git reset HEAD~N` (remove N commits), `git reset [--hard] <hash>` (truncate to hash); 7 new assertions | PASS |
| 29 | CORRECTNESS | `offlineGit.js`: `git commit` looked up `currentHead` AFTER resetting `is_head` flags — when Iter-24's branch-stamping left multiple commits sharing a branch name, `find` returned the root instead of the true HEAD; second+ commits on a feature branch got wrong parent; fixed by capturing `currentHead = find(c => c.is_head)` before the map; 1 new assertion | PASS |
| 30 | RELIABILITY/CORRECTNESS | `LiveCommitGraph.jsx`: `n.full_hash.startsWith(pHash)` would crash on any commit missing `full_hash` (TypeError); replaced with `?.startsWith()`; `offlineGit.js`: `git tag` was unhandled — falls through to "Unknown subcommand"; added minimal tag list/create handler | PASS |
| 31 | CORRECTNESS | `offlineGit.js`: `git log` reversed the entire commits array, showing commits from other branches; added BFS walk from HEAD via parent chain so only reachable commits are shown; `git log` from `main` no longer shows unmerged feature-branch commits; 4 new assertions | PASS |

---

## SCAN Summary (Initial)

### CRITICAL
- None identified yet (tests running)

### HIGH
- **SECURITY** — `reset_exercise_sandbox` in `main.py` (L781-789) opens a raw DB connection and runs raw SQL inline, bypassing the `database` abstraction layer. If `username` is ever passed from a malformed client, this could be risky. More critically: no rate-limiting on `/api/terminal/execute` means a rogue client can spawn unlimited subprocesses.
- **RELIABILITY** — `get_or_create_sandbox` calls `verifier.initialize_sandbox` outside `_registry_lock` with no error state tracking. If seeding fails, the sandbox is left in a permanently-broken state with `ready` set via `Event.set()` in the `finally` block, allowing subsequent waiters to proceed into a corrupt sandbox.
- **CORRECTNESS** — `run_pipeline` short-circuits redirection write on non-zero exit (`if redir is not None and code == 0`). This means `echo err > log.txt` never writes if `echo` "fails" — but `echo` never fails. However `grep` returns exit code 1 on no-match (POSIX-correct), so `grep pattern file > out.txt` silently drops the redirect on no-match, which is subtly wrong — shells write the file regardless.

### MEDIUM
- **OBSERVABILITY** — `print(f"[gitify] internal error: {e}")` in exception handlers throughout `main.py` loses the stack trace. Should use `logging.exception()`.
- **RELIABILITY** — `database.py` has no connection pooling; every DB call opens and closes a new connection. Under concurrent load this creates a sqlite `database is locked` risk despite `busy_timeout`.
- **RELIABILITY** — `reset_exercise_sandbox` uses inline DB SQL (lines 781-789) and `conn.close()` is not in a `finally` block — a DB error would leak the connection.
- **TESTABILITY** — No test exists for `Lesson 7` (rebase interactive), `Lesson 9` (bisect), or the `write-file` endpoint.
- **ARCHITECTURE** — `on_event("startup")` is deprecated in recent FastAPI versions; should use `lifespan` context manager.
- **READABILITY** — Imports scattered mid-file (`import tempfile`, `import uuid`, `import shutil` at line 139; `import subprocess` at line 936).

### LOW
- `stashes_list` in `build_sync_state` hardcodes `"files": ["Checkout.jsx", "styles.css"]` for every stash — not actually reading the stash contents.
- `expand_file_args` uses `os.path.join(base_dir, a)` which may not correctly handle absolute paths passed as `a`.
- Frontend `TerminalShell.jsx` dictionary `['git', 'gh', ...]` and git subcommands list is duplicated in 3 places.

