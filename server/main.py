from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import glob
import shlex
import database
import verifier

app = FastAPI(title="Gitify API", version="0.1.0")

cors_origins = [
    origin.strip()
    for origin in os.environ.get(
        "GITIFY_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:8080",
    ).split(",")
    if origin.strip()
]
cors_origin_regex = os.environ.get("GITIFY_CORS_ORIGIN_REGEX")

# Setup CORS middleware to allow cross-origin requests from our React App
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema on startup
@app.on_event("startup")
def startup_event():
    database.init_db()

# Request/Response Validation Schemas
class ProgressUpdate(BaseModel):
    lesson_id: int
    completed: bool
    score: int
    username: Optional[str] = "student"

class VerifyRequest(BaseModel):
    lesson_id: int
    commands: Optional[List[str]] = []
    state: Optional[Dict[str, Any]] = None
    username: Optional[str] = "student"

@app.get("/api/progress")
def get_progress(username: str = "student"):
    try:
        data = database.get_user_progress(username)
        return {"status": "success", "progress": data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

@app.post("/api/progress")
def update_progress(data: ProgressUpdate):
    try:
        success = database.update_user_progress(data.lesson_id, data.completed, data.score, data.username)
        if success:
            return {"status": "success", "message": "Progress updated successfully"}
        raise HTTPException(status_code=400, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

@app.post("/api/exercises/verify")
def verify_exercise(data: VerifyRequest):
    try:
        success = False
        message = ""
        
        # Determine verification path: real sandbox commands vs simulated React states
        if data.commands and len(data.commands) > 0:
            if data.lesson_id == 0:
                success, message = verifier.verify_lesson_0(data.commands)
            elif data.lesson_id == 2:
                success, message = verifier.verify_lesson_2(data.commands)
            elif data.lesson_id == 5:
                success, message = verifier.verify_lesson_5(data.commands)
            else:
                # If commands sent for other lessons, fall back to checking their simulated payload
                if data.state:
                    success, message = verifier.verify_simulated_state(data.lesson_id, data.state)
                else:
                    success = False
                    message = f"Real command validation for Lesson {data.lesson_id} is not supported. Use simulated buttons."
        else:
            # Simulated React states validation
            if data.state:
                success, message = verifier.verify_simulated_state(data.lesson_id, data.state)
            else:
                raise HTTPException(status_code=400, detail="No commands or state sent for validation.")
                
        # Log attempt
        cmds_str = ", ".join(data.commands) if data.commands else "UI clicks"
        database.log_exercise_attempt(data.lesson_id, "success" if success else "failed", cmds_str, data.username)
        
        # If successfully validated, automatically update progress in database!
        if success:
            database.update_user_progress(data.lesson_id, True, 100, data.username)
            
        return {
            "status": "success" if success else "failed",
            "verified": success,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

class TerminalExecuteRequest(BaseModel):
    command: str
    session_id: str
    lesson_id: int
    username: Optional[str] = "student"

class ResetRequest(BaseModel):
    lesson_id: int
    session_id: str
    username: Optional[str] = "student"

import tempfile
import uuid
import shutil

# Per-lesson sandboxes: each (session_id, lesson_id) pair gets its own isolated
# git repository on disk, seeded once with that lesson's baseline. This keeps every
# lesson's terminal independent — its own branch, files and history.
SESSION_SANDBOXES = {}
SESSION_ROOT = Path(os.environ.get("GITIFY_SESSION_ROOT", os.path.join(tempfile.gettempdir(), "gitify-sessions"))).resolve()
SESSION_ROOT.mkdir(parents=True, exist_ok=True)

def create_session_dir() -> str:
    return tempfile.mkdtemp(prefix="gitify_session_", dir=str(SESSION_ROOT))

def normalize_session_id(session_id: str) -> str:
    """Returns a usable session id, generating one when the client sent a blank/placeholder."""
    sid = session_id.strip() if session_id else ""
    if not sid or sid in ("null", "undefined"):
        sid = str(uuid.uuid4())
    return sid

def sandbox_key(session_id: str, lesson_id: int) -> str:
    return f"{session_id}::L{lesson_id}"

def get_or_create_sandbox(session_id: str, lesson_id: int):
    """Resolves the sandbox for (session, lesson), creating and seeding it on first use
    or if its directory has gone missing. Returns (key, session_obj)."""
    key = sandbox_key(session_id, lesson_id)
    session_obj = SESSION_SANDBOXES.get(key)
    if not session_obj or not os.path.exists(session_obj["base_path"]):
        temp_dir = create_session_dir()
        SESSION_SANDBOXES[key] = {"base_path": temp_dir, "cwd_relative": ""}
        verifier.initialize_sandbox(temp_dir, lesson_id)
        session_obj = SESSION_SANDBOXES[key]
    return key, session_obj

def ensure_lesson_remote(base_path: str, lesson_id: int):
    """Lesson 1 ships a bare remote on disk; once the student runs `git init`, wire it
    up as `origin` so the taught `git push origin main` actually works."""
    if lesson_id not in (0, 1):
        return
    if not os.path.exists(os.path.join(base_path, ".git")):
        return
    remote_dir = base_path + "_remote.git"
    if not os.path.isdir(remote_dir):
        return
    _, remotes, _ = verifier.run_git_command(base_path, ["remote"])
    if "origin" not in remotes.split():
        verifier.run_git_command(base_path, ["remote", "add", "origin", remote_dir])

def build_sync_state(base_path: str, cwd_rel: str = "") -> Dict[str, Any]:
    """Inspects the sandbox on disk and builds the state-sync payload that drives the
    frontend visualizers (branch, files, stashes, commit DAG, file contents)."""
    current_branch = "main"
    files_list = []
    stashes_list = []
    picked_commits = []

    if os.path.exists(os.path.join(base_path, ".git")):
        _, branch_out, _ = verifier.run_git_command(base_path, ["rev-parse", "--abbrev-ref", "HEAD"])
        if branch_out.strip():
            current_branch = branch_out.strip()

        _, stash_out, _ = verifier.run_git_command(base_path, ["stash", "list"])
        if stash_out.strip():
            for idx, line in enumerate(stash_out.strip().split("\n")):
                label = line.split(":", 2)[-1].strip() if ":" in line else line
                stashes_list.append({
                    "id": idx,
                    "name": f"stash@{{{idx}}}",
                    "label": label,
                    "files": ["Checkout.jsx", "styles.css"]
                })

        _, log_out, _ = verifier.run_git_command(base_path, ["log", "--oneline", "-n", "10"])
        if log_out.strip():
            for line in log_out.strip().split("\n"):
                picked_commits.append(line.split()[0])

    try:
        for item in os.listdir(base_path):
            if item != ".git" and os.path.isfile(os.path.join(base_path, item)):
                files_list.append(item)
    except Exception:
        pass

    return {
        "branch": current_branch,
        "files": files_list,
        "stashes": stashes_list,
        "picked": picked_commits,
        "pwd": cwd_rel,
        "commits_graph": verifier.get_live_commit_graph(base_path),
        "file_contents": verifier.get_workspace_files_content(base_path),
    }

def resolve_sandbox_path(base_path: str, cwd_rel: str, user_path: str = "") -> str:
    base = Path(base_path).resolve()
    candidate = (base / cwd_rel / user_path).resolve()
    if candidate != base and base not in candidate.parents:
        raise ValueError("Access denied: Cannot access outside sandbox.")
    return str(candidate)

def resolve_writable_path(base_path: str, cwd_rel: str, user_path: str) -> str:
    """Like resolve_sandbox_path, but additionally forbids writing anywhere inside the
    .git directory — prevents planting hooks/config that git would later execute."""
    target = resolve_sandbox_path(base_path, cwd_rel, user_path)
    git_dir = os.path.join(str(Path(base_path).resolve()), ".git")
    rp = os.path.realpath(target)
    if rp == git_dir or rp.startswith(git_dir + os.sep):
        raise ValueError("Access denied: cannot modify the .git directory.")
    return target

def expand_file_args(base_path: str, cwd_rel: str, args: List[str]) -> List[str]:
    """Expands shell globs (*, ?, []) in file arguments against the current directory.
    Tokens without glob chars (or with no matches) are returned unchanged."""
    base_dir = resolve_sandbox_path(base_path, cwd_rel)
    out = []
    for a in args:
        if any(c in a for c in "*?["):
            matches = sorted(glob.glob(os.path.join(base_dir, a)))
            if matches:
                out.extend(os.path.relpath(m, base_dir) for m in matches)
                continue
        out.append(a)
    return out

def _read_source(base_path, cwd_rel, file_args, stdin):
    """Returns (text, error). Reads concatenated file args (glob-expanded) when given,
    otherwise falls back to piped stdin."""
    files = expand_file_args(base_path, cwd_rel, file_args)
    if files:
        chunks = []
        for fn in files:
            target = resolve_sandbox_path(base_path, cwd_rel, fn)
            if not os.path.exists(target):
                return None, f"{fn}: No such file or directory"
            if os.path.isdir(target):
                return None, f"{fn}: Is a directory"
            with open(target, "r", encoding="utf-8", errors="ignore") as fh:
                chunks.append(fh.read())
        return "".join(chunks), None
    return (stdin or ""), None

def run_sandbox_command(base_path: str, cwd_rel: str, parts: List[str], stdin=None):
    """Runs a single non-git builtin. `stdin` carries piped input from a previous stage."""
    base_cmd = parts[0]
    args = parts[1:]

    try:
        if base_cmd == "pwd":
            disp = "/workspace" + (("/" + cwd_rel.replace("\\", "/")) if cwd_rel else "")
            return 0, disp, ""

        if base_cmd in ("ls", "dir"):
            path_args = [a for a in args if not a.startswith("-")]
            show_all = any(a.startswith("-") and "a" in a for a in args)
            target = resolve_sandbox_path(base_path, cwd_rel, path_args[0] if path_args else "")
            if not os.path.exists(target):
                return -1, "", f"{base_cmd}: cannot access '{path_args[0] if path_args else ''}': No such file or directory"
            if os.path.isdir(target):
                entries = sorted(os.listdir(target))
                if not show_all:
                    entries = [e for e in entries if not e.startswith(".")]
                return 0, "\n".join(entries), ""
            return 0, os.path.basename(target), ""

        if base_cmd in ("cat", "type"):
            text, err = _read_source(base_path, cwd_rel, args, stdin)
            if err:
                return -1, "", f"{base_cmd}: {err}"
            return 0, text, ""

        if base_cmd == "echo":
            words = [a for a in args if a not in ("-n", "-e")]
            return 0, " ".join(words), ""

        if base_cmd in ("head", "tail"):
            n = 10
            file_args = []
            i = 0
            while i < len(args):
                a = args[i]
                if a == "-n" and i + 1 < len(args):
                    try: n = int(args[i + 1])
                    except ValueError: pass
                    i += 2; continue
                if a.startswith("-n") and a[2:].isdigit():
                    n = int(a[2:]); i += 1; continue
                if a.startswith("-") and a[1:].isdigit():
                    n = int(a[1:]); i += 1; continue
                file_args.append(a); i += 1
            text, err = _read_source(base_path, cwd_rel, file_args, stdin)
            if err:
                return -1, "", f"{base_cmd}: {err}"
            lines = text.splitlines()
            sel = lines[:n] if base_cmd == "head" else lines[-n:]
            return 0, "\n".join(sel), ""

        if base_cmd == "wc":
            flags = [a for a in args if a.startswith("-")]
            file_args = [a for a in args if not a.startswith("-")]
            text, err = _read_source(base_path, cwd_rel, file_args, stdin)
            if err:
                return -1, "", f"wc: {err}"
            nl, nw, nc = len(text.splitlines()), len(text.split()), len(text)
            if "-l" in flags: return 0, str(nl), ""
            if "-w" in flags: return 0, str(nw), ""
            if "-c" in flags: return 0, str(nc), ""
            return 0, f"{nl} {nw} {nc}", ""

        if base_cmd == "grep":
            flags = [a for a in args if a.startswith("-") and a != "-"]
            rest = [a for a in args if not (a.startswith("-") and a != "-")]
            if not rest:
                return -1, "", "grep: missing pattern"
            pattern = rest[0]
            text, err = _read_source(base_path, cwd_rel, rest[1:], stdin)
            if err:
                return -1, "", f"grep: {err}"
            ignore = any("i" in f for f in flags)
            invert = any("v" in f for f in flags)
            countonly = any("c" in f for f in flags)
            number = any("n" in f for f in flags)
            import re as _re
            try:
                rx = _re.compile(pattern, _re.IGNORECASE if ignore else 0)
            except _re.error:
                rx = None
            matched = []
            for idx, line in enumerate(text.splitlines(), 1):
                if rx is not None:
                    hit = rx.search(line) is not None
                elif ignore:
                    hit = pattern.lower() in line.lower()
                else:
                    hit = pattern in line
                if invert:
                    hit = not hit
                if hit:
                    matched.append(f"{idx}:{line}" if number else line)
            if countonly:
                return 0, str(len(matched)), ""
            return (0 if matched else 1), "\n".join(matched), ""

        if base_cmd == "touch":
            pos = [a for a in args if not a.startswith("-")]
            if not pos:
                return -1, "", "touch: missing file operand"
            for a in pos:
                target = resolve_writable_path(base_path, cwd_rel, a)
                os.makedirs(os.path.dirname(target), exist_ok=True)
                Path(target).touch()
            return 0, "", ""

        if base_cmd == "mkdir":
            pos = [a for a in args if not a.startswith("-")]
            if not pos:
                return -1, "", "mkdir: missing operand"
            for a in pos:
                os.makedirs(resolve_writable_path(base_path, cwd_rel, a), exist_ok=True)
            return 0, "", ""

        if base_cmd == "rm":
            pos = [a for a in args if not a.startswith("-")]
            if not pos:
                return -1, "", "rm: missing operand"
            for t in expand_file_args(base_path, cwd_rel, pos):
                target = resolve_writable_path(base_path, cwd_rel, t)
                if os.path.isdir(target):
                    shutil.rmtree(target)
                elif os.path.exists(target):
                    os.remove(target)
                else:
                    return -1, "", f"rm: cannot remove '{t}': No such file or directory"
            return 0, "", ""

        if base_cmd in ("mv", "cp"):
            pos = [a for a in args if not a.startswith("-")]
            if len(pos) < 2:
                return -1, "", f"{base_cmd}: missing file operand"
            source = resolve_sandbox_path(base_path, cwd_rel, pos[0])
            target = resolve_writable_path(base_path, cwd_rel, pos[1])
            if not os.path.exists(source):
                return -1, "", f"{base_cmd}: cannot stat '{pos[0]}': No such file or directory"
            if base_cmd == "mv":
                shutil.move(source, target)
            elif os.path.isdir(source):
                shutil.copytree(source, target, dirs_exist_ok=True)
            else:
                shutil.copy2(source, target)
            return 0, "", ""
    except Exception as exc:
        return -1, "", str(exc)

    return -1, "", f"Command '{base_cmd}' is not supported."


# --- Command line engine: sequencing (&& ;), pipes (|), redirection (> >>) ---

ALLOWED_CMDS = {
    "git", "ls", "dir", "cat", "type", "echo", "clear", "cd", "pwd",
    "touch", "mkdir", "rm", "mv", "cp", "head", "tail", "wc", "grep",
}

_GIT_DANGEROUS_CONFIG = ("pager", "editor", "sshcommand", "fsmonitor", "hookspath", "askpass", "alias.")

def git_flag_violation(git_args: List[str]):
    """Returns an error string if git args try to inject code execution, else None."""
    if not git_args:
        return None
    for a in git_args:
        al = a.lower()
        if a == "-c" or al.startswith("--exec") or al.startswith("--upload-pack") or al.startswith("--receive-pack"):
            return "This git option is disabled in the sandbox for security."
    sub = git_args[0].lower()
    if sub in ("daemon", "credential"):
        return f"'git {sub}' is disabled in the sandbox."
    if sub == "config":
        for a in git_args[1:]:
            if any(k in a.lower() for k in _GIT_DANGEROUS_CONFIG):
                return "Editing that git config key is disabled in the sandbox."
    return None

def split_unquoted(s: str, separators: List[str]) -> List[str]:
    """Splits s on the given separators, ignoring any inside single/double quotes.
    Separators are kept as their own entries, so the result alternates seg, sep, seg…"""
    seps = sorted(separators, key=len, reverse=True)
    out, buf, i, quote = [], "", 0, None
    while i < len(s):
        ch = s[i]
        if quote:
            buf += ch
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ("'", '"'):
            quote = ch; buf += ch; i += 1; continue
        hit = next((sep for sep in seps if s.startswith(sep, i)), None)
        if hit:
            out.append(buf); out.append(hit); buf = ""; i += len(hit)
        else:
            buf += ch; i += 1
    out.append(buf)
    return out

def run_cd(base_path, cwd_state, parts):
    cwd_rel = cwd_state["rel"]
    target = parts[1] if len(parts) > 1 else ""
    if not target or target == "~":
        cwd_state["rel"] = ""
        return 0, "", ""
    if target == "..":
        if cwd_rel:
            nxt = os.path.dirname(cwd_rel)
            cwd_state["rel"] = "" if nxt in (".", "/", "\\") else nxt
        else:
            cwd_state["rel"] = ""
        return 0, "", ""
    candidate = os.path.normpath(os.path.join(cwd_rel, target))
    if candidate.startswith("..") or candidate.startswith("/..") or candidate.startswith("\\.."):
        return 1, "", "Access denied: Cannot traverse outside sandbox root directory."
    full_path = resolve_sandbox_path(base_path, "", candidate)
    if os.path.exists(full_path) and os.path.isdir(full_path):
        cwd_state["rel"] = candidate
        return 0, "", ""
    return 1, "", f"cd: {target}: No such file or directory"

def run_single(base_path, cwd_state, parts, stdin=None):
    """Dispatches one command (after pipe/redirection parsing)."""
    base_cmd = parts[0]
    if base_cmd not in ALLOWED_CMDS:
        return 127, "", f"Command '{base_cmd}' is blocked. Use git or standard file utilities (ls, cat, grep, …)."
    if base_cmd == "clear":
        return 0, "", ""   # no-op inside chains; whole-line clear is handled separately
    if base_cmd == "cd":
        return run_cd(base_path, cwd_state, parts)
    if base_cmd == "git":
        violation = git_flag_violation(parts[1:])
        if violation:
            return 128, "", violation
        exec_cwd = resolve_sandbox_path(base_path, cwd_state["rel"])
        code, out, err = verifier.run_git_command(exec_cwd, parts[1:])
        # Surface git's informational messages (it writes many to stderr at exit 0)
        if code == 0 and not out.strip() and err.strip():
            return code, err, ""
        return code, out, err
    return run_sandbox_command(base_path, cwd_state["rel"], parts, stdin=stdin)

def run_pipeline(base_path, cwd_state, segment):
    """Runs one pipeline segment: stages joined by '|', with optional trailing
    '>'/'>>' redirection of the final stdout to a file."""
    redir_tokens = split_unquoted(segment, [">>", ">"])
    cmd_part = redir_tokens[0]
    redir = None
    if len(redir_tokens) >= 3:
        mode = redir_tokens[1]
        try:
            tgt = shlex.split(redir_tokens[2].strip(), posix=os.name != "nt")
        except ValueError:
            tgt = []
        if not tgt:
            return -1, "", "syntax error near redirection: expected filename"
        redir = (mode, tgt[0])

    stages = [s for s in split_unquoted(cmd_part, ["|"]) if s != "|"]
    stdin = None
    code, out, err = 0, "", ""
    ran = False
    for stage in stages:
        stage = stage.strip()
        if not stage:
            continue
        try:
            parts = shlex.split(stage, posix=os.name != "nt")
        except ValueError as exc:
            return -1, "", f"Could not parse command: {exc}"
        if not parts:
            continue
        ran = True
        code, out, err = run_single(base_path, cwd_state, parts, stdin=stdin)
        stdin = out
    if not ran:
        return 0, "", ""

    if redir is not None and code == 0:
        mode, fname = redir
        try:
            tgt_path = resolve_writable_path(base_path, cwd_state["rel"], fname)
            parent = os.path.dirname(tgt_path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            payload = out if (out == "" or out.endswith("\n")) else out + "\n"
            with open(tgt_path, "a" if mode == ">>" else "w", encoding="utf-8") as fh:
                fh.write(payload)
        except Exception as exc:
            return -1, "", str(exc)
        return code, "", err
    return code, out, err

def run_command_line(base_path, cwd_state, cmd_string):
    """Top-level: runs '&&'/';'-separated pipelines, short-circuiting '&&' on failure.
    Returns (exit_code, combined_stdout, combined_stderr)."""
    tokens = split_unquoted(cmd_string, ["&&", ";"])
    segments = tokens[0::2]
    ops = tokens[1::2]   # operator that precedes segments[i+1]
    agg_out, agg_err, last_code = [], [], 0
    for i, seg in enumerate(segments):
        if i > 0 and ops[i - 1] == "&&" and last_code != 0:
            continue   # short-circuit the rest of an && chain
        if not seg.strip():
            continue
        last_code, out, err = run_pipeline(base_path, cwd_state, seg)
        if out:
            agg_out.append(out)
        if err:
            agg_err.append(err)
    return last_code, "\n".join(agg_out), "\n".join(agg_err)

@app.post("/api/terminal/execute")
def execute_terminal_command(data: TerminalExecuteRequest):
    try:
        # 1. Resolve or establish the per-lesson sandbox for this (session, lesson)
        session_id = normalize_session_id(data.session_id)
        sb_key, session_obj = get_or_create_sandbox(session_id, data.lesson_id)
        base_path = session_obj["base_path"]
        cwd_rel = session_obj["cwd_relative"]

        # 2. Whole-line console clear stays a UI signal, not an executed command
        cmd_string = data.command.strip()
        if cmd_string == "clear":
            return {
                "status": "success",
                "output": "CLEAR_CONSOLE",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
            }
        if not cmd_string:
            return {
                "status": "success",
                "output": "",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": build_sync_state(base_path, cwd_rel)
            }

        # 3. Run the full command line (supports && / ; sequencing, | pipes, > >> redirection)
        cwd_state = {"rel": cwd_rel}
        code, stdout, stderr = run_command_line(base_path, cwd_state, cmd_string)
        # Persist any working-directory change made by `cd`
        SESSION_SANDBOXES[sb_key]["cwd_relative"] = cwd_state["rel"]
        cwd_rel = cwd_state["rel"]

        # Wire up the lesson's remote once the repo exists (e.g. after `git init`)
        ensure_lesson_remote(base_path, data.lesson_id)

        # 4. Check exercise checklist checkpoints state on disk!
        verified, v_msg, subtasks = verifier.check_sandbox_state(base_path, data.lesson_id)

        # Save checkpoints state into SQLite database!
        for task in subtasks:
            database.save_user_checkpoint(data.lesson_id, task["id"], task["completed"], data.username)

        if verified:
            database.update_user_progress(data.lesson_id, True, 100, data.username)

        # 5. Build state-sync package to animate frontend React components
        sync_state = build_sync_state(base_path, cwd_rel)

        return {
            "status": "success" if code == 0 else "error",
            "output": stdout if code == 0 else stderr or stdout or "Command returned non-zero code.",
            "exit_code": code,
            "session_id": session_id,
            "verified": verified,
            "validation_message": v_msg,
            "subtasks": subtasks,
            "sync_state": sync_state
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[execute] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while running command.")

@app.post("/api/exercises/reset")
def reset_exercise_sandbox(data: ResetRequest):
    try:
        session_id = normalize_session_id(data.session_id)
        sb_key = sandbox_key(session_id, data.lesson_id)

        # Tear down only this lesson's sandbox, then re-seed it from baseline.
        if sb_key in SESSION_SANDBOXES:
            try:
                shutil.rmtree(SESSION_SANDBOXES[sb_key]["base_path"], ignore_errors=True)
            except Exception:
                pass
            del SESSION_SANDBOXES[sb_key]

        _, session_obj = get_or_create_sandbox(session_id, data.lesson_id)
        temp_dir = session_obj["base_path"]

        # Wipe database progress + checkpoints for this lesson to start fresh!
        database.update_user_progress(data.lesson_id, False, 0, data.username)
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (data.username,))
        user = cursor.fetchone()
        if user:
            user_id = user["id"]
            cursor.execute("DELETE FROM checkpoints WHERE user_id = ? AND lesson_id = ?", (user_id, data.lesson_id))
            conn.commit()
        conn.close()

        # Load baseline checklists + sync state from the freshly seeded sandbox
        _, _, subtasks = verifier.check_sandbox_state(temp_dir, data.lesson_id)

        return {
            "status": "success",
            "message": "Exercise sandbox reset successfully.",
            "session_id": session_id,
            "subtasks": subtasks,
            "sync_state": build_sync_state(temp_dir)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


@app.post("/api/lessons/enter")
def enter_lesson(data: ResetRequest):
    """Get-or-create the per-lesson sandbox on lesson entry, returning its live state
    without running any command. Seeds the lesson baseline on first visit and leaves
    an already-in-progress sandbox untouched so each lesson's terminal persists."""
    try:
        session_id = normalize_session_id(data.session_id)
        _, session_obj = get_or_create_sandbox(session_id, data.lesson_id)
        base_path = session_obj["base_path"]
        cwd_rel = session_obj["cwd_relative"]

        verified, v_msg, subtasks = verifier.check_sandbox_state(base_path, data.lesson_id)

        return {
            "status": "success",
            "session_id": session_id,
            "verified": verified,
            "validation_message": v_msg,
            "subtasks": subtasks,
            "sync_state": build_sync_state(base_path, cwd_rel)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

@app.get("/api/exercises/checkpoints")
def load_checkpoints(lesson_id: int, username: str = "student"):
    try:
        data = database.get_user_checkpoints(lesson_id, username)
        return {"status": "success", "checkpoints": data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

class CommitDetailsRequest(BaseModel):
    commit_hash: str
    session_id: str
    lesson_id: int

@app.post("/api/terminal/commit-details")
def get_commit_details(data: CommitDetailsRequest):
    try:
        sb_key = sandbox_key(normalize_session_id(data.session_id), data.lesson_id)
        if sb_key not in SESSION_SANDBOXES:
            raise HTTPException(status_code=404, detail="Session sandbox not found.")

        base_path = SESSION_SANDBOXES[sb_key]["base_path"]
        if not os.path.exists(os.path.join(base_path, ".git")):
            raise HTTPException(status_code=400, detail="Git repository not initialized in sandbox.")

        import re as _re
        safe_hash = data.commit_hash.strip()
        if not _re.match(r'^[0-9a-f]{4,40}$', safe_hash, _re.IGNORECASE):
            raise HTTPException(status_code=400, detail="Invalid commit hash.")

        code, stdout, stderr = verifier.run_git_command(base_path, ["show", "--stat", safe_hash])
        if code != 0:
            raise HTTPException(status_code=400, detail=stderr or "Failed to retrieve commit details.")
            
        return {
            "status": "success",
            "details": stdout
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


class WriteFileRequest(BaseModel):
    session_id: str
    lesson_id: int
    filename: str
    content: str

@app.post("/api/terminal/write-file")
def write_sandbox_file(data: WriteFileRequest):
    """Writes edited file content into the user's sandbox workspace."""
    try:
        sb_key = sandbox_key(normalize_session_id(data.session_id), data.lesson_id)
        if sb_key not in SESSION_SANDBOXES:
            raise HTTPException(status_code=404, detail="Session sandbox not found.")

        base_path = SESSION_SANDBOXES[sb_key]["base_path"]

        # Security: only allow simple filenames, no path traversal
        filename = os.path.basename(data.filename)
        if not filename or filename.startswith(".git"):
            raise HTTPException(status_code=400, detail="Invalid filename.")

        file_path = os.path.join(base_path, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(data.content)

        return {
            "status": "success",
            "message": f"File '{filename}' saved successfully.",
            "sync_state": build_sync_state(base_path, SESSION_SANDBOXES[sb_key]["cwd_relative"])
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


class RebasePlanItem(BaseModel):
    hash: str
    action: str  # pick | squash | drop | reword
    message: Optional[str] = ""

class RebaseInteractiveRequest(BaseModel):
    session_id: str
    lesson_id: int
    plan: List[RebasePlanItem]

@app.post("/api/terminal/rebase-interactive")
def execute_rebase_interactive(data: RebaseInteractiveRequest):
    """Applies an interactive rebase plan to the sandbox repository."""
    import subprocess
    try:
        sb_key = sandbox_key(normalize_session_id(data.session_id), data.lesson_id)
        if sb_key not in SESSION_SANDBOXES:
            raise HTTPException(status_code=404, detail="Session sandbox not found.")

        base_path = SESSION_SANDBOXES[sb_key]["base_path"]
        if not os.path.exists(os.path.join(base_path, ".git")):
            raise HTTPException(status_code=400, detail="Git repository not initialized.")

        if not data.plan:
            raise HTTPException(status_code=400, detail="Rebase plan must contain at least one commit.")
        if len(data.plan) > 20:
            raise HTTPException(status_code=400, detail="Rebase plan cannot exceed 20 commits.")

        # Build the rebase-todo content
        import re as _re
        _hash_re = _re.compile(r'^[0-9a-f]{4,40}$', _re.IGNORECASE)
        todo_lines = []
        for item in data.plan:
            action = item.action.strip().lower()
            if action not in ("pick", "squash", "fixup", "drop", "reword", "edit"):
                action = "pick"
            # Reject hashes that look like git flags or contain whitespace/newlines
            safe_hash = item.hash.strip()
            if not _hash_re.match(safe_hash):
                raise HTTPException(status_code=400, detail=f"Invalid commit hash: {safe_hash!r}")
            msg = item.message.strip() if item.message else ""
            # Strip newlines from message to prevent todo-file injection
            msg = msg.replace('\n', ' ').replace('\r', '')
            if msg:
                todo_lines.append(f"{action} {safe_hash} {msg}")
            else:
                todo_lines.append(f"{action} {safe_hash}")
        todo_content = "\n".join(todo_lines) + "\n"

        # Write todo to a temp file and use it as GIT_SEQUENCE_EDITOR
        import tempfile as tmpmod
        import sys as _sys
        todo_file = tmpmod.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
        todo_file.write(todo_content)
        todo_file.close()

        # Write a small Python helper that copies our pre-built todo over git's file.
        # Using Python avoids shell-quoting differences ($1 vs %1) across platforms.
        helper_file = tmpmod.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8")
        helper_file.write(f"import shutil, sys\nshutil.copy2({repr(todo_file.name)}, sys.argv[1])\n")
        helper_file.close()
        editor_script = f'{_sys.executable} "{helper_file.name}"'

        env = os.environ.copy()
        env["GIT_SEQUENCE_EDITOR"] = editor_script
        env["GIT_CONFIG_NOSYSTEM"] = "1"
        env["GIT_AUTHOR_NAME"] = "Gitify Student"
        env["GIT_AUTHOR_EMAIL"] = "student@gitify.edu"
        env["GIT_COMMITTER_NAME"] = "Gitify Student"
        env["GIT_COMMITTER_EMAIL"] = "student@gitify.edu"
        env["GIT_EDITOR"] = "true"  # accept default commit messages

        n = len(data.plan)
        result = subprocess.run(
            ["git", "rebase", "-i", f"HEAD~{n}"],
            cwd=base_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            timeout=15
        )

        for _tmp in (todo_file.name, helper_file.name):
            try:
                os.unlink(_tmp)
            except Exception:
                pass

        output = result.stdout or result.stderr or "Rebase complete."
        success = result.returncode == 0

        verified, v_msg, subtasks = verifier.check_sandbox_state(base_path, data.lesson_id)

        return {
            "status": "success" if success else "error",
            "output": output,
            "verified": verified,
            "validation_message": v_msg,
            "subtasks": subtasks,
            "sync_state": build_sync_state(base_path, SESSION_SANDBOXES[sb_key]["cwd_relative"])
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[gitify] internal error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Gitify Python Backend"}
