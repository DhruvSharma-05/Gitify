import os
import tempfile

os.environ.setdefault("GITIFY_DB_PATH", os.path.join(tempfile.gettempdir(), "gitify-test.db"))
os.environ.setdefault("GITIFY_CORS_ORIGINS", "http://localhost:5173")

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

print("backend smoke test passed")
