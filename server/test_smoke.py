import os
import tempfile

os.environ.setdefault("GITIFY_DB_PATH", os.path.join(tempfile.gettempdir(), "gitify-test.db"))
os.environ.setdefault("GITIFY_CORS_ORIGINS", "http://localhost:5173")

# Run hermetically: this test solves lessons (which persists progress), so start from a
# clean database every run, including the WAL sidecar files.
_db = os.environ["GITIFY_DB_PATH"]
for _f in (_db, _db + "-wal", _db + "-shm"):
    try:
        os.remove(_f)
    except OSError:
        pass

import database
import main

database.init_db()

assert main.health_check()["status"] == "healthy"
assert database.get_user_progress("student") == []

# --- Per-lesson sandbox isolation ---
# Each (session, lesson) must get its own independent repo with its own branch/files.
session = "smoke-session"

l2 = main.enter_lesson(main.ResetRequest(lesson_id=2, session_id=session))
l5 = main.enter_lesson(main.ResetRequest(lesson_id=5, session_id=session))

key2 = main.sandbox_key(session, 2)
key5 = main.sandbox_key(session, 5)
assert key2 in main.SESSION_SANDBOXES and key5 in main.SESSION_SANDBOXES
assert main.SESSION_SANDBOXES[key2]["base_path"] != main.SESSION_SANDBOXES[key5]["base_path"], \
    "Lessons 2 and 5 must not share a sandbox directory"

# Lesson 5 seeds onto the feature/payments branch; lesson 2 onto main.
assert l2["sync_state"]["branch"] == "main"
assert l5["sync_state"]["branch"] == "feature/payments"

# A command in one lesson must not leak into another's sandbox.
main.execute_terminal_command(main.TerminalExecuteRequest(
    command="touch isolation_probe.txt", session_id=session, lesson_id=2))
l5_files = main.enter_lesson(main.ResetRequest(lesson_id=5, session_id=session))["sync_state"]["files"]
assert "isolation_probe.txt" not in l5_files, "Lesson 2 file leaked into lesson 5 sandbox"

# --- Shell command engine (sequencing, pipes, redirection) ---
shell_session = "smoke-shell"
main.enter_lesson(main.ResetRequest(lesson_id=1, session_id=shell_session))

def sh(cmd):
    r = main.execute_terminal_command(
        main.TerminalExecuteRequest(command=cmd, session_id=shell_session, lesson_id=1))
    return r["status"], r["output"]

sh("git init")
assert sh("echo hello > note.txt")[0] == "success"
assert sh("cat note.txt")[1].strip() == "hello"
assert sh("echo world >> note.txt")[0] == "success"
assert sh("cat note.txt | wc -l")[1].strip() == "2"
assert sh("cat note.txt | grep world")[1].strip() == "world"
assert sh("cat note.txt | grep zzz")[0] == "error"        # grep no-match -> nonzero
assert sh("pwd")[1].strip() == "/workspace"
sh("echo a > x1.txt && echo b > x2.txt")
assert "x1.txt" in sh("ls")[1] and "x2.txt" in sh("ls")[1]
assert "STOP" not in sh("cat missing.txt && echo STOP")[1]  # && short-circuits
assert "GO" in sh("cat missing.txt ; echo GO")[1]            # ; runs regardless

# --- Hardening ---
assert sh("echo evil > .git/hooks/pre-commit")[0] == "error"   # no .git writes
assert sh("touch .git/hooks/x")[0] == "error"
assert sh("curl http://evil")[0] == "error"                    # command not allowlisted
assert sh("git -c core.editor=evil status")[0] == "error"      # no -c injection
assert sh("git config core.pager evil")[0] == "error"          # no dangerous config keys

# --- Lesson 3 must be completable end-to-end (merge -> resolve -> add -> commit) ---
l3 = "smoke-l3"
main.enter_lesson(main.ResetRequest(lesson_id=3, session_id=l3))

def l3run(cmd):
    return main.execute_terminal_command(
        main.TerminalExecuteRequest(command=cmd, session_id=l3, lesson_id=3))

l3run("git merge feature/ui")  # triggers the conflict
main.write_sandbox_file(main.WriteFileRequest(
    session_id=l3, lesson_id=3, filename="config.js",
    content="export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'system'\n};\n"))
l3run("git add config.js")
res = l3run('git commit -m "resolve merge conflict"')
assert res["verified"], f"Lesson 3 should verify after a resolved merge commit, got {res['subtasks']}"

# --- Lesson 1 must be completable: init -> add -> commit -> push origin main ---
l1 = "smoke-l1"
main.enter_lesson(main.ResetRequest(lesson_id=1, session_id=l1))

def l1run(cmd):
    return main.execute_terminal_command(
        main.TerminalExecuteRequest(command=cmd, session_id=l1, lesson_id=1))

l1run("git init")
l1run("git add .")
l1run('git commit -m "first commit"')
res1 = l1run("git push origin main")
assert res1["verified"], f"Lesson 1 should verify after pushing to origin/main, got {res1['subtasks']}"

# --- Every auto-graded lesson must be completable the intended way ---
def base_path(session, lesson):
    return main.SESSION_SANDBOXES[main.sandbox_key(session, lesson)]["base_path"]

def run_lesson(session, lesson, commands):
    last = None
    for c in commands:
        last = main.execute_terminal_command(
            main.TerminalExecuteRequest(command=c, session_id=session, lesson_id=lesson))
    return last

def commit_hash_matching(session, lesson, needle, ref="--all"):
    out = main.verifier.run_git_command(base_path(session, lesson), ["log", ref, "--oneline"])[1]
    for line in out.splitlines():
        if needle.lower() in line.lower():
            return line.split()[0]
    raise AssertionError(f"commit matching {needle!r} not found in lesson {lesson}")

# Lesson 2: branch -> commit -> merge back to main
main.enter_lesson(main.ResetRequest(lesson_id=2, session_id="smoke-l2"))
r2 = run_lesson("smoke-l2", 2, [
    "git checkout -b feature/auth", "touch feat.js", "git add .",
    'git commit -m "auth"', "git checkout main", "git merge feature/auth"])
assert r2["verified"], f"Lesson 2 not completable: {r2['subtasks']}"

# Lesson 4: revert the buggy commit
main.enter_lesson(main.ResetRequest(lesson_id=4, session_id="smoke-l4"))
buggy = commit_hash_matching("smoke-l4", 4, "skip null")
r4 = run_lesson("smoke-l4", 4, [f"git revert --no-edit {buggy}"])
assert r4["verified"], f"Lesson 4 not completable: {r4['subtasks']}"

# Lesson 5: stash -> switch -> cherry-pick -> pop
main.enter_lesson(main.ResetRequest(lesson_id=5, session_id="smoke-l5"))
pick = commit_hash_matching("smoke-l5", 5, "tax", ref="hotfix/invoice")
r5 = run_lesson("smoke-l5", 5, [
    "git stash", "git checkout hotfix/invoice", "git checkout feature/payments",
    f"git cherry-pick {pick}", "git stash pop"])
assert r5["verified"], f"Lesson 5 not completable: {r5['subtasks']}"

# Lesson 6: fetch -> pull --rebase -> push
main.enter_lesson(main.ResetRequest(lesson_id=6, session_id="smoke-l6"))
r6 = run_lesson("smoke-l6", 6, [
    "git fetch", "git pull --rebase origin main", "git push origin main"])
assert r6["verified"], f"Lesson 6 not completable: {r6['subtasks']}"

print("backend smoke test passed")
