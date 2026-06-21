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
| 32 | CORRECTNESS/UX | `offlineGit.js`: `OFFLINE_SUPPORTED_CMDS` listed 6 commands while `ALLOWED_BASE_CMDS` (Tab-completion) listed 17; `echo` and `pwd` appeared in suggestions but triggered "Offline mode simulates only basic commands" on execution; added minimal `echo` and `pwd` handlers; synced `OFFLINE_SUPPORTED_CMDS` to include both | PASS |
| 33 | CORRECTNESS | `offlineGit.js`: `checkout -b` and `switch -c` used `find(c => c.branches.includes(currentBranch))` to locate HEAD — after Iter-24's stamping, root commit shares branch names so find returned root instead of true HEAD; second-level branching set wrong `is_head` marker and committed dangling nodes; fixed by using `find(c => c.is_head)` in both handlers; 7 new assertions | PASS |
| 34 | CORRECTNESS | `offlineGit.js`: `git cherry-pick` created commit with `parents: []` — disconnected floating node in LiveCommitGraph (same class of bug as Iter-27's revert fix); fixed by capturing `cherryHead = find(c => c.is_head)` before map and using its hash as parent; 4 new assertions | PASS |
| 35 | CORRECTNESS | `offlineGit.js`: `git revert` used `find(c => c.branches.includes(activeBranch))` for HEAD lookup — after additional commits, first match was the first commit on branch rather than the true HEAD; fixed by using `find(c => c.is_head)`; 3 new assertions | PASS |
| 36 | CORRECTNESS | `offlineGit.js`: `git reset HEAD~N` and `git reset <hash>` left the new HEAD commit with an empty branches array — `git log` showed no `(HEAD -> branch)` ref after reset; fixed by pushing `nextState.branch` onto the new HEAD's branches; 4 new assertions | PASS |
| 37 | CORRECTNESS | `offlineGit.js`: `git checkout <branch>` and `git switch <branch>` used `branches.includes(targetBranch)` for HEAD lookup — after checkout -b stamping, multiple commits share a branch name so `map` set multiple commits as HEAD; switching back to a diverged branch landed on the root not the tip; fixed by finding the last matching commit in insertion order; 5 new assertions | PASS |
| 38 | CORRECTNESS | `offlineGit.js`: `git stash list` numbered stashes oldest-first (`stash@{0}` = oldest); real git numbers newest-first; fixed by reversing the display array before numbering; 3 new assertions | PASS |
| 39 | UX/CORRECTNESS | `TerminalShell.jsx`: file Tab-completion only triggered for `git add`; `git rm <Tab>`, `git restore <Tab>`, `git diff <Tab>` suggested nothing; changed both `calculateSuggestions` and `handleTabComplete` to check `words[1]` for git file-completing subcommands | PASS |
| 40 | CORRECTNESS | `offlineGit.js`: `git diff <file>` had a wrong `targetFile` extraction — `parts.find()` returned `'git'` (first non-flag word) so the filename argument was ignored and diff always showed a fake file named "git"; fixed by using `parts.slice(2).find()` to skip `git` and `diff`; also excluded HEAD refs from filename extraction; 5 new assertions | PASS |
| 41 | CORRECTNESS | `offlineGit.js`: `git commit` reported total workspace files ("7 files changed") instead of staged file count; fixed by capturing `nextState.staged.length` before clearing staged; also correctly pluralises "file" vs "files" | PASS |
| 42 | CORRECTNESS | `offlineGit.js`: `git status` showed all staged files as "new file:" regardless of tracked status; already-committed files staged for update now correctly show "modified:" via a `committed_files` set lookup; 4 new assertions | PASS |
| 43 | CORRECTNESS | `offlineGit.js`: `git rm` was unhandled (fell through to "Unknown subcommand"); added handler supporting both full removal and `--cached` (untrack without deleting); `TerminalShell.jsx`: added `rm` to `GIT_SUBCOMMANDS`; 8 new assertions | PASS |
| 44 | CORRECTNESS | `offlineGit.js`: `git commit -a/-am` staged all files including untracked ones; real git `-a` only auto-stages tracked (committed) files; fixed to filter against `committed_files`; updated stale regression test; 3 new assertions | PASS |
| 45 | CORRECTNESS | `offlineGit.js`: `git rm` removed from `committed_files` immediately, so `git commit` after `git rm` said "nothing to commit"; added `staged_deletions` array — `git rm` stages to it, `git commit` processes it, `git status` shows "deleted:"; 4 new assertions | PASS |
| 46 | CORRECTNESS | `offlineGit.js`: `git restore --staged .` extracted `'.'` as filename then `staged.filter(f => f !== '.')` left all files staged; added wildcard check so `.`, `:/ `, `*` clear the entire staged list; `git restore .` also resets working tree files; 4 new assertions | PASS |
| 47 | CORRECTNESS | `offlineGit.js`: `git checkout -- <file>` (discard working-tree changes) fell through to branch-switch and errored with "pathspec '--' did not match any file(s)"; added `isDashDash` guard before the branch logic to handle the discard form; 3 new assertions | PASS |
| 48 | UX/PARITY | `TerminalShell.jsx`: `getGitSuggestion` typo-hint was applied in the live `.then` path but absent from the `.catch` offline path; students in offline mode never saw "Did you mean git X?"; added the same typo block to the offline handler | PASS |
| 49 | CORRECTNESS | `offlineGit.js`: `git add -u` staged all files like `git add .`; real git `-u` only stages tracked modified files; fixed by filtering against `committed_files`; updated stale regression test; 3 new assertions | PASS |
| 50 | CORRECTNESS | `offlineGit.js`: `git branch -m <new>` fell through to the "create branch" path and created a branch named `-m`; added `isRename` guard and proper rename logic updating `branches`, `commits`, and `nextState.branch`; 7 new assertions | PASS |
| 51 | CORRECTNESS | `offlineGit.js`: `git commit --amend` created a new commit instead of replacing HEAD; added early --amend check that mutates HEAD commit's message in place and absorbs any staged files; 4 new assertions | PASS |
| 52 | CORRECTNESS | `offlineGit.js`: `git log -n N`, `git log -N`, and `git log --max-count=N` showed all commits regardless of the limit flag; added limit extraction and `slice(0, maxCount)` before rendering; 4 new assertions | PASS |
| 53 | CORRECTNESS/UX | `offlineGit.js`: `git stash push -m "msg"` and `git stash save "msg"` ignored the message; all stashes showed generic "WIP stash" label; extracted and stored `message` field; `stash list` now shows "On branch: msg" format for named stashes; 4 new assertions | PASS |
| 54 | CORRECTNESS | `offlineGit.js`: `git show` fell through to "Unknown git subcommand"; added handler showing HEAD commit (or specific hash) details; added `show` to `GIT_SUBCOMMANDS` for autocomplete; 5 new assertions | PASS |
| 55 | CORRECTNESS | `offlineGit.js`: `git tag -a v1.0 -m "msg"` created a tag named `-a` (flag treated as name); `git tag -d` was unhandled; fixed by extracting first non-flag arg as tag name and adding delete support; 6 new assertions | PASS |

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

