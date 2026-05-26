from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import database
import verifier

app = FastAPI(title="Gitify API", version="0.1.0")

# Setup CORS middleware to allow cross-origin requests from our React App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

import tempfile
import uuid
import os
import subprocess

SESSION_SANDBOXES = {}

@app.post("/api/terminal/execute")
def execute_terminal_command(data: TerminalExecuteRequest):
    try:
        # 1. Resolve or establish unique sandbox path
        session_id = data.session_id.strip() if data.session_id else ""
        if not session_id or session_id == "null" or session_id == "undefined":
            session_id = str(uuid.uuid4())
            
        if session_id not in SESSION_SANDBOXES:
            temp_dir = tempfile.mkdtemp(prefix="gitify_session_")
            SESSION_SANDBOXES[session_id] = temp_dir
            # Seed default structures
            verifier.initialize_sandbox(temp_dir, data.lesson_id)
            
        repo_path = SESSION_SANDBOXES[session_id]
        
        # 2. Strict command verification & security check
        cmd_string = data.command.strip()
        parts = cmd_string.split()
        if not parts:
            return {
                "status": "success",
                "output": "",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": []}
            }
            
        base_cmd = parts[0]
        if base_cmd not in ["git", "ls", "dir", "cat", "type", "echo", "clear"]:
            return {
                "status": "error",
                "output": f"Command '{base_cmd}' is blocked. Please only run standard Git commands (git add, git commit, etc.) or inspect commands (ls, cat).",
                "session_id": session_id,
                "verified": False,
                "validation_message": "",
                "sync_state": {"branch": "main", "files": [], "stashes": [], "picked": []}
            }
            
        if base_cmd == "clear":
            return {
                "status": "success",
                "output": "CLEAR_CONSOLE",
                "session_id": session_id,
                "verified": False,
                "validation_message": ""
            }
            
        # 3. Execute
        if base_cmd == "git":
            code, stdout, stderr = verifier.run_git_command(repo_path, parts[1:])
        else:
            try:
                res = subprocess.run(
                    parts,
                    cwd=repo_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=4,
                    shell=True if os.name == 'nt' else False
                )
                code, stdout, stderr = res.returncode, res.stdout, res.stderr
            except Exception as e:
                code, stdout, stderr = -1, "", str(e)
                
        # 4. Check if exercise is completed on disk
        verified, v_msg = verifier.check_sandbox_state(repo_path, data.lesson_id)
        if verified:
            database.update_user_progress(data.lesson_id, True, 100, data.username)
            
        # 5. Build state-sync package to animate frontend React components
        current_branch = "main"
        files_list = []
        stashes_list = []
        picked_commits = []
        
        if os.path.exists(os.path.join(repo_path, ".git")):
            _, branch_out, _ = verifier.run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
            if branch_out.strip():
                current_branch = branch_out.strip()
                
            _, stash_out, _ = verifier.run_git_command(repo_path, ["stash", "list"])
            if stash_out.strip():
                for idx, line in enumerate(stash_out.strip().split("\n")):
                    label = line.split(":", 2)[-1].strip() if ":" in line else line
                    stashes_list.append({
                        "id": idx,
                        "name": f"stash@{{{idx}}}",
                        "label": label,
                        "files": ["Checkout.jsx", "styles.css"] # Mock visual representation
                    })
                    
            _, log_out, _ = verifier.run_git_command(repo_path, ["log", "--oneline", "-n", "10"])
            if log_out.strip():
                for line in log_out.strip().split("\n"):
                    picked_commits.append(line.split()[0])
                    
        # Inspect files on disk
        try:
            for item in os.listdir(repo_path):
                if item != ".git" and os.path.isfile(os.path.join(repo_path, item)):
                    files_list.append(item)
        except Exception:
            pass
            
        return {
            "status": "success" if code == 0 else "error",
            "output": stdout if code == 0 else stderr or stdout or "Command returned non-zero code.",
            "exit_code": code,
            "session_id": session_id,
            "verified": verified,
            "validation_message": v_msg,
            "sync_state": {
                "branch": current_branch,
                "files": files_list,
                "stashes": stashes_list,
                "picked": picked_commits
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Gitify Python Backend"}

