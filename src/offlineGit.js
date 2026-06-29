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
  else if (lessonId === 9) {
    const b = state.bisect || {}
    subtasks = [
      { id: "bisect_start", title: "Start bisect session ('git bisect start')", completed: !!b.started },
      { id: "bisect_bad", title: "Mark HEAD as bad ('git bisect bad')", completed: !!b.marked_bad },
      { id: "bisect_good", title: "Mark old commit as good ('git bisect good <hash>')", completed: !!b.marked_good },
      { id: "bisect_reset", title: "Reset bisect and return to main ('git bisect reset')", completed: !!b.reset }
    ]
    verified = !!(b.started && b.marked_bad && b.marked_good && b.reset)
    msg = verified
      ? "Culprit found and bisect session closed!"
      : "Use git bisect start → bad → good → reset to hunt down the bug."
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
const OFFLINE_SUPPORTED_CMDS = ['ls', 'cat', 'touch', 'rm', 'clear', 'git', 'echo', 'pwd']

function simulateBisectCommand(commandText, state) {
  const next = JSON.parse(JSON.stringify(state))
  if (!next.bisect) next.bisect = { started: false, marked_bad: false, marked_good: false, reset: false, step: 0 }
  const b = next.bisect
  const parts = commandText.trim().split(/\s+/)
  let output = ''
  let status = 'success'

  // The offline bisect simulation walks through the algorithm step by step.
  // There are 7 commits; the bad one is commit 4 ("Refactor cart total").
  // Binary search: range [1,7] → mid=4 → bad → range [1,3] → mid=2 → good → range [3,3] → mid=3 → good → culprit=4
  const COMMITS = [
    { hash: 'a1b2c3d', msg: 'Init cart module' },
    { hash: 'b2c3d4e', msg: 'Add cart UI' },
    { hash: 'c3d4e5f', msg: 'Add discount engine' },
    { hash: 'd4e5f6g', msg: 'Refactor cart total' }, // BAD (index 3)
    { hash: 'e5f6g7h', msg: 'Add request logger' },
    { hash: 'f6g7h8i', msg: 'Polish cart UI' },
    { hash: 'g7h8i9j', msg: 'Update README' },
  ]

  if (parts[0] === 'clear') return { nextState: next, output: 'CLEAR_CONSOLE', status: 'success' }
  if (parts[0] === 'ls') { output = next.files.join('  '); return { nextState: next, output, status } }
  if (parts[0] === 'cat') {
    const fn = parts[1]
    output = fn && next.fileContents[fn] ? next.fileContents[fn] : fn ? `cat: ${fn}: No such file or directory` : 'cat: missing filename'
    if (!fn || !next.fileContents[fn]) status = 'error'
    return { nextState: next, output, status }
  }

  if (parts[0] !== 'git') {
    return { nextState: next, output: `bash: ${parts[0]}: command not found`, status: 'error' }
  }

  const sub = parts[1]

  if (sub === 'log') {
    output = [...COMMITS].reverse().map((c, i) => {
      const idx = COMMITS.length - 1 - i
      const branch = idx === COMMITS.length - 1 ? ' (HEAD -> main)' : ''
      return `commit ${c.hash}${branch}\n    ${c.msg}\n`
    }).join('\n')
    return { nextState: next, output, status }
  }

  if (sub === 'bisect') {
    const action = parts[2]
    if (action === 'start') {
      b.started = true
      b.step = 0
      output = 'status: waiting for both good and bad commits'
    } else if (action === 'bad') {
      if (!b.started) { output = 'You need to start bisect first: git bisect start'; status = 'error' }
      else { b.marked_bad = true; output = 'Bisecting: 3 revisions left to test after this (roughly 2 steps)\n[d4e5f6g] Refactor cart total' }
    } else if (action === 'good') {
      if (!b.marked_bad) { output = 'Mark HEAD as bad first: git bisect bad'; status = 'error' }
      else if (!b.marked_good) {
        b.marked_good = true
        b.step = 1
        output = 'Bisecting: 1 revision left to test after this (roughly 1 step)\n[c3d4e5f] Add discount engine'
      } else if (b.step === 1) {
        b.step = 2
        output = 'd4e5f6g is the first bad commit\n    Refactor cart total\n\nfound the culprit!'
      } else {
        output = 'd4e5f6g is the first bad commit\n    Refactor cart total'
      }
    } else if (action === 'reset') {
      if (!b.started) { output = 'We are not bisecting.'; status = 'error' }
      else { b.reset = true; next.branch = 'main'; output = 'Previous HEAD position was d4e5f6g Refactor cart total\nSwitched to branch \'main\'' }
    } else if (action === 'log') {
      if (!b.started) { output = 'We are not bisecting.'; status = 'error' }
      else { output = `# bad: [g7h8i9j] Update README\n# good: [a1b2c3d] Init cart module\ngit bisect good a1b2c3d\ngit bisect bad` }
    } else {
      output = `git bisect: unknown subcommand '${action}'`; status = 'error'
    }
    return { nextState: next, output, status }
  }

  if (sub === 'status') {
    output = b.reset || !b.started
      ? `On branch main\nnothing to commit, working tree clean`
      : `HEAD detached at ${b.step === 0 ? 'd4e5f6g' : 'c3d4e5f'}\nnothing to commit, working tree clean`
    return { nextState: next, output, status }
  }

  output = `git: '${sub}' is not available in this lesson's offline mode. Try git bisect, git log, or git status.`
  status = 'error'
  return { nextState: next, output, status }
}

export function simulateCommandOffline(commandText, state, lessonId) {
  // Lesson 8 (fork & contribute) is a GitHub-workflow simulation with its own interpreter.
  if (lessonId === 8 || state.scenario === 'fork') {
    return simulateForkCommand(commandText, state)
  }

  // Lesson 9 (bisect) is a guided simulation of the bisect algorithm.
  if (lessonId === 9) {
    return simulateBisectCommand(commandText, state)
  }

  const parts = commandText.trim().split(/\s+/)
  const baseCmd = parts[0]
  let output = ""
  let status = "success"

  // Don't fake features the simulator doesn't really support (pipes, redirection,
  // chaining, grep/head/tail/wc/…). Be honest so behavior doesn't change on a blip.
  // Ignore operators that appear inside quotes (e.g. a commit message like
  // `git commit -m "a > b"`) by stripping quoted substrings before testing.
  const unquoted = commandText.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '')
  const usesShellOps = /(&&|\|\||;|\||>>|>)/.test(unquoted)
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
  else if (baseCmd === "echo") {
    output = parts.slice(1).join(' ').replace(/^["']|["']$/g, '')
  }
  else if (baseCmd === "pwd") {
    output = '/workspace' + (nextState.pwd ? '/' + nextState.pwd : '')
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
        // Files recorded in committed_files are tracked (populated by git commit and seeded initial states).
        const trackedFiles = new Set(nextState.committed_files || [])
        const untracked = nextState.files.filter(f => !stagedFiles.includes(f) && !trackedFiles.has(f))

        let out = `On branch ${nextState.branch}\n`
        if (nextState.lessonId === 6) {
          out += `Your branch is up to date with 'origin/${nextState.branch}'.\n\n`
        } else {
          out += `Your branch is up to date.\n\n`
        }

        const stagedDels = nextState.staged_deletions || []
        if (nextState.conflict_active) {
          out += `You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n\tboth modified:   config.js\n\n`
        } else if (stagedFiles.length > 0 || stagedDels.length > 0) {
          out += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n`
          const alreadyTracked = new Set(nextState.committed_files || [])
          stagedDels.forEach(f => { out += `\tdeleted:   ${f}\n` })
          stagedFiles.forEach(f => {
            out += `\t${alreadyTracked.has(f) ? 'modified' : 'new file'}:   ${f}\n`
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
          if (filePattern === "-u") {
            // -u: stage tracked modified files only (mirrors real `git add -u` behavior)
            const tracked = new Set(nextState.committed_files || [])
            nextState.staged = nextState.files.filter(f => tracked.has(f))
            output = ""
          } else if (filePattern === "." || filePattern === "-A" || filePattern === "--all") {
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
        // Support -m, -am, -a -m and --message= (students commonly type -am)
        const mIdx = parts.findIndex(p => p === "-m" || p === "--message" || /^-[a-zA-Z]*m$/.test(p))
        if (mIdx !== -1 && parts[mIdx + 1]) {
          msg = parts.slice(mIdx + 1).join(" ").replace(/^["']|["']$/g, "")
        } else {
          const longMsg = parts.find(p => p.startsWith("--message="))
          msg = longMsg ? longMsg.slice("--message=".length).replace(/^["']|["']$/g, "") : "Minor updates"
        }

        // git commit --amend: replace HEAD commit's message (and absorb any staged changes)
        if (parts.includes("--amend")) {
          const headCommit = nextState.commits.find(c => c.is_head)
          if (!headCommit) {
            output = "fatal: You have nothing to amend."; status = "error"
          } else {
            const amendMsg = msg !== "Minor updates" ? msg : headCommit.message
            headCommit.message = amendMsg
            nextState.committed_files = Array.from(new Set([...(nextState.committed_files || []), ...nextState.staged]))
            nextState.staged = []
            output = `[${nextState.branch} ${headCommit.hash}] ${amendMsg}\n Date: 1 second ago`
          }
        } else {

        // -a / -am: auto-stage tracked modified files only (mirrors real `git commit -a` behavior).
        // Untracked files must be explicitly `git add`-ed first.
        const hasAFlag = parts.some(p => /^-[a-zA-Z]*a/.test(p)) || parts.includes("--all")
        if (hasAFlag && nextState.staged.length === 0) {
          const tracked = new Set(nextState.committed_files || [])
          nextState.staged = nextState.files.filter(f => tracked.has(f))
        }

        const stagedDeletions = nextState.staged_deletions || []
        if (nextState.staged.length === 0 && stagedDeletions.length === 0 && !nextState.conflict_resolved) {
          output = `On branch ${nextState.branch}\nnothing to commit, working tree clean`
        } else {
          const hash = Math.random().toString(16).substring(2, 9)
          const fullHash = hash + '0'.repeat(33)
          const activeBranch = nextState.branch
          // Find the true HEAD before clearing is_head flags; using is_head avoids
          // false matches when multiple commits share a branch name (e.g. after
          // checkout -b stamps the new branch onto the root commit).
          const currentHead = nextState.commits.find(c => c.is_head)

          // Move the branch ref forward: the previous tip of activeBranch must
          // drop the label so only the new commit (the new tip) carries it —
          // matching real git and the seeded-state convention. Leaving the label
          // on the old tip made `git log` show "(main)" on every commit.
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false,
            branches: c.branches.filter(b => b !== activeBranch)
          }))

          const newCommit = {
            hash: hash,
            full_hash: fullHash,
            message: msg,
            branches: [activeBranch],
            parents: currentHead ? [currentHead.hash] : [],
            is_head: true
          }

          nextState.commits.push(newCommit)
          // Capture staged count before clearing so the output reports files committed, not total workspace files
          const committedCount = (nextState.staged.length + stagedDeletions.length) || 1
          // Track which files have been committed so git status knows they're tracked
          nextState.committed_files = Array.from(new Set([...(nextState.committed_files || []), ...nextState.staged]))
          // Apply staged deletions: remove deleted files from committed_files
          nextState.committed_files = nextState.committed_files.filter(f => !stagedDeletions.includes(f))
          nextState.staged = []
          nextState.staged_deletions = []
          output = `[${activeBranch} ${hash}] ${msg}\n ${committedCount} file${committedCount !== 1 ? 's' : ''} changed`
        }
        } // end of non-amend branch
      }
      else if (sub === "log") {
        if (nextState.commits.length === 0) {
          output = `fatal: your current branch '${nextState.branch}' does not have any commits yet`
          status = "error"
        } else {
          // --all: show commits from every branch, not just HEAD's reachable chain
          const showAll = parts.includes("--all")
          const headCommit = nextState.commits.find(c => c.is_head)
          let reachable = nextState.commits
          if (!showAll && headCommit) {
            // Filter to commits reachable from HEAD by walking the parent chain.
            // Falls back to all commits if HEAD is ambiguous (no is_head set).
            const seen = new Set()
            const queue = [headCommit.hash]
            while (queue.length > 0) {
              const h = queue.shift()
              if (!h || seen.has(h)) continue
              const found = nextState.commits.find(c => c.hash === h)
              if (!found) continue
              seen.add(h)
              found.parents.forEach(p => queue.push(p))
            }
            reachable = nextState.commits.filter(c => seen.has(c.hash))
          }
          const oneline = parts.includes("--oneline") || parts.includes("--one-line")
          // -n N / -N / --max-count=N: limit the number of commits shown
          let maxCount = Infinity
          const shortN = parts.find(p => /^-\d+$/.test(p))
          if (shortN) maxCount = parseInt(shortN.slice(1), 10)
          const nIdx = parts.indexOf('-n')
          if (nIdx !== -1 && parts[nIdx + 1]) maxCount = parseInt(parts[nIdx + 1], 10) || maxCount
          const maxFlag = parts.find(p => p.startsWith('--max-count='))
          if (maxFlag) maxCount = parseInt(maxFlag.split('=')[1], 10) || maxCount
          const reversed = [...reachable].reverse().slice(0, maxCount)
          if (oneline) {
            output = reversed.map(c => {
              const brText = c.branches.length > 0 ? ` (${c.is_head ? 'HEAD -> ' : ''}${c.branches.join(', ')})` : ''
              return `${c.hash}${brText} ${c.message}`
            }).join("\n")
          } else {
            output = reversed.map(c => {
              const brText = c.branches.length > 0 ? ` (${c.is_head ? 'HEAD -> ' : ''}${c.branches.join(', ')})` : ''
              return `commit ${c.full_hash}${brText}\nAuthor: Gitify Offline Student <student@gitify.edu>\nDate: Wed Jun 10 2026\n\n    ${c.message}\n`
            }).join("\n")
          }
        }
      }
      else if (sub === "branch") {
        const flag = parts[2]
        const branchArg = parts[3] || parts[2]
        const isDelete = flag === "-d" || flag === "-D" || flag === "--delete"
        const isVerbose = flag === "-v" || flag === "--verbose" || flag === "-a" || flag === "--all"
        const isRename = flag === "-m" || flag === "-M" || flag === "--move"
        if (!flag || isVerbose) {
          const list = nextState.branches.map(b => (b === nextState.branch ? `* ${b}` : `  ${b}`))
          output = list.join("\n")
        } else if (isDelete) {
          const delName = branchArg
          if (!delName) { output = "fatal: branch name required"; status = "error" }
          else if (delName === nextState.branch) { output = `error: Cannot delete branch '${delName}' checked out`; status = "error" }
          else if (!nextState.branches.includes(delName)) { output = `error: branch '${delName}' not found`; status = "error" }
          else {
            nextState.branches = nextState.branches.filter(b => b !== delName)
            nextState.commits = nextState.commits.map(c => ({ ...c, branches: c.branches.filter(b => b !== delName) }))
            output = `Deleted branch ${delName}.`
          }
        } else if (isRename) {
          // git branch -m [<old>] <new>: rename a branch
          const oldName = parts[4] ? parts[3] : nextState.branch
          const newName = parts[4] ? parts[4] : parts[3]
          if (!newName) { output = "fatal: branch name required"; status = "error" }
          else if (!nextState.branches.includes(oldName)) { output = `error: branch '${oldName}' not found`; status = "error" }
          else if (nextState.branches.includes(newName)) { output = `fatal: A branch named '${newName}' already exists.`; status = "error" }
          else {
            nextState.branches = nextState.branches.map(b => b === oldName ? newName : b)
            nextState.commits = nextState.commits.map(c => ({ ...c, branches: c.branches.map(b => b === oldName ? newName : b) }))
            if (nextState.branch === oldName) nextState.branch = newName
            output = ""
          }
        } else {
          const newBranchName = flag
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
        const isDashDash = parts[2] === "--"
        if (isBFlag) {
          targetBranch = parts[3]
        }

        if (isDashDash) {
          // git checkout -- <file>: discard working-tree changes (restore from HEAD)
          const filename = parts[3]
          if (!filename) {
            output = "fatal: you must specify path(s) to restore"; status = "error"
          } else {
            output = `Restored '${filename}'`
          }
        } else if (!targetBranch) {
          output = "fatal: Branch name required."
          status = "error"
        } else {
          if (isBFlag) {
            if (nextState.branches.includes(targetBranch)) {
              output = `fatal: A branch named '${targetBranch}' already exists.`
              status = "error"
            } else {
              nextState.branches.push(targetBranch)
              // Stamp the new branch onto the HEAD commit so the next commit
              // can find its parent via branches.includes(activeBranch).
              const headCommit = nextState.commits.find(c => c.is_head)
              if (headCommit) headCommit.branches.push(targetBranch)
              nextState.branch = targetBranch
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.branches.includes(targetBranch) && c.is_head
              }))
              output = `Switched to a new branch '${targetBranch}'`
            }
          } else {
            if (nextState.branches.includes(targetBranch)) {
              nextState.branch = targetBranch
              // Use the last commit with targetBranch (insertion order = most recent tip).
              // Multiple commits can share a branch name after checkout -b stamping, so
              // branches.includes() alone would return the root, not the branch tip.
              const withBranch = nextState.commits.filter(c => c.branches.includes(targetBranch))
              const tipHash = withBranch.length > 0 ? withBranch[withBranch.length - 1].hash : null
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.hash === tipHash
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
        if (mergeSrc === "--abort") {
          if (!nextState.conflict_active) {
            output = "fatal: There is no merge in progress (MERGE_HEAD missing)."; status = "error"
          } else {
            nextState.conflict_active = false
            nextState.conflict_triggered = false
            output = "Merge aborted."
          }
        } else if (!mergeSrc) {
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
            // Integrate the source branch into the current branch's history so
            // `git log` reflects the merge. Previously only a flag was set, leaving
            // the merged commits invisible on the current branch.
            nextState.merged_offline = true
            const srcTip = [...nextState.commits].reverse().find(c => c.branches.includes(mergeSrc))
            const curTip = nextState.commits.find(c => c.is_head)
            const activeBranch = nextState.branch
            const reachable = (startHash) => {
              const seen = new Set(); const q = [startHash]
              while (q.length) {
                const h = q.shift()
                if (!h || seen.has(h)) continue
                seen.add(h)
                const c = nextState.commits.find(x => x.hash === h)
                if (c) c.parents.forEach(p => q.push(p))
              }
              return seen
            }
            if (!srcTip || !curTip || srcTip.hash === curTip.hash) {
              output = `Already up to date.`
            } else if (reachable(srcTip.hash).has(curTip.hash)) {
              // Fast-forward: current tip is an ancestor of source tip — advance the ref.
              curTip.branches = curTip.branches.filter(b => b !== activeBranch)
              if (!srcTip.branches.includes(activeBranch)) srcTip.branches.push(activeBranch)
              nextState.commits = nextState.commits.map(c => ({ ...c, is_head: c.hash === srcTip.hash }))
              output = `Updating ${curTip.hash}..${srcTip.hash}\nFast-forward\nMerge of '${mergeSrc}' complete.`
            } else if (reachable(curTip.hash).has(srcTip.hash)) {
              output = `Already up to date.`
            } else {
              // Divergent histories: create a merge commit with two parents.
              const hash = Math.random().toString(16).substring(2, 9)
              const mergeCommit = {
                hash,
                full_hash: hash + '0'.repeat(33),
                message: `Merge branch '${mergeSrc}' into ${activeBranch}`,
                branches: [activeBranch],
                parents: [curTip.hash, srcTip.hash],
                is_head: true
              }
              curTip.branches = curTip.branches.filter(b => b !== activeBranch)
              nextState.commits = nextState.commits.map(c => ({ ...c, is_head: false }))
              nextState.commits.push(mergeCommit)
              output = `Merge made by the 'ort' strategy.`
            }
          }
        }
      }
      else if (sub === "stash") {
        const action = parts[2]
        if (action === "pop" || action === "apply") {
          if (nextState.stashes.length === 0) {
            output = "No stash entries found."
            status = "error"
          } else {
            // Parse optional stash@{N} reference; default to top (stash@{0})
            const stashRef = parts[3]
            const dispIdx = stashRef ? parseInt((stashRef.match(/\{(\d+)\}/) || [, 0])[1], 10) : 0
            const arrIdx = nextState.stashes.length - 1 - dispIdx
            if (arrIdx < 0 || arrIdx >= nextState.stashes.length) {
              output = `error: ${stashRef} is not a valid reference`; status = "error"
            } else {
              const entry = nextState.stashes[arrIdx]
              // Restore only the files that were actually stashed
              if (entry.files) entry.files.forEach(f => { if (!nextState.files.includes(f)) nextState.files.push(f) })
              if (action === "pop") nextState.stashes.splice(arrIdx, 1)
              output = action === "pop"
                ? `Dropped refs/${stashRef || 'stash@{0}'}`
                : `Applied ${stashRef || 'stash@{0}'}`
            }
          }
        } else if (action === "list") {
          if (nextState.stashes.length === 0) {
            output = "(empty stash)"
          } else {
            // stash@{0} is the most recent stash (top of stack), so display in reverse order
            output = [...nextState.stashes].reverse().map((s, i) => {
              const br = s.label || nextState.branch
              return s.message ? `stash@{${i}}: On ${br}: ${s.message}` : `stash@{${i}}: WIP on ${br}: stashed changes`
            }).join("\n")
          }
        } else if (action === "show") {
          if (nextState.stashes.length === 0) {
            output = "No stash entries found."; status = "error"
          } else {
            const top = nextState.stashes[nextState.stashes.length - 1]
            output = (top.files || []).map(f => ` M ${f}`).join("\n") || "(empty stash)"
          }
        } else if (action === "drop") {
          if (nextState.stashes.length === 0) {
            output = "No stash entries found."; status = "error"
          } else {
            const stashRef = parts[3]
            const dispIdx = stashRef ? parseInt((stashRef.match(/\{(\d+)\}/) || [, 0])[1], 10) : 0
            const arrIdx = nextState.stashes.length - 1 - dispIdx
            if (arrIdx < 0 || arrIdx >= nextState.stashes.length) {
              output = `error: ${stashRef} is not a valid reference`; status = "error"
            } else {
              nextState.stashes.splice(arrIdx, 1)
              output = `Dropped ${stashRef || 'stash@{0}'}`
            }
          }
        } else {
          // git stash / git stash push [-m "msg"] / git stash save "msg"
          const mIdx = parts.indexOf('-m')
          const stashMsg = action === 'save'
            ? (parts[3] ? parts.slice(3).join(' ').replace(/^["']|["']$/g, '') : null)
            : (mIdx !== -1 && parts[mIdx + 1] ? parts.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '') : null)
          const committed = new Set(nextState.committed_files || [])
          const toStash = nextState.files.filter(f => !committed.has(f))
          if (toStash.length === 0 && nextState.staged.length === 0) {
            output = "No local changes to save"
          } else {
            const savedFiles = [...toStash, ...nextState.staged.filter(f => !toStash.includes(f))]
            nextState.stashes.push({
              id: nextState.stashes.length,
              name: `stash@{${nextState.stashes.length}}`,
              label: nextState.branch,
              message: stashMsg || null,
              files: savedFiles
            })
            nextState.stashed_offline = true
            nextState.files = nextState.files.filter(f => !toStash.includes(f))
            nextState.staged = nextState.staged.filter(f => !savedFiles.includes(f))
            const msgSuffix = stashMsg ? `: ${stashMsg}` : ': WIP stash'
            output = `Saved working directory and index state On ${nextState.branch}${msgSuffix}`
          }
        }
      }
      else if (sub === "cherry-pick") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const cherryHead = nextState.commits.find(c => c.is_head)
          const newCommit = {
            hash: 'b7a91c0',
            full_hash: 'b7a91c01c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Fix tax rounding",
            branches: [nextState.branch],
            parents: cherryHead ? [cherryHead.hash] : [],
            is_head: true
          }
          // Move the branch ref forward onto the new tip (see git commit handler).
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false,
            branches: c.branches.filter(b => b !== nextState.branch)
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
        const activeBranch = nextState.branch
        const remoteRef = `origin/${activeBranch}`
        const headCommit = nextState.commits.find(c => c.is_head)
        if (!headCommit || headCommit.branches.includes(remoteRef)) {
          output = "Everything up-to-date"
        } else {
          // Advance the remote-tracking ref to the local tip so the graph/log
          // show origin/<branch>. Previously push only set a flag, leaving the
          // remote-tracking concept invisible.
          nextState.commits = nextState.commits.map(c => ({ ...c, branches: c.branches.filter(b => b !== remoteRef) }))
          const tip = nextState.commits.find(c => c.is_head)
          tip.branches.push(remoteRef)
          output = `Enumerating objects: 3, done.\nTo origin\n   ${tip.hash}  ${activeBranch} -> ${activeBranch}`
        }
      }
      else if (sub === "revert") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const activeBranch = nextState.branch
          const revertHead = nextState.commits.find(c => c.is_head)
          const newCommit = {
            hash: 'rev1234',
            full_hash: 'rev12345c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Revert \"Skip null metric check\"",
            branches: [activeBranch],
            parents: revertHead ? [revertHead.hash] : [],
            is_head: true
          }
          // Move the branch ref forward onto the new tip (see git commit handler).
          nextState.commits = nextState.commits.map(c => ({ ...c, is_head: false, branches: c.branches.filter(b => b !== activeBranch) }))
          nextState.commits.push(newCommit)
          output = `[${activeBranch} rev1234] Revert "Skip null metric check"`
        }
      }
      else if (sub === "reset") {
        const flags = parts.slice(2).filter(a => a.startsWith('-'))
        const targets = parts.slice(2).filter(a => !a.startsWith('-'))
        const isHard = flags.includes('--hard')
        const target = targets[0] // HEAD, HEAD~N, or a hash
        const fileArg = targets[1] // only for `git reset HEAD <file>`

        if (!target || target === 'HEAD') {
          // git reset [HEAD] [<file>] — unstage file(s)
          if (fileArg) {
            nextState.staged = nextState.staged.filter(f => f !== fileArg)
          } else {
            nextState.staged = []
          }
          output = ""
        } else if (target.startsWith('HEAD~')) {
          const n = parseInt(target.slice('HEAD~'.length), 10) || 1
          const newLen = Math.max(0, nextState.commits.length - n)
          nextState.commits = nextState.commits.slice(0, newLen)
          if (isHard) nextState.staged = []
          const head = nextState.commits[newLen - 1]
          nextState.commits = nextState.commits.map((c, i) => ({ ...c, is_head: i === newLen - 1 }))
          // Move the branch pointer to the new HEAD so git log shows (HEAD -> branch)
          if (head && !head.branches.includes(nextState.branch)) head.branches.push(nextState.branch)
          output = head ? `HEAD is now at ${head.hash} ${head.message}` : "HEAD is now at (empty)"
        } else {
          // hash-based reset: truncate commits after the target
          const idx = nextState.commits.findIndex(c => c.hash === target || c.full_hash?.startsWith(target))
          if (idx === -1) {
            output = `fatal: ambiguous argument '${target}': unknown revision`; status = "error"
          } else {
            nextState.commits = nextState.commits.slice(0, idx + 1)
            if (isHard) nextState.staged = []
            const head = nextState.commits[idx]
            nextState.commits = nextState.commits.map((c, i) => ({ ...c, is_head: i === idx }))
            // Move the branch pointer to the new HEAD so git log shows (HEAD -> branch)
            if (head && !head.branches.includes(nextState.branch)) head.branches.push(nextState.branch)
            output = `HEAD is now at ${head.hash} ${head.message}`
          }
        }
      }
      else if (sub === "rebase") {
        const isInteractive = parts.includes("-i")
        const isAbort = parts.includes("--abort")
        const isContinue = parts.includes("--continue")
        if (isAbort) {
          output = "Rebase aborted."
        } else if (isContinue) {
          output = "Successfully rebased and updated."
        } else if (isInteractive) {
          nextState.commits = nextState.commits.filter(c => !c.message.includes("debug payment state"))
          nextState.commits = nextState.commits.filter(c => !c.message.includes("Fix typo"))
          output = "Successfully rebased and updated timeline offline."
        } else {
          output = "Rebase complete."
        }
      }
      // git switch <branch> — modern alternative to git checkout <branch>
      else if (sub === "switch") {
        const isCFlag = parts[2] === "-c" || parts[2] === "--create"
        const targetBranch = isCFlag ? parts[3] : parts[2]
        if (!targetBranch) {
          output = "fatal: branch name required"; status = "error"
        } else if (isCFlag) {
          if (nextState.branches.includes(targetBranch)) {
            output = `fatal: a branch named '${targetBranch}' already exists`; status = "error"
          } else {
            nextState.branches.push(targetBranch)
            const headCommit = nextState.commits.find(c => c.is_head)
            if (headCommit) headCommit.branches.push(targetBranch)
            nextState.branch = targetBranch
            output = `Switched to a new branch '${targetBranch}'`
          }
        } else {
          if (!nextState.branches.includes(targetBranch)) {
            output = `fatal: invalid reference: ${targetBranch}`; status = "error"
          } else {
            nextState.branch = targetBranch
            const withBranch = nextState.commits.filter(c => c.branches.includes(targetBranch))
            const tipHash = withBranch.length > 0 ? withBranch[withBranch.length - 1].hash : null
            nextState.commits = nextState.commits.map(c => ({ ...c, is_head: c.hash === tipHash }))
            output = `Switched to branch '${targetBranch}'`
          }
        }
      }
      // git restore — unstage (--staged) or discard working-tree changes
      else if (sub === "restore") {
        const isStaged = parts.includes("--staged") || parts.includes("-S")
        const filename = parts.find(p => !p.startsWith("-") && p !== "restore" && p !== "git")
        if (isStaged && filename) {
          // '.' and ':/' are "all files" wildcards; clear the entire staged list
          if (filename === '.' || filename === ':/' || filename === '*') {
            nextState.staged = []
          } else {
            nextState.staged = nextState.staged.filter(f => f !== filename)
          }
          output = ""
        } else if (!isStaged && filename) {
          if (filename === '.' || filename === ':/' || filename === '*') {
            nextState.files = [...(nextState.committed_files || [])]
          }
          output = `Restored '${filename}'`
        } else {
          output = "fatal: you must specify path(s) to restore"; status = "error"
        }
      }
      // git diff — show unstaged changes or diff between HEAD and staged
      else if (sub === "diff") {
        const isCached = parts.includes("--cached") || parts.includes("--staged")
        // Slice past 'git' and 'diff'; exclude flags and HEAD refs to get the optional filename arg
        const targetFile = parts.slice(2).find(p => !p.startsWith("-") && !p.match(/^HEAD/))
        const showFiles = targetFile ? [targetFile] : (isCached ? nextState.staged : nextState.files.filter(f => !nextState.staged.includes(f)))
        if (showFiles.length === 0) {
          output = ""
        } else {
          output = showFiles.map(f => {
            const content = nextState.fileContents[f] || ""
            return `diff --git a/${f} b/${f}\n--- a/${f}\n+++ b/${f}\n@@ -0,0 +1,${content.split('\n').length} @@\n${content.split('\n').map(l => `+${l}`).join('\n')}`
          }).join("\n\n")
        }
      }
      // git rm — stage file deletion (remove from working tree unless --cached)
      else if (sub === "rm") {
        const isCached = parts.includes("--cached")
        const filename = parts.slice(2).find(p => !p.startsWith("-"))
        if (!filename) {
          output = "fatal: No pathspec given"; status = "error"
        } else if (!nextState.files.includes(filename) && !(nextState.committed_files || []).includes(filename)) {
          output = `fatal: pathspec '${filename}' did not match any files`; status = "error"
        } else {
          if (!isCached) {
            nextState.files = nextState.files.filter(f => f !== filename)
            delete nextState.fileContents[filename]
          }
          nextState.staged = nextState.staged.filter(f => f !== filename)
          // Stage the deletion so `git commit` will remove the file from committed_files
          if (!nextState.staged_deletions) nextState.staged_deletions = []
          if (!nextState.staged_deletions.includes(filename)) nextState.staged_deletions.push(filename)
          output = `rm '${filename}'`
        }
      }
      // git remote — add/show/rename/remove/get-url remotes
      else if (sub === "remote") {
        const action = parts[2]
        const remName = parts[3]
        if (!action || action === "-v" || action === "--verbose") {
          const name = nextState.remoteName || "origin"
          output = nextState.remote
            ? `${name}\t${nextState.remote} (fetch)\n${name}\t${nextState.remote} (push)`
            : "(no remotes configured)"
        } else if (action === "add") {
          nextState.remoteName = remName || "origin"
          nextState.remote = parts[4] || "https://github.com/you/repo.git"
          output = ""
        } else if (action === "rename") {
          const newName = parts[4]
          if (!remName || !newName) { output = "usage: git remote rename <old> <new>"; status = "error" }
          else { nextState.remoteName = newName; output = "" }
        } else if (action === "remove" || action === "rm") {
          if (!remName) { output = "usage: git remote remove <name>"; status = "error" }
          else { nextState.remote = null; nextState.remoteName = null; output = "" }
        } else if (action === "get-url") {
          if (!nextState.remote) { output = `error: No such remote '${remName || 'origin'}'`; status = "error" }
          else output = nextState.remote
        } else if (action === "set-url") {
          const newUrl = parts[4]
          if (!newUrl) { output = "usage: git remote set-url <name> <url>"; status = "error" }
          else { nextState.remote = newUrl; output = "" }
        } else {
          output = `git remote: '${action}' is not a git command`; status = "error"
        }
      }
      // git tag — list, create (lightweight or annotated), or delete tags
      else if (sub === "tag") {
        if (!nextState.tags) nextState.tags = []
        const isDelete = parts.includes("-d") || parts.includes("--delete")
        // Tag name is the first non-flag argument after 'tag'
        const tagName = parts.slice(2).find(p => !p.startsWith("-"))
        if (isDelete) {
          if (!tagName) { output = "error: tag name required"; status = "error" }
          else if (!nextState.tags.includes(tagName)) { output = `error: tag '${tagName}' not found`; status = "error" }
          else { nextState.tags = nextState.tags.filter(t => t !== tagName); output = `Deleted tag '${tagName}'` }
        } else if (!tagName) {
          output = nextState.tags.length ? nextState.tags.join('\n') : '(no tags)'
        } else if (nextState.tags.includes(tagName)) {
          output = `fatal: tag '${tagName}' already exists`; status = "error"
        } else {
          nextState.tags.push(tagName)
          output = ""
        }
      }
      // git config — get/set/list configuration values
      else if (sub === "config") {
        const isList = parts.includes("--list") || parts.includes("-l")
        if (isList) {
          const entries = Object.entries(nextState.config || {}).map(([k, v]) => `${k}=${v}`)
          output = entries.length ? entries.join('\n') : 'user.name=Student\nuser.email=student@gitify.edu'
        } else {
          // git config [--global] <key> [<value>]
          const keyIdx = parts.findIndex(p => !p.startsWith('-') && p !== 'git' && p !== 'config')
          const key = keyIdx !== -1 ? parts[keyIdx] : null
          const value = keyIdx !== -1 && parts[keyIdx + 1]
            ? parts.slice(keyIdx + 1).join(' ').replace(/^["']|["']$/g, '') : null
          if (!key) { output = "usage: git config [--global] key [value]"; status = "error" }
          else if (value !== null) {
            if (!nextState.config) nextState.config = {}
            nextState.config[key] = value
            output = ""
          } else {
            const val = (nextState.config || {})[key]
            if (val === undefined) { output = `error: key does not contain a section: ${key}`; status = "error" }
            else output = val
          }
        }
      }
      // git show [<hash>] — display commit details
      else if (sub === "show") {
        const hashArg = parts[2] && !parts[2].startsWith('-') ? parts[2] : null
        const target = hashArg
          ? nextState.commits.find(c => c.hash === hashArg || c.full_hash?.startsWith(hashArg))
          : nextState.commits.find(c => c.is_head)
        if (!target) {
          output = `fatal: ambiguous argument '${hashArg || 'HEAD'}': unknown revision or path`; status = "error"
        } else {
          const brText = target.branches.length > 0 ? ` (${target.is_head ? 'HEAD -> ' : ''}${target.branches.join(', ')})` : ''
          output = `commit ${target.full_hash}${brText}\nAuthor: Gitify Offline Student <student@gitify.edu>\nDate:   Wed Jun 10 2026\n\n    ${target.message}\n`
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
