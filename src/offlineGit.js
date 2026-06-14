// Offline git simulator — an in-memory approximation used only when the backend is
// unreachable. Extracted from TerminalShell.jsx so the component stays focused on UI.
// The live FastAPI sandbox remains the source of truth.

export function checkOfflineProgress(state, lessonId) {
  let subtasks = []
  let verified = false
  let msg = "Keep executing commands."

  if (lessonId === 0) {
    const init_done = state.initialized
    const stage_done = state.staged.length > 0 || state.commits.length > 0
    const commit_done = state.commits.length > 0

    subtasks = [
      { id: "init", title: "Initialize Git repository ('git init')", completed: init_done },
      { id: "stage", title: "Stage changes ('git add')", completed: stage_done },
      { id: "commit", title: "Commit a snapshot ('git commit')", completed: commit_done }
    ]
    verified = init_done && stage_done && commit_done
    msg = verified ? "Git repository initialized, files staged and committed successfully!" : "Keep working on your terminal steps."
  }
  else if (lessonId === 1) {
    const init_done = state.initialized
    const stage_done = state.staged.length > 0 || state.commits.length > 0
    const commit_done = state.commits.length > 0
    const push_done = state.commits.some(c => c.branches.includes('origin/main') || c.branches.includes('origin/master')) || state.pushed_offline === true

    subtasks = [
      { id: "init", title: "Initialize Git repository ('git init')", completed: init_done },
      { id: "stage", title: "Stage files ('git add')", completed: stage_done },
      { id: "commit", title: "Create a commit snapshot ('git commit')", completed: commit_done },
      { id: "push", title: "Push commit to remote ('git push')", completed: push_done }
    ]
    verified = init_done && stage_done && commit_done && push_done
    msg = verified ? "Visual playground complete! Repository initialized, committed, and pushed successfully!" : "Keep executing commands."
  }
  else if (lessonId === 2) {
    const br_exists = state.branches.includes("feature/auth")
    const commit_on_br = state.commits.length >= 2
    const back_to_main = state.branch === "main"
    const merged = br_exists && state.branch === "main" && (state.commits.some(c => c.branches.includes("main") && c.parents.length > 1) || state.merged_offline === true)
    
    subtasks = [
      { id: "create_branch", title: "Create branch 'feature/auth'", completed: br_exists },
      { id: "commit_feature", title: "Make a commit on 'feature/auth'", completed: commit_on_br },
      { id: "checkout_main", title: "Switch back to 'main' branch", completed: back_to_main },
      { id: "merge_branch", title: "Merge 'feature/auth' into 'main'", completed: merged }
    ]
    verified = br_exists && commit_on_br && back_to_main && merged
    msg = verified ? "Advanced branching exercise solved successfully!" : "Keep resolving advanced branching steps."
  }
  else if (lessonId === 3) {
    const conflict_triggered = state.conflict_active === true || state.conflict_triggered === true
    const resolved = conflict_triggered && state.conflict_resolved === true
    const staged = resolved && state.staged.includes("config.js")
    const committed = state.commits.length >= 4
    
    subtasks = [
      { id: "trigger_conflict", title: "Trigger conflict by merging 'feature/ui'", completed: conflict_triggered },
      { id: "resolve_conflict", title: "Resolve merge conflicts in config.js", completed: resolved },
      { id: "stage_resolved", title: "Stage resolved config.js ('git add')", completed: staged },
      { id: "commit_merge", title: "Commit the resolved merge", completed: committed }
    ]
    verified = conflict_triggered && resolved && staged && committed
    msg = verified ? "Merge conflict resolved and committed successfully!" : "Keep working on resolving config.js conflict."
  }
  else if (lessonId === 4) {
    const revert_done = state.commits.some(c => c.message.toLowerCase().includes("revert") && c.message.toLowerCase().includes("skip null"))
    const reset_done = !state.commits.some(c => c.message.toLowerCase().includes("skip null metric check"))
    
    subtasks = [
      { id: "revert_commit", title: "Revert the buggy commit ('git revert')", completed: revert_done },
      { id: "reset_clean", title: "Explore soft/hard resets ('git reset')", completed: reset_done },
      { id: "safety_matrix", title: "Match situations in the Safety Matrix", completed: revert_done || reset_done }
    ]
    verified = revert_done || reset_done
    msg = verified ? "Git history repaired successfully!" : "Inspect git log and revert or reset buggy commits."
  }
  else if (lessonId === 5) {
    const stashed = state.stashes.length > 0 || state.stashed_offline === true
    const switched = state.branch === "feature/payments"
    const picked = state.commits.some(c => c.message.toLowerCase().includes("fix tax rounding"))
    const popped = picked && state.files.includes("Checkout.jsx") && state.files.includes("styles.css")
    
    subtasks = [
      { id: "stash_wip", title: "Stash uncommitted changes ('git stash')", completed: stashed },
      { id: "switch_branch", title: "Switch branch safely ('git checkout')", completed: switched },
      { id: "cherry_pick", title: "Cherry-pick hotfix commit ('git cherry-pick')", completed: picked },
      { id: "pop_stash", title: "Pop stashed changes back ('git stash pop')", completed: popped }
    ]
    verified = stashed && switched && picked && popped
    msg = verified ? "Stash and Cherry-Pick checkpoints cleared successfully!" : "Keep managing your stashes and cherry-picks."
  }
  else if (lessonId === 6) {
    const fetched = state.fetched_offline === true
    const pulled = state.pulled_offline === true || (state.commits.some(c => c.message.includes("nav polish")) && state.commits.some(c => c.message.includes("retry logic")))
    const resolved = state.pushed_offline === true && state.commits.some(c => c.message.includes("login form")) && state.commits.some(c => c.message.includes("nav polish")) && state.commits.some(c => c.message.includes("retry logic"))
    
    subtasks = [
      { id: "fetch_remote", title: "Fetch remote branches ('git fetch')", completed: fetched },
      { id: "pull_remote", title: "Pull remote commits ('git pull')", completed: pulled },
      { id: "resolve_push", title: "Handle push conflict via rebase ('git pull --rebase')", completed: resolved }
    ]
    verified = fetched && pulled && resolved
    msg = verified ? "Drift sync and rebase push successful!" : "Pull remote changes and rebase to resolve pushing conflicts."
  }
  else if (lessonId === 7) {
    const rebase_started = !state.commits.some(c => c.message.includes("debug payment state"))
    const commits_squashed = rebase_started && !state.commits.some(c => c.message.includes("Fix typo"))
    const timeline_clean = rebase_started && commits_squashed && state.commits.length <= 4
    
    subtasks = [
      { id: "interactive_rebase", title: "Configure interactive rebase N commits", completed: rebase_started },
      { id: "squash_commits", title: "Squash and reorder target commits", completed: commits_squashed },
      { id: "clean_timeline", title: "Complete clean linear rebase history", completed: timeline_clean}
    ]
    verified = rebase_started && commits_squashed && timeline_clean
    msg = verified ? "Commits squashed and timeline clean!" : "Organize commits using 'pick', 'squash', or 'drop' in rebase."
  }
  else if (lessonId === 8) {
    const f = state.fork || {}
    subtasks = [
      { id: "fork", title: "Fork the upstream repo ('gh repo fork')", completed: !!f.fork },
      { id: "clone", title: "Clone your fork ('git clone')", completed: !!f.clone },
      { id: "commit", title: "Branch & commit your fix ('git commit')", completed: !!f.commit },
      { id: "push", title: "Push to your fork ('git push origin')", completed: !!f.push },
      { id: "pr", title: "Open a pull request ('gh pr create')", completed: !!f.pr },
      { id: "merge", title: "Merge the pull request ('gh pr merge')", completed: !!f.merge }
    ]
    verified = !!(f.fork && f.clone && f.commit && f.push && f.pr && f.merge)
    msg = verified
      ? "You completed the full fork-and-contribute workflow!"
      : "Follow the steps: fork → clone → branch+commit → push → open PR → merge."
  }

  return { verified, msg, subtasks }
}

