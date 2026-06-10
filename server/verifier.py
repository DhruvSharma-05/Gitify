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
        if not os.path.exists(os.path.join(temp_dir, ".git")):
            return False, "Repository not initialized. Did you run 'git init'?"
            
        code, stdout, stderr = run_git_command(temp_dir, ["log", "--oneline"])
        if code != 0:
            return False, "No commits found. Did you run 'git commit' after staging?"
            
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
            if ".." in cmd or "/" in cmd_parts[-1] and cmd_parts[1] not in ["checkout", "branch", "merge"]:
                continue
            run_git_command(temp_dir, cmd_parts[1:])
            
        # Validations
        code, stdout, stderr = run_git_command(temp_dir, ["branch", "-a"])
        br_exists = "feature/auth" in stdout
        if not br_exists:
            return False, "Branch 'feature/auth' not found."

        code, merged_branches, _ = run_git_command(temp_dir, ["branch", "--merged"])
        if "feature/auth" not in merged_branches:
            return False, "Branch 'feature/auth' is not merged into main."

        code, log_out, stderr = run_git_command(temp_dir, ["log", "--oneline"])
        commits = log_out.strip().split("\n")
        if len(commits) < 2:
            return False, "Not enough commits found. Remember to commit on feature/auth before merging."
            
        code, head_out, stderr = run_git_command(temp_dir, ["rev-parse", "--abbrev-ref", "HEAD"])
        if head_out.strip() != "main":
            return False, "HEAD must be on 'main' to merge your completed features."
            
        return True, "Excellent! Branch 'feature/auth' created, populated, and successfully merged."

