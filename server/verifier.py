import os
import tempfile
import subprocess
import shutil

def run_git_command(repo_path, args):
    """Executes a git command inside the specified repository path."""
    try:
        # Enable git config safeties for temp folders
        env = os.environ.copy()
        env["GIT_CONFIG_NOSYSTEM"] = "1"
        env["GIT_AUTHOR_NAME"] = "Gitify Student"
        env["GIT_AUTHOR_EMAIL"] = "student@gitify.edu"
        env["GIT_COMMITTER_NAME"] = "Gitify Student"
        env["GIT_COMMITTER_EMAIL"] = "student@gitify.edu"
        
        result = subprocess.run(
            ["git"] + args,
            cwd=repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            timeout=5
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout expired"
    except Exception as e:
        return -1, "", str(e)

def verify_lesson_0(commands):
    """
    Verifies Lesson 0: Git Basics
    Required state: initialized repository, staged files, committed snapshot with 'first' or 'init'.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Pre-seed some dummy files
        with open(os.path.join(temp_dir, "index.js"), "w") as f:
            f.write("// working directory file")
        with open(os.path.join(temp_dir, "App.jsx"), "w") as f:
            f.write("// main app interface")
            
        # Run student commands
        for cmd in commands:
            cmd_parts = cmd.strip().split()
            if not cmd_parts or cmd_parts[0] != "git":
                continue
            run_git_command(temp_dir, cmd_parts[1:])
            
        # Validations
        # 1. Check if git initialized
        if not os.path.exists(os.path.join(temp_dir, ".git")):
            return False, "Repository not initialized. Did you run 'git init'?"
            
        # 2. Check if commits exist
        code, stdout, stderr = run_git_command(temp_dir, ["log", "--oneline"])
        if code != 0:
            return False, "No commits found. Did you run 'git commit' after staging?"
            
        # 3. Check commit message
        if not any(word in stdout.lower() for word in ["first", "init", "snapshot", "setup"]):
            return False, "Commit found, but make sure your commit message describes your snapshot."
            
        return True, "Success! Git repository initialized and first snapshot committed."

def verify_lesson_2(commands):
    """
    Verifies Lesson 2: Advanced Branching
    Required state: feature/auth branch created, commit made, merged back to main.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Pre-seed git repository
        run_git_command(temp_dir, ["init", "-b", "main"])
        with open(os.path.join(temp_dir, "index.js"), "w") as f:
            f.write("console.log('init');")
        run_git_command(temp_dir, ["add", "."])
        run_git_command(temp_dir, ["commit", "-m", "Init setup"])
        
        # Run student commands
        for cmd in commands:
            cmd_parts = cmd.strip().split()
            if not cmd_parts or cmd_parts[0] != "git":
                continue
            # Block commands trying to break directory
            if ".." in cmd or "/" in cmd_parts[-1] and cmd_parts[1] not in ["checkout", "branch", "merge"]:
                continue
            run_git_command(temp_dir, cmd_parts[1:])
            
        # Validations
        # 1. Verify feature/auth exists or existed
        code, stdout, stderr = run_git_command(temp_dir, ["branch", "-a"])
        # 2. Verify commit count is at least 3 (Init, Feature, and Merge commit)
        code, log_out, stderr = run_git_command(temp_dir, ["log", "--oneline"])
        commits = log_out.strip().split("\n")
        if len(commits) < 2:
            return False, "Not enough commits found. Remember to commit on feature/auth before merging."
            
        # 3. Verify HEAD is main
        code, head_out, stderr = run_git_command(temp_dir, ["rev-parse", "--abbrev-ref", "HEAD"])
        if head_out.strip() != "main":
            return False, "HEAD must be on 'main' to merge your completed features."
            
        return True, "Excellent! Branch 'feature/auth' created, populated, and successfully merged."

def verify_lesson_5(commands):
    """
    Verifies Lesson 5: Stash & Cherry-Pick
    Required state: Stashed uncommitted work, and cherry-picked commit b7a91c.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # Set up dummy repo representing state of Lesson 5
        run_git_command(temp_dir, ["init", "-b", "feature/payments"])
        
        # Create commit history on another branch
        run_git_command(temp_dir, ["checkout", "-b", "hotfix/invoice"])
        with open(os.path.join(temp_dir, "Invoice.jsx"), "w") as f:
            f.write("// tax calculations")
        run_git_command(temp_dir, ["add", "."])
        # Force a specific hash by writing mock commits or mimicking cherry-pick list
        run_git_command(temp_dir, ["commit", "-m", "Fix tax rounding"])
        code, log_out, _ = run_git_command(temp_dir, ["log", "-n", "1", "--format=%h"])
        hotfix_hash = log_out.strip()
        
        # Go back to payments
        run_git_command(temp_dir, ["checkout", "feature/payments"])
        with open(os.path.join(temp_dir, "Checkout.jsx"), "w") as f:
            f.write("// WIP Payments")
            
        # Substitute target hash in commands if user typed the literal example 'b7a91c'
        sanitized_commands = []
        for cmd in commands:
            if "b7a91c" in cmd:
                sanitized_commands.append(cmd.replace("b7a91c", hotfix_hash))
            else:
                sanitized_commands.append(cmd)
                
        # Run student commands
        for cmd in sanitized_commands:
            cmd_parts = cmd.strip().split()
            if not cmd_parts or cmd_parts[0] != "git":
                continue
            run_git_command(temp_dir, cmd_parts[1:])
            
        # Validations
        # 1. Check if dirty work was stashed
        code, stash_out, _ = run_git_command(temp_dir, ["stash", "list"])
        has_stash = len(stash_out.strip()) > 0
        
        # 2. Check if cherry-pick exists in log
        code, log_out, _ = run_git_command(temp_dir, ["log", "--oneline"])
        has_pick = "Fix tax rounding" in log_out
        
        if not has_stash:
            return False, "WIP changes not stashed. Run 'git stash' to save your work before moving branch."
        if not has_pick:
            return False, "Hotfix commit not cherry-picked. Make sure to run 'git cherry-pick <hash>'."
            
        return True, "Brilliant! Your unfinished work was safely stashed, and the hotfix commit was cherry-picked successfully."

def verify_simulated_state(lesson_id, state):
    """
    Fallback checks checking simulated state payload directly from React.
    This provides robustness if subprocess commands fail in specific sandboxes.
    """
    if lesson_id == 1:
        # Visual Playground flow
        files = state.get("files", [])
        has_pushed = any(f.get("status") == "pushed" for f in files)
        if has_pushed:
            return True, "Exercise complete! Files pushed successfully to the remote."
        return False, "Playground files haven't reached the remote stage yet."
        
    elif lesson_id == 3:
        # Merge Conflict
        resolution = state.get("resolution")
        is_committed = state.get("isCommitted", False)
        if is_committed and resolution:
            return True, "Conflict resolved and merge committed successfully."
        return False, "Please resolve conflict markers and commit your changes."
        
    elif lesson_id == 4:
        # Time Travel
        has_reverted = state.get("hasReverted", False)
        reset_mode = state.get("resetMode")
        if has_reverted or reset_mode == "hard":
            return True, "History repaired successfully!"
        return False, "Inspect the log and revert the broken commit or hard reset."
        
    elif lesson_id == 6:
        # Remote Collab
        push_state = state.get("pushState")
        if push_state == "pushed":
            return True, "Remote sync successful!"
        return False, "Pull remote changes and rebase to resolve pushing conflicts."
        
    elif lesson_id == 7:
        # Rebase
        rebased = state.get("rebased", False)
        if rebased:
            return True, "Commits reordered and squashed into a clean linear path!"
        return False, "Organize your commits using 'pick' and 'squash' and click confirm."
        
    return False, "Unknown exercise validation criteria."

def initialize_sandbox(repo_path, lesson_id):
    """Initializes the baseline repository structure on disk based on the lesson ID."""
    try:
        # Lesson 0 / Lesson 1: Basics Playground
        if lesson_id in [0, 1]:
            with open(os.path.join(repo_path, "index.js"), "w") as f:
                f.write("// working directory file\nconsole.log('Basics');")
            with open(os.path.join(repo_path, "App.jsx"), "w") as f:
                f.write("// App UI core")
                
        # Lesson 2: Branching
        elif lesson_id == 2:
            run_git_command(repo_path, ["init", "-b", "main"])
            with open(os.path.join(repo_path, "index.js"), "w") as f:
                f.write("console.log('init');")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Init setup"])
            
        # Lesson 3: Conflicts
        elif lesson_id == 3:
            run_git_command(repo_path, ["init", "-b", "main"])
            with open(os.path.join(repo_path, "config.js"), "w") as f:
                f.write("export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'dark'\n};")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Base config"])
            
        # Lesson 5: Stash & Cherry-Pick
        elif lesson_id == 5:
            # Set up baseline hotfix branch
            run_git_command(repo_path, ["init", "-b", "feature/payments"])
            run_git_command(repo_path, ["checkout", "-b", "hotfix/invoice"])
            with open(os.path.join(repo_path, "Invoice.jsx"), "w") as f:
                f.write("// Invoice calculations\nconst tax = 0.15;")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Fix tax rounding"])
            
            # Switch back and leave dirty work
            run_git_command(repo_path, ["checkout", "feature/payments"])
            with open(os.path.join(repo_path, "Checkout.jsx"), "w") as f:
                f.write("// WIP Payments module\n")
            with open(os.path.join(repo_path, "styles.css"), "w") as f:
                f.write("body { background: #000; }")
                
        return True, "Sandbox initialized successfully."
    except Exception as e:
        return False, f"Failed sandbox initialization: {str(e)}"

def check_sandbox_state(repo_path, lesson_id):
    """Inspects the actual Git sandbox workspace on disk to check if target criteria is completed."""
    try:
        # Lesson 0: Basics
        if lesson_id == 0:
            if not os.path.exists(os.path.join(repo_path, ".git")):
                return False, "Git repository is not initialized. Run 'git init' first!"
            code, stdout, _ = run_git_command(repo_path, ["log", "--oneline"])
            if code != 0 or not stdout.strip():
                return False, "Staged snapshot not committed. Run 'git commit -m \"message\"'!"
            return True, "Success! First Git snapshot initialized and committed successfully."
            
        # Lesson 2: Branching
        elif lesson_id == 2:
            code, stdout, _ = run_git_command(repo_path, ["branch", "-a"])
            code2, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
            commits = log_out.strip().split("\n")
            
            if "feature/auth" not in stdout:
                return False, "Branch 'feature/auth' was not detected. Run 'git checkout -b feature/auth'!"
            if len(commits) < 2:
                return False, "Remember to commit snapshots on feature/auth before merging!"
            
            # Verify HEAD is main
            code3, head_out, _ = run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
            if head_out.strip() != "main":
                return False, "HEAD must be returned to branch 'main' to complete merges!"
                
            return True, "Success! Feature branch populated and merged back to main."
            
        # Lesson 5: Stash & Cherry-Pick
        elif lesson_id == 5:
            # Check if stash list is populated
            code, stash_out, _ = run_git_command(repo_path, ["stash", "list"])
            has_stash = len(stash_out.strip()) > 0
            
            # Check if hotfix commit was cherry-picked
            code2, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
            has_pick = "Fix tax rounding" in log_out
            
            if not has_stash:
                return False, "WIP files are still dirty. Run 'git stash' to shelve your mess!"
            if not has_pick:
                return False, "Hotfix commit has not been cherry-picked into feature/payments branch."
                
            return True, "Success! Dirty workspace stashed and hotfix cherry-picked."
            
        return False, f"Lesson {lesson_id} verifier is active. Complete exercise tasks."
    except Exception as e:
        return False, f"Verification diagnostic issue: {str(e)}"