// Lesson 8 is a simulated GitHub fork/PR workflow (fork & PRs aren't real local-git
// commands), so it has its own tiny interpreter covering git + the GitHub CLI (gh).
function simulateForkCommand(commandText, state) {
  const next = JSON.parse(JSON.stringify(state))
  if (!next.fork) next.fork = { fork: false, clone: false, commit: false, push: false, pr: false, merge: false, sync: false }
  const f = next.fork
  const cmd = commandText.trim()
  const lower = cmd.toLowerCase()
  const parts = cmd.split(/\s+/)
  let output = ""
  let status = "success"

  const fail = (msg) => { output = msg; status = "error" }

  if (cmd === "clear") {
    return { nextState: next, output: "CLEAR_CONSOLE", status: "success" }
  } else if (parts[0] === "ls") {
    output = f.clone ? "README.md   index.js   bug.js" : "(nothing here yet — fork and clone the repo first)"
  } else if (lower.startsWith("gh repo fork")) {
    if (f.fork) output = "You already have a fork: you/awesome-lib"
    else { f.fork = true; output = "Forking octo/awesome-lib...\n✓ Created fork you/awesome-lib on your GitHub account." }
  } else if (parts[0] === "git" && parts[1] === "clone") {
    if (!f.fork) fail("Nothing to clone yet. Fork the project first:  gh repo fork octo/awesome-lib")
    else {
      f.clone = true
      next.initialized = true
      next.files = ["README.md", "index.js", "bug.js"]
      next.branch = "main"
      output = "Cloning into 'awesome-lib'...\nremote: Enumerating objects: 12, done.\n✓ Cloned your fork to your computer."
    }
  } else if (parts[0] === "git" && parts[1] === "checkout" && parts[2] === "-b") {
    if (!f.clone) fail("Clone your fork first:  git clone https://github.com/you/awesome-lib")
    else { next.branch = parts[3] || "fix-bug"; output = `Switched to a new branch '${next.branch}'` }
  } else if (parts[0] === "git" && parts[1] === "add") {
    output = f.clone ? "" : "Clone your fork first."
    if (!f.clone) status = "error"
  } else if (parts[0] === "git" && parts[1] === "commit") {
    if (!f.clone) fail("Clone your fork first.")
    else if (next.branch === "main") fail("Work on a feature branch, not main:  git checkout -b fix-bug")
    else { f.commit = true; const h = Math.random().toString(16).slice(2, 9); output = `[${next.branch} ${h}] fix the bug\n 1 file changed, 2 insertions(+)` }
  } else if (parts[0] === "git" && parts[1] === "push") {
    if (!f.commit) fail("Commit your change before pushing.")
    else { f.push = true; output = `Enumerating objects: 5, done.\nTo https://github.com/you/awesome-lib\n * [new branch]      ${next.branch} -> ${next.branch}\n✓ Pushed your branch to your fork.` }
  } else if (lower.startsWith("gh pr create")) {
    if (!f.push) fail("Push your branch before opening a pull request.")
    else { f.pr = true; output = "Creating pull request for you:fix-bug into octo:main\n✓ https://github.com/octo/awesome-lib/pull/42" }
  } else if (lower.startsWith("gh pr merge")) {
    if (!f.pr) fail("Open a pull request first:  gh pr create")
    else { f.merge = true; output = "✓ Merged pull request #42 into octo/awesome-lib. Your contribution is now part of the project!" }
  } else if (lower.startsWith("gh repo sync") || (parts[0] === "git" && parts[1] === "fetch") || (parts[0] === "git" && parts[1] === "merge" && lower.includes("upstream"))) {
    if (!f.merge) fail("Nothing new to sync yet.")
    else { f.sync = true; output = "✓ Synced your fork with upstream — you now have everyone's latest changes." }
  } else if (parts[0] === "git" && parts[1] === "status") {
    output = !f.clone ? "fatal: not a git repository (clone your fork first)" : `On branch ${next.branch}\nnothing to commit, working tree clean`
    if (!f.clone) status = "error"
  } else if (parts[0] === "git" && parts[1] === "log") {
    if (!f.clone) fail("fatal: not a git repository")
    else output = "a1c2d3 (HEAD) base project commit"
  } else {
    fail("That command isn't part of this lesson. Type the suggested command shown on the left, or open the Cheatsheet.")
  }

  return { nextState: next, output, status }
}

