const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

export function getInitialOfflineState(lessonId) {
  const base = {
    initialized: false,
    pwd: '',
    branch: 'main',
    files: [],
    fileContents: {},
    staged: [],
    commits: [],
    stashes: [],
    branches: ['main'],
    lessonId: lessonId
  }

  if (lessonId === 0 || lessonId === 1) {
    base.files = ['index.js', 'App.jsx']
    base.fileContents = {
      'index.js': "// working directory file\nconsole.log('Basics');",
      'App.jsx': '// App UI core'
    }
  } else if (lessonId === 2) {
    base.initialized = true
    base.files = ['index.js']
    base.fileContents = {
      'index.js': "console.log('init');"
    }
    base.commits = [
      { hash: 'c1c1c1c', full_hash: 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Init setup', branches: ['main'], parents: [], is_head: true }
    ]
  } else if (lessonId === 3) {
    base.initialized = true
    base.branches = ['main', 'feature/ui']
    base.files = ['config.js']
    base.fileContents = {
      'config.js': "export const config = {\n  api: '/v1',\n  retries: 3,\n  theme: 'dark'\n};\n"
    }
    base.commits = [
      { hash: 'c1c1c1c', full_hash: 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Base config', branches: [], parents: [], is_head: false },
      { hash: 'c2c2c2c', full_hash: 'c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2', message: 'ALEX: set dark theme', branches: ['main'], parents: ['c1c1c1c'], is_head: true },
      { hash: 'd1d1d1d', full_hash: 'd1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1', message: 'SAM: set light theme', branches: ['feature/ui'], parents: ['c1c1c1c'], is_head: false }
    ]
  } else if (lessonId === 4) {
    base.initialized = true
    base.files = ['Dashboard.jsx', 'auth.js', 'metrics.js', 'Chart.jsx', 'Spinner.jsx', 'deploy.yml', 'CHANGELOG.md']
    base.fileContents = {
      'Dashboard.jsx': '// Dashboard core\n',
      'auth.js': '// Auth middleware\n',
      'metrics.js': 'return metric.value.toFixed(2)\n',
      'Chart.jsx': '// Chart layout\n',
      'Spinner.jsx': '// Spinner feedback\n',
      'deploy.yml': 'replicas: 1\n',
      'CHANGELOG.md': 'version: 1.3.2\n'
    }
    base.commits = [
      { hash: 'a1a1a1a', full_hash: 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1', message: 'Initial dashboard', branches: [], parents: [], is_head: false },
      { hash: 'b2b2b2b', full_hash: 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2', message: 'Add auth guard', branches: [], parents: ['a1a1a1a'], is_head: false },
      { hash: 'c3c3c3c', full_hash: 'c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3', message: 'Cache metrics', branches: [], parents: ['b2b2b2b'], is_head: false },
      { hash: 'd4d4d4d', full_hash: 'd4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4', message: 'Tune chart layout', branches: [], parents: ['c3c3c3c'], is_head: false },
      { hash: 'e5e5e5e', full_hash: 'e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5', message: 'Skip null metric check', branches: [], parents: ['d4d4d4d'], is_head: false },
      { hash: 'f6f6f6f', full_hash: 'f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6', message: 'Polish loading state', branches: [], parents: ['e5e5e5e'], is_head: false },
      { hash: 'g7g7g7g', full_hash: 'g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7g7', message: 'Update deploy config', branches: [], parents: ['f6f6f6f'], is_head: false },
      { hash: 'h8h8h8h', full_hash: 'h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8h8', message: 'Release production', branches: ['main'], parents: ['g7g7g7g'], is_head: true }
    ]
  } else if (lessonId === 5) {
    base.initialized = true
    base.branch = 'feature/payments'
    base.branches = ['feature/payments', 'hotfix/invoice']
    base.files = ['Checkout.jsx', 'styles.css']
    base.fileContents = {
      'Checkout.jsx': '// WIP Payments module\n',
      'styles.css': 'body { background: #000; }'
    }
    base.commits = [
      { hash: 'b7a91c0', full_hash: 'b7a91c01c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Fix tax rounding', branches: ['hotfix/invoice'], parents: [], is_head: false }
    ]
  } else if (lessonId === 6) {
    base.initialized = true
    base.files = ['README.md', 'auth.js']
    base.fileContents = {
      'README.md': '# Gitify Collab Project\n',
      'auth.js': '// Student local changes: login form implementation\n'
    }
    base.commits = [
      { hash: 'c1c1c1c', full_hash: 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Init project', branches: ['origin/main'], parents: [], is_head: false },
      { hash: 's2s2s2s', full_hash: 's2s2s2s2s2s2s2s2s2s2s2s2s2s2s2s2s2s2s2s2', message: 'nav polish', branches: [], parents: ['c1c1c1c'], is_head: false },
      { hash: 'p3p3p3p', full_hash: 'p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3p3', message: 'retry logic', branches: ['main', 'origin/HEAD'], parents: ['s2s2s2s'], is_head: true }
    ]
  } else if (lessonId === 7) {
    base.initialized = true
    base.files = ['app.js', 'checkout.js', 'stripe.js', 'debug.txt']
    base.fileContents = {
      'app.js': '// Main application core\n',
      'checkout.js': '// checkout form component - fixed typo in layout labels and handled declined cards\n',
      'stripe.js': '// stripe integration helper\n',
      'debug.txt': 'temporary payment debug file\n'
    }
    base.commits = [
      { hash: 'c1c1c1c', full_hash: 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Base commit', branches: [], parents: [], is_head: false },
      { hash: 'c2c2c2c', full_hash: 'c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2', message: 'Add checkout form', branches: [], parents: ['c1c1c1c'], is_head: false },
      { hash: 'c3c3c3c', full_hash: 'c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3', message: 'Fix typo in payment copy', branches: [], parents: ['c2c2c2c'], is_head: false },
      { hash: 'c4c4c4c', full_hash: 'c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4c4', message: 'Wire Stripe token', branches: [], parents: ['c3c3c3c'], is_head: false },
      { hash: 'c5c5c5c', full_hash: 'c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5', message: 'debug payment state', branches: [], parents: ['c4c4c4c'], is_head: false },
      { hash: 'c6c6c6c', full_hash: 'c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6c6', message: 'Handle declined cards', branches: ['main'], parents: ['c5c5c5c'], is_head: true }
    ]
  } else if (lessonId === 8) {
    // Lesson 8 is a simulated GitHub fork/PR workflow (not real local git).
    base.scenario = 'fork'
    base.fork = { fork: false, clone: false, commit: false, push: false, pr: false, merge: false, sync: false }
  }

  return base
}

export function getInitialSubtasks(lessonId) {
  switch (lessonId) {
    case 1:
      return [
        { id: "init", title: "Initialize Git repository ('git init')", completed: false },
        { id: "stage", title: "Stage files ('git add')", completed: false },
        { id: "commit", title: "Create a commit snapshot ('git commit')", completed: false },
        { id: "push", title: "Push commit to remote ('git push')", completed: false }
      ]
    case 2:
      return [
        { id: "create_branch", title: "Create branch 'feature/auth'", completed: false },
        { id: "commit_feature", title: "Make a commit on 'feature/auth'", completed: false },
        { id: "checkout_main", title: "Switch back to 'main' branch", completed: false },
        { id: "merge_branch", title: "Merge 'feature/auth' into 'main'", completed: false }
      ]
    case 3:
      return [
        { id: "trigger_conflict", title: "Trigger conflict by merging 'feature/ui'", completed: false },
        { id: "resolve_conflict", title: "Resolve merge conflicts in config.js", completed: false },
        { id: "stage_resolved", title: "Stage resolved config.js ('git add')", completed: false },
        { id: "commit_merge", title: "Commit the resolved merge", completed: false }
      ]
    case 4:
      return [
        { id: "revert_commit", title: "Revert the buggy commit ('git revert')", completed: false },
        { id: "reset_clean", title: "Explore soft/hard resets ('git reset')", completed: false },
        { id: "safety_matrix", title: "Match situations in the Safety Matrix", completed: false }
      ]
    case 5:
      return [
        { id: "stash_wip", title: "Stash uncommitted changes ('git stash')", completed: false },
        { id: "switch_branch", title: "Switch branch safely ('git checkout')", completed: false },
        { id: "cherry_pick", title: "Cherry-pick hotfix commit ('git cherry-pick')", completed: false },
        { id: "pop_stash", title: "Pop stashed changes back ('git stash pop')", completed: false }
      ]
    case 6:
      return [
        { id: "fetch_remote", title: "Fetch remote branches ('git fetch')", completed: false },
        { id: "pull_remote", title: "Pull remote commits ('git pull')", completed: false },
        { id: "resolve_push", title: "Handle push conflict via rebase ('git pull --rebase')", completed: false }
      ]
    case 7:
      return [
        { id: "interactive_rebase", title: "Configure interactive rebase N commits", completed: false },
        { id: "squash_commits", title: "Squash and reorder target commits", completed: false },
        { id: "clean_timeline", title: "Complete clean linear rebase history", completed: false }
      ]
    case 8:
      return [
        { id: "fork", title: "Fork the upstream repo ('gh repo fork')", completed: false },
        { id: "clone", title: "Clone your fork ('git clone')", completed: false },
        { id: "commit", title: "Branch & commit your fix ('git commit')", completed: false },
        { id: "push", title: "Push to your fork ('git push origin')", completed: false },
        { id: "pr", title: "Open a pull request ('gh pr create')", completed: false },
        { id: "merge", title: "Merge the pull request ('gh pr merge')", completed: false }
      ]
    default:
      return []
  }
}
