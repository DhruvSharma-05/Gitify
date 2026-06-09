from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/progress")
def update_progress(data: ProgressUpdate):
    try:
        success = database.update_user_progress(data.lesson_id, data.completed, data.score, data.username)
        if success:
            return {"status": "success", "message": "Progress updated successfully"}
        raise HTTPException(status_code=400, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

SESSION_SANDBOXES = {}
SESSION_ROOT = Path(os.environ.get("GITIFY_SESSION_ROOT", os.path.join(tempfile.gettempdir(), "gitify-sessions"))).resolve()
SESSION_ROOT.mkdir(parents=True, exist_ok=True)

def create_session_dir() -> str:
    return tempfile.mkdtemp(prefix="gitify_session_", dir=str(SESSION_ROOT))

def resolve_sandbox_path(base_path: str, cwd_rel: str, user_path: str = "") -> str:
    base = Path(base_path).resolve()
    candidate = (base / cwd_rel / user_path).resolve()
    if candidate != base and base not in candidate.parents:
        raise ValueError("Access denied: Cannot access outside sandbox.")
    return str(candidate)

def run_sandbox_command(base_path: str, cwd_rel: str, parts: List[str]):
    base_cmd = parts[0]
    args = parts[1:]

    try:
        if base_cmd in ["ls", "dir"]:
            target = resolve_sandbox_path(base_path, cwd_rel, args[0] if args else "")
            if not os.path.exists(target):
                return -1, "", f"{base_cmd}: no such file or directory"
            if os.path.isdir(target):
                return 0, "\n".join(sorted(os.listdir(target))), ""
            return 0, os.path.basename(target), ""

        if base_cmd in ["cat", "type"]:
            if not args:
                return -1, "", f"{base_cmd}: missing file operand"
            target = resolve_sandbox_path(base_path, cwd_rel, args[0])
            with open(target, "r", encoding="utf-8", errors="ignore") as file:
                return 0, file.read(), ""

        if base_cmd == "echo":
            return 0, " ".join(args), ""

        if base_cmd == "touch":
            if not args:
                return -1, "", "touch: missing file operand"
            target = resolve_sandbox_path(base_path, cwd_rel, args[0])
            os.makedirs(os.path.dirname(target), exist_ok=True)
            Path(target).touch()
            return 0, "", ""

        if base_cmd == "mkdir":
            if not args:
                return -1, "", "mkdir: missing operand"
            os.makedirs(resolve_sandbox_path(base_path, cwd_rel, args[0]), exist_ok=True)
            return 0, "", ""

        if base_cmd == "rm":
            if not args:
                return -1, "", "rm: missing operand"
            target = resolve_sandbox_path(base_path, cwd_rel, args[-1])
            if os.path.isdir(target):
                shutil.rmtree(target)
            else:
                os.remove(target)
            return 0, "", ""

        if base_cmd in ["mv", "cp"]:
            if len(args) < 2:
                return -1, "", f"{base_cmd}: missing file operand"
            source = resolve_sandbox_path(base_path, cwd_rel, args[0])
            target = resolve_sandbox_path(base_path, cwd_rel, args[1])
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

@app.post("/api/terminal/execute")
def execute_terminal_command(data: TerminalExecuteRequest):
    try:
        # 1. Resolve or establish unique sandbox path dict
        session_id = data.session_id.strip() if data.session_id else ""
        if not session_id or session_id == "null" or session_id == "undefined":
            session_id = str(uuid.uuid4())
            
        if session_id not in SESSION_SANDBOXES:
            temp_dir = create_session_dir()
            SESSION_SANDBOXES[session_id] = {
                "base_path": temp_dir,
                "cwd_relative": ""
            }
            # Seed default structures
            verifier.initialize_sandbox(temp_dir, data.lesson_id)
            
        session_obj = SESSION_SANDBOXES[session_id]
        base_path = session_obj["base_path"]
        cwd_rel = session_obj["cwd_relative"]
        exec_cwd = resolve_sandbox_path(base_path, cwd_rel)
        
        # Ensure temp folder exists
        if not os.path.exists(base_path):
            temp_dir = create_session_dir()
            SESSION_SANDBOXES[session_id] = {
                "base_path": temp_dir,
                "cwd_relative": ""
            }
            verifier.initialize_sandbox(temp_dir, data.lesson_id)
            session_obj = SESSION_SANDBOXES[session_id]
            base_path = session_obj["base_path"]
            cwd_rel = ""
            exec_cwd = base_path
        
        # 2. Strict command verification & security check
        cmd_string = data.command.strip()
        try:
            parts = shlex.split(cmd_string, posix=os.name != "nt")
        except ValueError as exc:
            return {
                "status": "error",
                "output": f"Could not parse command: {exc}",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
            }
        if not parts:
            return {
                "status": "success",
                "output": "",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
            }
            
        base_cmd = parts[0]
        allowed_cmds = ["git", "ls", "dir", "cat", "type", "echo", "clear", "cd", "touch", "mkdir", "rm", "mv", "cp"]
        if base_cmd not in allowed_cmds:
            return {
                "status": "error",
                "output": f"Command '{base_cmd}' is blocked. Please only run standard Git commands or inspect/file utilities (git, ls, cat, cd, touch, mkdir, rm).",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
            }
            
        if base_cmd == "clear":
            return {
                "status": "success",
                "output": "CLEAR_CONSOLE",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
            }
            
        # 2b. Natively resolve directory traversals (cd)
        if base_cmd == "cd":
            target = parts[1] if len(parts) > 1 else ""
            if not target or target == "~":
                new_cwd_rel = ""
            elif target == "..":
                if cwd_rel:
                    new_cwd_rel = os.path.dirname(cwd_rel)
                    if new_cwd_rel == "." or new_cwd_rel == "/" or new_cwd_rel == "\\":
                        new_cwd_rel = ""
                else:
                    new_cwd_rel = ""
            else:
                candidate = os.path.normpath(os.path.join(cwd_rel, target))
                if candidate.startswith("..") or candidate.startswith("/..") or candidate.startswith("\\.."):
                    return {
                        "status": "error",
                        "output": "Access denied: Cannot traverse outside sandbox root directory.",
                        "session_id": session_id,
                        "verified": False,
                        "validation_message": "",
                        "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
                    }
                
                full_path = resolve_sandbox_path(base_path, "", candidate)
                if os.path.exists(full_path) and os.path.isdir(full_path):
                    new_cwd_rel = candidate
                else:
                    return {
                        "status": "error",
                        "output": f"cd: {target}: No such file or directory",
                        "session_id": session_id,
                        "verified": False,
                        "validation_message": "",
                        "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": [], "pwd": cwd_rel}
                    }
            
            # Save CWD status
            SESSION_SANDBOXES[session_id]["cwd_relative"] = new_cwd_rel
            
            # Fetch current branch
            current_branch = "main"
            if os.path.exists(os.path.join(base_path, ".git")):
                _, branch_out, _ = verifier.run_git_command(base_path, ["rev-parse", "--abbrev-ref", "HEAD"])
                if branch_out.strip():
                    current_branch = branch_out.strip()
                    
            return {
                "status": "success",
                "output": "",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {
                    "branch": current_branch,
                    "files": [],
                    "stashes": [],
                    "picked": [],
                    "pwd": new_cwd_rel
                }
            }
            
        # 3. Execute command
        if base_cmd == "git":
            code, stdout, stderr = verifier.run_git_command(exec_cwd, parts[1:])
        else:
            code, stdout, stderr = run_sandbox_command(base_path, cwd_rel, parts)
                
        # 4. Check exercise checklist checkpoints state on disk!
        verified, v_msg, subtasks = verifier.check_sandbox_state(base_path, data.lesson_id)
        
        # Save checkpoints state into SQLite database!
        for task in subtasks:
            database.save_user_checkpoint(data.lesson_id, task["id"], task["completed"], data.username)
            
        if verified:
            database.update_user_progress(data.lesson_id, True, 100, data.username)
            
        # 5. Build state-sync package to animate frontend React components
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
                    
        # Inspect files on disk
        try:
            for item in os.listdir(base_path):
                if item != ".git" and os.path.isfile(os.path.join(base_path, item)):
                    files_list.append(item)
        except Exception:
            pass
            
        # Get live git commit DAG and file contents
        commits_graph = verifier.get_live_commit_graph(base_path)
        file_contents = verifier.get_workspace_files_content(base_path)

        return {
            "status": "success" if code == 0 else "error",
            "output": stdout if code == 0 else stderr or stdout or "Command returned non-zero code.",
            "exit_code": code,
            "session_id": session_id,
            "verified": verified,
            "validation_message": v_msg,
            "subtasks": subtasks,
            "sync_state": {
                "branch": current_branch,
                "files": files_list,
                "stashes": stashes_list,
                "picked": picked_commits,
                "pwd": cwd_rel,
                "commits_graph": commits_graph,
                "file_contents": file_contents
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/exercises/reset")
def reset_exercise_sandbox(data: ResetRequest):
    try:
        session_id = data.session_id.strip() if data.session_id else ""
        if not session_id or session_id == "null" or session_id == "undefined":
            session_id = str(uuid.uuid4())
            
        if session_id in SESSION_SANDBOXES:
            old_path = SESSION_SANDBOXES[session_id]["base_path"]
            try:
                shutil.rmtree(old_path, ignore_errors=True)
            except Exception:
                pass
                
        temp_dir = create_session_dir()
        SESSION_SANDBOXES[session_id] = {
            "base_path": temp_dir,
            "cwd_relative": ""
        }
        
        # Run baseline setups
        verifier.initialize_sandbox(temp_dir, data.lesson_id)
        
        # Wipe database checkpoints for this lesson to start fresh!
        # Get user progress from db to verify baseline
        database.update_user_progress(data.lesson_id, False, 0, data.username)
        # Clear out checkpoints in database
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (data.username,))
        user = cursor.fetchone()
        if user:
            user_id = user["id"]
            cursor.execute("DELETE FROM checkpoints WHERE user_id = ? AND lesson_id = ?", (user_id, data.lesson_id))
            conn.commit()
        conn.close()
        
        # Load baseline checklists from verifier
        _, _, subtasks = verifier.check_sandbox_state(temp_dir, data.lesson_id)
        
        # Calculate baseline commits graph and file contents
        commits_graph = verifier.get_live_commit_graph(temp_dir)
        file_contents = verifier.get_workspace_files_content(temp_dir)
        
        files_list = []
        try:
            for item in os.listdir(temp_dir):
                if item != ".git" and os.path.isfile(os.path.join(temp_dir, item)):
                    files_list.append(item)
        except Exception:
            pass
            
        current_branch = "main"
        if data.lesson_id == 5:
            current_branch = "feature/payments"
            
        return {
            "status": "success",
            "message": "Exercise sandbox reset successfully.",
            "session_id": session_id,
            "subtasks": subtasks,
            "sync_state": {
                "branch": current_branch,
                "files": files_list,
                "stashes": [],
                "picked": [],
                "pwd": "",
                "commits_graph": commits_graph,
                "file_contents": file_contents
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/exercises/checkpoints")
def load_checkpoints(lesson_id: int, username: str = "student"):
    try:
        data = database.get_user_checkpoints(lesson_id, username)
        return {"status": "success", "checkpoints": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CommitDetailsRequest(BaseModel):
    commit_hash: str
    session_id: str

@app.post("/api/terminal/commit-details")
def get_commit_details(data: CommitDetailsRequest):
    try:
        session_id = data.session_id.strip()
        if session_id not in SESSION_SANDBOXES:
            raise HTTPException(status_code=404, detail="Session sandbox not found.")
            
        base_path = SESSION_SANDBOXES[session_id]["base_path"]
        if not os.path.exists(os.path.join(base_path, ".git")):
            raise HTTPException(status_code=400, detail="Git repository not initialized in sandbox.")
            
        code, stdout, stderr = verifier.run_git_command(base_path, ["show", "--stat", data.commit_hash])
        if code != 0:
            raise HTTPException(status_code=400, detail=stderr or "Failed to retrieve commit details.")
            
        return {
            "status": "success",
            "details": stdout
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Gitify Python Backend"}