// Commands the in-memory simulator can faithfully reproduce. Anything else — shell
// operators, or tools the simulator doesn't implement — is refused with a clear note
// rather than silently behaving differently from the live backend.
const OFFLINE_SUPPORTED_CMDS = ['ls', 'cat', 'touch', 'rm', 'clear', 'git']

export function simulateCommandOffline(commandText, state, lessonId) {
  // Lesson 8 (fork & contribute) is a GitHub-workflow simulation with its own interpreter.
  if (lessonId === 8 || state.scenario === 'fork') {
    return simulateForkCommand(commandText, state)
  }

  const parts = commandText.trim().split(/\s+/)
  const baseCmd = parts[0]
  let output = ""
  let status = "success"

  // Don't fake features the simulator doesn't really support (pipes, redirection,
  // chaining, grep/head/tail/wc/…). Be honest so behavior doesn't change on a blip.
  const usesShellOps = /(&&|\|\||;|\||>>|>)/.test(commandText)
  if (usesShellOps || !OFFLINE_SUPPORTED_CMDS.includes(baseCmd)) {
    return {
      nextState: state,
      output: '⚠️ Offline mode simulates only basic single commands (git, ls, cat, touch, rm). Reconnect to the server to use pipes "|", redirection ">", chaining "&&", and tools like grep/head/tail/wc.',
      status: 'error'
    }
  }

  const nextState = JSON.parse(JSON.stringify(state))

  if (baseCmd === "ls") {
    if (nextState.files.length === 0) {
      output = "(Empty directory)"
    } else {
      output = nextState.files.join("  ")
    }
  } 
  else if (baseCmd === "cat") {
    const filename = parts[1]
    if (!filename) {
      output = "cat: missing filename"
      status = "error"
    } else if (!nextState.files.includes(filename)) {
      output = `cat: ${filename}: No such file or directory`
      status = "error"
    } else {
      output = nextState.fileContents[filename] || "(empty file)"
    }
  }
  else if (baseCmd === "touch") {
    const filename = parts[1]
    if (!filename) {
      output = "touch: missing filename"
      status = "error"
    } else {
      if (!nextState.files.includes(filename)) {
        nextState.files.push(filename)
        nextState.fileContents[filename] = `// created ${filename}`
      }
      output = ""
    }
  }
  else if (baseCmd === "rm") {
    const filename = parts[1]
    if (!filename) {
      output = "rm: missing filename"
      status = "error"
    } else if (!nextState.files.includes(filename)) {
      output = `rm: ${filename}: No such file or directory`
      status = "error"
    } else {
      nextState.files = nextState.files.filter(f => f !== filename)
      delete nextState.fileContents[filename]
      nextState.staged = nextState.staged.filter(f => f !== filename)
      output = ""
    }
  }
  else if (baseCmd === "clear") {
    output = "CLEAR_CONSOLE"
  }
  else if (baseCmd === "git") {
    const sub = parts[1]
    if (!sub) {
      output = "Usage: git <command> [<args>]"
      status = "error"
    } 
    else if (sub === "init") {
      if (nextState.initialized) {
        output = "Reinitialized existing Git repository in /workspace/.git/"
      } else {
        nextState.initialized = true
        output = "Initialized empty Git repository in /workspace/.git/"
      }
    }
    else {
      if (!nextState.initialized) {
        output = "fatal: not a git repository (or any of the parent directories): .git"
        status = "error"
      }
      else if (sub === "status") {
        const stagedFiles = nextState.staged
        const untracked = nextState.files.filter(f => !stagedFiles.includes(f))
        
        let out = `On branch ${nextState.branch}\n`
        if (nextState.lessonId === 6) {
          out += `Your branch is up to date with 'origin/${nextState.branch}'.\n\n`
        } else {
          out += `Your branch is up to date.\n\n`
        }

        if (nextState.conflict_active) {
          out += `You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n\tboth modified:   config.js\n\n`
        } else if (stagedFiles.length > 0) {
          out += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n`
          stagedFiles.forEach(f => {
            out += `\tnew file:   ${f}\n`
          })
          out += `\n`
        }

        if (untracked.length > 0 && !nextState.conflict_active) {
          out += `Untracked files:\n  (use "git add <file>..." to include in what will be committed)\n`
          untracked.forEach(f => {
            out += `\t${f}\n`
          })
          out += `\n`
        }

        if (stagedFiles.length === 0 && untracked.length === 0 && !nextState.conflict_active) {
          out += `nothing to commit, working tree clean`
        }
        output = out
      }
      else if (sub === "add") {
        const filePattern = parts[2]
        if (!filePattern) {
          output = "Nothing specified, nothing added."
          status = "error"
        } else {
          if (filePattern === "." || filePattern === "-A" || filePattern === "--all") {
            nextState.staged = [...nextState.files]
            if (nextState.conflict_active) {
              nextState.conflict_resolved = true
              nextState.conflict_active = false
            }
            output = ""
          } else {
            if (nextState.files.includes(filePattern)) {
              if (!nextState.staged.includes(filePattern)) {
                nextState.staged.push(filePattern)
              }
              if (filePattern === "config.js" && nextState.conflict_active) {
                nextState.conflict_resolved = true
                nextState.conflict_active = false
              }
              output = ""
            } else {
              output = `fatal: pathspec '${filePattern}' did not match any files`
              status = "error"
            }
          }
        }
      }
      else if (sub === "commit") {
        let msg = ""
        const mIdx = parts.indexOf("-m")
        if (mIdx !== -1 && parts[mIdx + 1]) {
          msg = parts.slice(mIdx + 1).join(" ").replace(/['"]/g, "")
        } else {
          msg = "Minor updates"
        }

        if (nextState.staged.length === 0 && !nextState.conflict_resolved) {
          output = `On branch ${nextState.branch}\nnothing to commit, working tree clean`
        } else {
          const hash = Math.random().toString(16).substring(2, 9)
          const fullHash = hash + '0'.repeat(33)
          
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: c.branches.includes(nextState.branch) ? false : c.is_head
          }))

          const activeBranch = nextState.branch
          const currentHead = nextState.commits.find(c => c.branches.includes(activeBranch))
          
          const newCommit = {
            hash: hash,
            full_hash: fullHash,
            message: msg,
            branches: [activeBranch],
            parents: currentHead ? [currentHead.hash] : [],
            is_head: true
          }

          nextState.commits.push(newCommit)
          nextState.staged = []
          output = `[${activeBranch} ${hash}] ${msg}\n ${nextState.files.length} files changed`
        }
      }
      else if (sub === "log") {
        if (nextState.commits.length === 0) {
          output = `fatal: your current branch '${nextState.branch}' does not have any commits yet`
          status = "error"
        } else {
          const reversed = [...nextState.commits].reverse()
          output = reversed.map(c => {
            const brText = c.branches.length > 0 ? ` (${c.is_head ? 'HEAD -> ' : ''}${c.branches.join(', ')})` : ''
            return `commit ${c.full_hash}${brText}\nAuthor: Gitify Offline Student <student@gitify.edu>\nDate: Wed Jun 10 2026\n\n    ${c.message}\n`
          }).join("\n")
        }
      }
      else if (sub === "branch") {
        const newBranchName = parts[2]
        if (!newBranchName) {
          output = nextState.branches.map(b => (b === nextState.branch ? `* ${b}` : `  ${b}`)).join("\n")
        } else {
          if (nextState.branches.includes(newBranchName)) {
            output = `fatal: A branch named '${newBranchName}' already exists.`
            status = "error"
          } else {
            nextState.branches.push(newBranchName)
            const currentHead = nextState.commits.find(c => c.is_head)
            if (currentHead) {
              currentHead.branches.push(newBranchName)
            }
            output = ""
          }
        }
      }
      else if (sub === "checkout") {
        let targetBranch = parts[2]
        const isBFlag = parts[2] === "-b"
        if (isBFlag) {
          targetBranch = parts[3]
        }

        if (!targetBranch) {
          output = "fatal: Branch name required."
          status = "error"
        } else {
          if (isBFlag) {
            if (nextState.branches.includes(targetBranch)) {
              output = `fatal: A branch named '${targetBranch}' already exists.`
              status = "error"
            } else {
              nextState.branches.push(targetBranch)
              nextState.branch = targetBranch
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.branches.includes(targetBranch)
              }))
              output = `Switched to a new branch '${targetBranch}'`
            }
          } else {
            if (nextState.branches.includes(targetBranch)) {
              nextState.branch = targetBranch
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.branches.includes(targetBranch)
              }))
              output = `Switched to branch '${targetBranch}'`
            } else {
              output = `error: pathspec '${targetBranch}' did not match any file(s) known to git`
              status = "error"
            }
          }
        }
      }
      else if (sub === "merge") {
        const mergeSrc = parts[2]
        if (!mergeSrc) {
          output = "fatal: Branch to merge required."
          status = "error"
        } else if (!nextState.branches.includes(mergeSrc)) {
          output = `merge: ${mergeSrc} - not something we can merge`
          status = "error"
        } else {
          if (nextState.lessonId === 3 && mergeSrc === "feature/ui" && nextState.branch === "main") {
            nextState.conflict_active = true
            nextState.conflict_triggered = true
            nextState.fileContents['config.js'] =
              "export const config = {\n  api: '/v1',\n  retries: 3,\n<<<<<<< HEAD\n  theme: 'dark',\n=======\n  theme: 'light',\n>>>>>>> feature/ui\n};\n"
            output = "Auto-merging config.js\nCONFLICT (content): Merge conflict in config.js\nAutomatic merge failed; fix conflicts and then commit the result."
            status = "error"
          } else {
            nextState.merged_offline = true
            output = `Updating ${nextState.branch}... Fast-forward merge of '${mergeSrc}' complete.`
          }
        }
      }
      else if (sub === "stash") {
        const action = parts[2]
        if (action === "pop") {
          if (nextState.stashes.length === 0) {
            output = "No stash entries found."
            status = "error"
          } else {
            nextState.stashes.pop()
            if (!nextState.files.includes("Checkout.jsx")) nextState.files.push("Checkout.jsx")
            if (!nextState.files.includes("styles.css")) nextState.files.push("styles.css")
            output = "Dropped refs/stash@{0} (offline)"
          }
        } else {
          nextState.stashes.push({
            id: 0,
            name: "stash@{0}",
            label: `WIP on ${nextState.branch}`,
            files: ["Checkout.jsx", "styles.css"]
          })
          nextState.stashed_offline = true
          nextState.files = nextState.files.filter(f => f !== "Checkout.jsx" && f !== "styles.css")
          output = `Saved working directory and index state WIP on ${nextState.branch}: WIP stash`
        }
      }
      else if (sub === "cherry-pick") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const newCommit = {
            hash: 'b7a91c0',
            full_hash: 'b7a91c01c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Fix tax rounding",
            branches: [nextState.branch],
            parents: [],
            is_head: true
          }
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false
          }))
          nextState.commits.push(newCommit)
          output = `[${nextState.branch} b7a91c0] Fix tax rounding\n 1 file changed`
        }
      }
      else if (sub === "fetch") {
        nextState.fetched_offline = true
        output = "From remote\n * [new branch]      main     -> origin/main"
      }
      else if (sub === "pull") {
        const isRebase = parts.includes("--rebase")
        if (isRebase) {
          nextState.pulled_offline = true
          nextState.pushed_offline = true
          output = "Successfully rebased and updated."
        } else {
          output = "From remote\n * branch            main       -> FETCH_HEAD\nMerge conflict in remote merge."
          status = "error"
        }
      }
      else if (sub === "push") {
        nextState.pushed_offline = true
        output = "Everything up-to-date"
      }
      else if (sub === "revert") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const newCommit = {
            hash: 'rev1234',
            full_hash: 'rev12345c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Revert \"Skip null metric check\"",
            branches: [nextState.branch],
            parents: [],
            is_head: true
          }
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false
          }))
          nextState.commits.push(newCommit)
          output = `[${nextState.branch} rev1234] Revert "Skip null metric check"`
        }
      }
      else if (sub === "rebase") {
        const isInteractive = parts.includes("-i")
        if (isInteractive) {
          nextState.commits = nextState.commits.filter(c => !c.message.includes("debug payment state"))
          nextState.commits = nextState.commits.filter(c => !c.message.includes("Fix typo"))
          output = "Successfully rebased and updated timeline offline."
        } else {
          output = "Rebase complete."
        }
      }
      else {
        output = `Unknown git subcommand: ${sub}`
        status = "error"
      }
    }
  } 
  else {
    output = `bash: ${baseCmd}: command not found`
    status = "error"
  }

  return { nextState, output, status }
}