def verify_lesson_5(commands):
    """
    Verifies Lesson 5: Stash & Cherry-Pick
    Required state: Stashed uncommitted work, and cherry-picked commit.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        run_git_command(temp_dir, ["init", "-b", "feature/payments"])
        
        run_git_command(temp_dir, ["checkout", "-b", "hotfix/invoice"])
        with open(os.path.join(temp_dir, "Invoice.jsx"), "w") as f:
            f.write("// tax calculations")
        run_git_command(temp_dir, ["add", "."])
        run_git_command(temp_dir, ["commit", "-m", "Fix tax rounding"])
        code, log_out, _ = run_git_command(temp_dir, ["log", "-n", "1", "--format=%h"])
        hotfix_hash = log_out.strip()
        
        run_git_command(temp_dir, ["checkout", "feature/payments"])
        with open(os.path.join(temp_dir, "Checkout.jsx"), "w") as f:
            f.write("// WIP Payments")
            
        sanitized_commands = []
        for cmd in commands:
            if "b7a91c" in cmd:
                sanitized_commands.append(cmd.replace("b7a91c", hotfix_hash))
            else:
                sanitized_commands.append(cmd)
                
        for cmd in sanitized_commands:
            cmd_parts = cmd.strip().split()
            if not cmd_parts or cmd_parts[0] != "git":
                continue
            run_git_command(temp_dir, cmd_parts[1:])
            
        code, stash_out, _ = run_git_command(temp_dir, ["stash", "list"])
        has_stash = len(stash_out.strip()) > 0 or (os.path.exists(os.path.join(temp_dir, "Checkout.jsx")) and os.path.exists(os.path.join(temp_dir, "styles.css")))
        
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
        files = state.get("files", [])
        has_pushed = any(f.get("status") == "pushed" for f in files)
        if has_pushed:
            return True, "Exercise complete! Files pushed successfully to the remote."
        return False, "Playground files haven't reached the remote stage yet."
        
    elif lesson_id == 3:
        resolution = state.get("resolution")
        is_committed = state.get("isCommitted", False)
        if is_committed and resolution:
            return True, "Conflict resolved and merge committed successfully."
        return False, "Please resolve conflict markers and commit your changes."
        
    elif lesson_id == 4:
        has_reverted = state.get("hasReverted", False)
        reset_mode = state.get("resetMode")
        if has_reverted or reset_mode == "hard":
            return True, "History repaired successfully!"
        return False, "Inspect the log and revert the broken commit or hard reset."
        
    elif lesson_id == 5:
        files = state.get("files", [])
        picked = state.get("picked", [])
        has_pick = "b7a91c" in picked
        has_popped = "Checkout.jsx" in files and "styles.css" in files
        if has_pick and has_popped:
            return True, "Stash and cherry-pick completed successfully!"
        if not has_pick:
            return False, "Please cherry-pick the hotfix commit b7a91c."
        return False, "Please stash your WIP files, switch branches, cherry-pick, and then pop your stash."

    elif lesson_id == 6:
        push_state = state.get("pushState")
        if push_state == "pushed":
            return True, "Remote sync successful!"
        return False, "Pull remote changes and rebase to resolve pushing conflicts."
        
    elif lesson_id == 7:
        rebased = state.get("rebased", False)
        if rebased:
            return True, "Commits reordered and squashed into a clean linear path!"
        return False, "Organize your commits using 'pick' and 'squash' and click confirm."
        
    return False, "Unknown exercise validation criteria."

def initialize_sandbox(repo_path, lesson_id):
    """Initializes the baseline repository structure on disk based on the lesson ID."""
    try:
        # Purge existing files first to get a clean baseline
        for item in os.listdir(repo_path):
            item_path = os.path.join(repo_path, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path, ignore_errors=True)
            else:
                os.remove(item_path)

        # Lesson 0 / Lesson 1: Basics Playground
        if lesson_id in [0, 1]:
            with open(os.path.join(repo_path, "index.js"), "w") as f:
                f.write("// working directory file\nconsole.log('Basics');")
            with open(os.path.join(repo_path, "App.jsx"), "w") as f:
                f.write("// App UI core")
            
            # Setup a bare remote repository locally next to the sandbox for a realistic Lesson 1 push
            remote_dir = repo_path + "_remote.git"
            if os.path.exists(remote_dir):
                shutil.rmtree(remote_dir, ignore_errors=True)
            os.makedirs(remote_dir, exist_ok=True)
            subprocess.run(["git", "init", "--bare"], cwd=remote_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
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
            config_path = os.path.join(repo_path, "config.js")
            with open(config_path, "w") as f:
                f.write("export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'dark'\n};\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Base config"])
            
            # Create feature/ui branch and edit line 4
            run_git_command(repo_path, ["checkout", "-b", "feature/ui"])
            with open(config_path, "w") as f:
                f.write("export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'light'\n};\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "ui polish"])
            
            # Switch back to main and edit differently
            run_git_command(repo_path, ["checkout", "main"])
            with open(config_path, "w") as f:
                f.write("export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'system'\n};\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "auth config"])
            
        # Lesson 4: Git History & Time Travel
        elif lesson_id == 4:
            run_git_command(repo_path, ["init", "-b", "main"])
            # Commit 1
            with open(os.path.join(repo_path, "Dashboard.jsx"), "w") as f: f.write("// Dashboard core\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Initial dashboard"])
            # Commit 2
            with open(os.path.join(repo_path, "auth.js"), "w") as f: f.write("// Auth middleware\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Add auth guard"])
            # Commit 3
            with open(os.path.join(repo_path, "metrics.js"), "w") as f: f.write("// Cache analytics\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Cache metrics"])
            # Commit 4
            with open(os.path.join(repo_path, "Chart.jsx"), "w") as f: f.write("// Chart layout\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Tune chart layout"])
            # Commit 5 (buggy)
            with open(os.path.join(repo_path, "metrics.js"), "w") as f: f.write("return metric.value.toFixed(2)\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Skip null metric check"])
            # Commit 6
            with open(os.path.join(repo_path, "Spinner.jsx"), "w") as f: f.write("// Spinner feedback\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Polish loading state"])
            # Commit 7
            with open(os.path.join(repo_path, "deploy.yml"), "w") as f: f.write("replicas: 1\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Update deploy config"])
            # Commit 8
            with open(os.path.join(repo_path, "CHANGELOG.md"), "w") as f: f.write("version: 1.3.2\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Release production"])

        # Lesson 5: Stash & Cherry-Pick
        elif lesson_id == 5:
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

        # Lesson 6: Remote Collaboration
        elif lesson_id == 6:
            # Create local bare remote
            remote_dir = repo_path + "_remote.git"
            if os.path.exists(remote_dir):
                shutil.rmtree(remote_dir, ignore_errors=True)
            os.makedirs(remote_dir, exist_ok=True)
            subprocess.run(["git", "init", "--bare"], cwd=remote_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Init user sandbox
            run_git_command(repo_path, ["init", "-b", "main"])
            run_git_command(repo_path, ["remote", "add", "origin", remote_dir])
            
            with open(os.path.join(repo_path, "README.md"), "w") as f:
                f.write("# Gitify Collab Project\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Init project"])
            run_git_command(repo_path, ["push", "-u", "origin", "main"])
            
            # Simulate classmate pushing 2 commits on remote
            with tempfile.TemporaryDirectory() as teammate_dir:
                subprocess.run(["git", "clone", remote_dir, teammate_dir], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                # Commit 1
                with open(os.path.join(teammate_dir, "ui.js"), "w") as f:
                    f.write("// Sam: UI navbar polish\n")
                subprocess.run(["git", "add", "."], cwd=teammate_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                subprocess.run(["git", "-c", "user.name=Sam", "-c", "user.email=sam@gitify.edu", "commit", "-m", "nav polish"], cwd=teammate_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                # Commit 2
                with open(os.path.join(teammate_dir, "api.js"), "w") as f:
                    f.write("// Priya: endpoint cache retry logic\n")
                subprocess.run(["git", "add", "."], cwd=teammate_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                subprocess.run(["git", "-c", "user.name=Priya", "-c", "user.email=priya@gitify.edu", "commit", "-m", "retry logic"], cwd=teammate_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                subprocess.run(["git", "push", "origin", "main"], cwd=teammate_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
            # Create a conflicting local commit in the user sandbox so they have to rebase/pull!
            with open(os.path.join(repo_path, "auth.js"), "w") as f:
                f.write("// Student local changes: login form implementation\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "login form"])

        # Lesson 7: Rebase & Clean History
        elif lesson_id == 7:
            run_git_command(repo_path, ["init", "-b", "main"])
            with open(os.path.join(repo_path, "app.js"), "w") as f:
                f.write("// Main application core\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Base commit"])
            
            # Add Checkout form
            with open(os.path.join(repo_path, "checkout.js"), "w") as f:
                f.write("// checkout form component\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Add checkout form"])
            
            # Typo commit
            with open(os.path.join(repo_path, "checkout.js"), "w") as f:
                f.write("// checkout form component - fixed typo in layout labels\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Fix typo in payment copy"])
            
            # Stripe commit
            with open(os.path.join(repo_path, "stripe.js"), "w") as f:
                f.write("// stripe integration helper\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Wire Stripe token"])
            
            # Debug commit (should be dropped)
            with open(os.path.join(repo_path, "debug.txt"), "w") as f:
                f.write("temporary payment debug file\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "debug payment state"])
            
            # declined cards commit
            with open(os.path.join(repo_path, "checkout.js"), "w") as f:
                f.write("// checkout form component - fixed typo in layout labels and handled declined cards\n")
            run_git_command(repo_path, ["add", "."])
            run_git_command(repo_path, ["commit", "-m", "Handle declined cards"])
                
        return True, "Sandbox initialized successfully."
    except Exception as e:
        return False, f"Failed sandbox initialization: {str(e)}"

def check_sandbox_state(repo_path, lesson_id):
    """
    Inspects the actual Git sandbox workspace on disk to check if target criteria is completed.
    Returns: (verified: bool, validation_message: str, subtasks: list[dict])
    """
    subtasks = []
    try:
        # Lesson 0: Git Basics
        if lesson_id == 0:
            init_done = os.path.exists(os.path.join(repo_path, ".git"))
            
            # Check staged
            stage_done = False
            if init_done:
                code, stdout, _ = run_git_command(repo_path, ["status", "--porcelain"])
                # If there is something in the index, or we already have commits
                code_log, _, _ = run_git_command(repo_path, ["log"])
                stage_done = (code == 0 and any(line.startswith(('A', 'M', 'D', 'R')) for line in stdout.splitlines())) or (code_log == 0)
                
            # Check committed
            commit_done = False
            if init_done:
                code, stdout, _ = run_git_command(repo_path, ["log", "--oneline"])
                commit_done = (code == 0 and len(stdout.strip()) > 0)
                
            subtasks = [
                {"id": "init", "title": "Initialize Git repository ('git init')", "completed": init_done},
                {"id": "stage", "title": "Stage changes ('git add')", "completed": stage_done},
                {"id": "commit", "title": "Commit a snapshot ('git commit')", "completed": commit_done}
            ]
            
            verified = init_done and stage_done and commit_done
            msg = "Git repository initialized, files staged and committed successfully!" if verified else "Keep working on your terminal steps."
            return verified, msg, subtasks

        # Lesson 1: Visual Playground
        elif lesson_id == 1:
            init_done = os.path.exists(os.path.join(repo_path, ".git"))
            
            stage_done = False
            commit_done = False
            push_done = False
            
            if init_done:
                # Stage
                code, stdout, _ = run_git_command(repo_path, ["status", "--porcelain"])
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
                stage_done = (code == 0 and any(line.startswith(('A', 'M', 'D', 'R')) for line in stdout.splitlines())) or (code_log == 0)
                
                # Commit
                commit_done = (code_log == 0 and len(log_out.strip()) > 0)
                
                # Push: check if origin/main exists and matches local main/master HEAD
                if commit_done:
                    # Check if there is an origin remote
                    code_remote, remotes, _ = run_git_command(repo_path, ["remote"])
                    if code_remote == 0 and "origin" in remotes:
                        # Get active branch
                        _, active_br, _ = run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
                        active_br = active_br.strip()
                        code_push, ref_local, _ = run_git_command(repo_path, ["rev-parse", "HEAD"])
                        code_remote_ref, ref_remote, _ = run_git_command(repo_path, ["rev-parse", f"origin/{active_br}"])
                        push_done = (code_push == 0 and code_remote_ref == 0 and ref_local.strip() == ref_remote.strip())
            
            subtasks = [
                {"id": "init", "title": "Initialize Git repository ('git init')", "completed": init_done},
                {"id": "stage", "title": "Stage files ('git add')", "completed": stage_done},
                {"id": "commit", "title": "Create a commit snapshot ('git commit')", "completed": commit_done},
                {"id": "push", "title": "Push commit to remote ('git push')", "completed": push_done}
            ]
            
            verified = init_done and stage_done and commit_done and push_done
            msg = "Visual playground complete! Repository initialized, committed, and pushed successfully!" if verified else "Keep executing commands."
            return verified, msg, subtasks

        # Lesson 2: Branching
        elif lesson_id == 2:
            br_exists = False
            commit_on_br = False
            back_to_main = False
            merged = False
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                code, stdout, _ = run_git_command(repo_path, ["branch", "-a"])
                br_exists = "feature/auth" in stdout
                
                # Check for commit on feature/auth
                code_log, all_commits, _ = run_git_command(repo_path, ["log", "--all", "--oneline"])
                commit_on_br = (code_log == 0 and len(all_commits.strip().split("\n")) >= 2)
                
                # Switch back to main
                code_head, head_out, _ = run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
                back_to_main = (code_head == 0 and head_out.strip() == "main")
                
                # Merged
                code_merge, merged_branches, _ = run_git_command(repo_path, ["branch", "--merged"])
                merged = "feature/auth" in merged_branches
                
            subtasks = [
                {"id": "create_branch", "title": "Create branch 'feature/auth'", "completed": br_exists},
                {"id": "commit_feature", "title": "Make a commit on 'feature/auth'", "completed": commit_on_br},
                {"id": "checkout_main", "title": "Switch back to 'main' branch", "completed": back_to_main},
                {"id": "merge_branch", "title": "Merge 'feature/auth' into 'main'", "completed": merged}
            ]
            
            verified = br_exists and commit_on_br and back_to_main and merged
            msg = "Advanced branching exercise solved successfully!" if verified else "Keep resolving advanced branching steps."
            return verified, msg, subtasks

        # Lesson 3: Merge Conflicts
        elif lesson_id == 3:
            conflict_triggered = False
            resolved = False
            staged = False
            committed = False
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                # 1. Triggered: MERGE_HEAD exists
                conflict_triggered = os.path.exists(os.path.join(repo_path, ".git", "MERGE_HEAD"))
                
                # 2. Resolved: config.js does not contain conflict markers
                config_file = os.path.join(repo_path, "config.js")
                if os.path.exists(config_file):
                    with open(config_file, "r") as f:
                        content = f.read()
                    resolved = conflict_triggered and ("<<<<<<<" not in content and "=======" not in content and ">>>>>>>" not in content)
                
                # 3. Staged
                code_status, status_out, _ = run_git_command(repo_path, ["status", "--porcelain"])
                # If conflict_triggered and config.js is in porcelain status without U (Unmerged)
                staged = conflict_triggered and resolved and ("UU config.js" not in status_out and "M  config.js" in status_out)
                
                # 4. Committed: MERGE_HEAD is gone, and log has a merge commit
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--oneline", "-n", "3"])
                has_merge_msg = "merge" in log_out.lower() or "auth config" in log_out.lower() and "ui polish" in log_out.lower()
                committed = not os.path.exists(os.path.join(repo_path, ".git", "MERGE_HEAD")) and has_merge_msg and len(log_out.splitlines()) >= 4
                
                # Allow fallback: if they fully committed, trigger, resolve, and stage are also marked true
                if committed:
                    conflict_triggered = True
                    resolved = True
                    staged = True
                    
            subtasks = [
                {"id": "trigger_conflict", "title": "Trigger conflict by merging 'feature/ui'", "completed": conflict_triggered},
                {"id": "resolve_conflict", "title": "Resolve merge conflicts in config.js", "completed": resolved},
                {"id": "stage_resolved", "title": "Stage resolved config.js ('git add')", "completed": staged},
                {"id": "commit_merge", "title": "Commit the resolved merge", "completed": committed}
            ]
            
            verified = conflict_triggered and resolved and staged and committed
            msg = "Merge conflict resolved and committed successfully!" if verified else "Keep working on resolving config.js conflict."
            return verified, msg, subtasks

        # Lesson 4: Git History & Time Travel
        elif lesson_id == 4:
            revert_done = False
            reset_done = False
            matrix_done = True # Matrix is tracked on client side or defaults to True when history resolved
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
                
                # Revert: a commit exists reverting 'Skip null metric check'
                revert_done = "revert" in log_out.lower() and "skip null" in log_out.lower()
                
                # Reset: buggy commit is missing from log
                reset_done = "skip null metric check" not in log_out.lower()
                
                # If they did either one, they successfully repaired history!
                if revert_done or reset_done:
                    pass
            
            subtasks = [
                {"id": "revert_commit", "title": "Revert the buggy commit ('git revert')", "completed": revert_done},
                {"id": "reset_clean", "title": "Explore soft/hard resets ('git reset')", "completed": reset_done},
                {"id": "safety_matrix", "title": "Match situations in the Safety Matrix", "completed": revert_done or reset_done}
            ]
            
            verified = revert_done or reset_done
            msg = "Git history repaired successfully!" if verified else "Inspect git log and revert or reset buggy commits."
            return verified, msg, subtasks

        # Lesson 5: Stash & Cherry-Pick
        elif lesson_id == 5:
            stashed = False
            switched = False
            picked = False
            popped = False
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                # Stashed: check git stash list
                code_stash, stash_out, _ = run_git_command(repo_path, ["stash", "list"])
                stashed = len(stash_out.strip()) > 0
                
                # Switched: check head
                code_head, head_out, _ = run_git_command(repo_path, ["rev-parse", "--abbrev-ref", "HEAD"])
                switched = stashed or head_out.strip() != "feature/payments"
                
                # Picked: check log for cherry-picked commit
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
                picked = "Fix tax rounding" in log_out
                
                # Popped: stashed work restored to working directory (Checkout.jsx / styles.css exist and/or stash list cleared)
                popped = picked and os.path.exists(os.path.join(repo_path, "Checkout.jsx")) and os.path.exists(os.path.join(repo_path, "styles.css"))
                
                if popped:
                    stashed = True
                    switched = True
                    
            subtasks = [
                {"id": "stash_wip", "title": "Stash uncommitted changes ('git stash')", "completed": stashed},
                {"id": "switch_branch", "title": "Switch branch safely ('git checkout')", "completed": switched},
                {"id": "cherry_pick", "title": "Cherry-pick hotfix commit ('git cherry-pick')", "completed": picked},
                {"id": "pop_stash", "title": "Pop stashed changes back ('git stash pop')", "completed": popped}
            ]
            
            verified = stashed and switched and picked and popped
            msg = "Stash and Cherry-Pick checkpoints cleared successfully!" if verified else "Keep managing your stashes and cherry-picks."
            return verified, msg, subtasks

        # Lesson 6: Remote Collaboration
        elif lesson_id == 6:
            fetched = False
            pulled = False
            resolved = False
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                # Fetched: origin/main branch exists
                code_fetch, fetch_out, _ = run_git_command(repo_path, ["branch", "-r"])
                fetched = "origin/main" in fetch_out
                
                # Pulled: teammate commits 'nav polish' and 'retry logic' in history
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--all", "--oneline"])
                pulled = "nav polish" in log_out and "retry logic" in log_out
                
                # Resolved and pushed: local 'login form' and teammate's commits exist on origin/main
                code_origin_log, origin_log_out, _ = run_git_command(repo_path, ["log", "origin/main", "--oneline"])
                resolved = "login form" in origin_log_out and "nav polish" in origin_log_out and "retry logic" in origin_log_out
                
                if resolved:
                    fetched = True
                    pulled = True
                    
            subtasks = [
                {"id": "fetch_remote", "title": "Fetch remote branches ('git fetch')", "completed": fetched},
                {"id": "pull_remote", "title": "Pull remote commits ('git pull')", "completed": pulled},
                {"id": "resolve_push", "title": "Handle push conflict via rebase ('git pull --rebase')", "completed": resolved}
            ]
            
            verified = fetched and pulled and resolved
            msg = "Drift sync and rebase push successful!" if verified else "Pull remote changes and rebase to resolve pushing conflicts."
            return verified, msg, subtasks

        # Lesson 7: Rebase & Clean History
        elif lesson_id == 7:
            rebase_started = False
            commits_squashed = False
            timeline_clean = False
            
            if os.path.exists(os.path.join(repo_path, ".git")):
                # Check log
                code_log, log_out, _ = run_git_command(repo_path, ["log", "--oneline"])
                log_lines = log_out.strip().split("\n")
                
                # Rebase started if debug commit is dropped
                rebase_started = "debug payment state" not in log_out.lower()
                
                # Squashed: checkout form and fixed typo are squashed or message merged
                commits_squashed = rebase_started and not any("fix typo" in line.lower() for line in log_lines)
                
                # Clean: total commit count is reduced and has linear structure
                timeline_clean = rebase_started and commits_squashed and len(log_lines) <= 4
                
            subtasks = [
                {"id": "interactive_rebase", "title": "Configure interactive rebase N commits", "completed": rebase_started},
                {"id": "squash_commits", "title": "Squash and reorder target commits", "completed": commits_squashed},
                {"id": "clean_timeline", "title": "Complete clean linear rebase history", "completed": timeline_clean}
            ]
            
            verified = rebase_started and commits_squashed and timeline_clean
            msg = "Commits squashed and timeline clean!" if verified else "Organize commits using 'pick', 'squash', or 'drop' in rebase."
            return verified, msg, subtasks

        return False, f"Lesson {lesson_id} verifier is active. Complete exercise tasks.", []
    except Exception as e:
        return False, f"Verification diagnostic issue: {str(e)}", []

def get_live_commit_graph(repo_path):
    """Extracts the git commit history graph nodes using git log."""
    if not os.path.exists(os.path.join(repo_path, ".git")):
        return []
    # Check if there is at least one commit
    code, out, _ = run_git_command(repo_path, ["log", "--all", "--format=%H|%P|%s|%D"])
    if code != 0 or not out.strip():
        return []
        
    commits = []
    for line in out.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) < 4:
            continue
        h = parts[0].strip()
        parents = parts[1].strip().split() if parts[1].strip() else []
        msg = parts[2].strip()
        decorators_str = parts[3].strip()
        
        is_head = False
        branches = []
        if decorators_str:
            dec_clean = decorators_str.replace("(", "").replace(")", "")
            dec_parts = [d.strip() for d in dec_clean.split(",")]
            for d in dec_parts:
                if "HEAD" in d:
                    is_head = True
                if "->" in d:
                    branches.append(d.split("->")[-1].strip())
                elif d and d != "HEAD":
                    branches.append(d)
                    
        commits.append({
            "hash": h[:7],
            "full_hash": h,
            "parents": [p[:7] for p in parents],
            "full_parents": parents,
            "message": msg,
            "is_head": is_head,
            "branches": list(set(branches))
        })
    return commits

def get_workspace_files_content(repo_path):
    """Scans the repository folder and returns file names and contents for standard text files."""
    contents = {}
    allowed_extensions = ['.js', '.jsx', '.css', '.html', '.txt', '.yml', '.yaml', '.json']
    try:
        if not os.path.exists(repo_path):
            return {}
        for item in os.listdir(repo_path):
            item_path = os.path.join(repo_path, item)
            if item == ".git" or not os.path.isfile(item_path):
                continue
            ext = os.path.splitext(item)[-1].lower()
            if ext in allowed_extensions:
                with open(item_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()[:200]
                    contents[item] = "".join(lines)
    except Exception as e:
        print(f"Error reading workspace files: {e}")
    return contents

