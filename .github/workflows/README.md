# GitHub Actions Workflow Fix Guide

This directory contains GitHub Actions workflow files. If you have 40 stuck workflows, follow these steps:

## Common Issues and Fixes

### 1. Deprecated Actions
- **Problem**: Using old action versions (e.g., `actions/checkout@v2`)
- **Fix**: Update to latest versions:
  - `actions/checkout@v4`
  - `actions/setup-node@v4`
  - `actions/upload-artifact@v4`
  - `actions/download-artifact@v4`

### 2. Missing Permissions
- **Problem**: Workflows fail due to missing permissions
- **Fix**: Add at the workflow level:
  ```yaml
  permissions:
    contents: read
    actions: read
    checks: write
  ```

### 3. Node.js Version Issues
- **Problem**: Using outdated Node.js versions (< 18)
- **Fix**: Update matrix strategy:
  ```yaml
  strategy:
    matrix:
      node-version: [18.x, 20.x]
  ```

### 4. Timeout Issues
- **Problem**: Workflows hang indefinitely
- **Fix**: Add timeout:
  ```yaml
  jobs:
    build:
      timeout-minutes: 15
  ```

### 5. Cache Issues
- **Problem**: npm install fails or takes too long
- **Fix**: Use built-in cache support:
  ```yaml
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'
  ```

### 6. set-env and add-path Commands
- **Problem**: Deprecated `set-env` or `add-path` commands
- **Fix**: Use environment files:
  ```bash
  echo "VAR_NAME=value" >> $GITHUB_ENV
  echo "/path/to/bin" >> $GITHUB_PATH
  ```

### 7. Missing continue-on-error
- **Problem**: Optional steps cause workflow failure
- **Fix**: Add to non-critical steps:
  ```yaml
  - run: npm run lint --if-present
    continue-on-error: true
  ```

## Quick Fix Commands

### Delete all workflow runs (via GitHub CLI)
```bash
# Install GitHub CLI first: brew install gh

# Delete all runs for a specific workflow
gh run list --workflow=ci.yml --limit 100 --json databaseId --jq '.[].databaseId' | xargs -I {} gh run delete {}

# Delete all failed runs
gh run list --status failure --limit 100 --json databaseId --jq '.[].databaseId' | xargs -I {} gh run delete {}
```

### Cancel all running workflows
```bash
gh run list --status in_progress --json databaseId --jq '.[].databaseId' | xargs -I {} gh run cancel {}
```

### Disable a workflow
```bash
gh workflow disable <workflow-name>
```

### Re-enable a workflow
```bash
gh workflow enable <workflow-name>
```

## Safe Workflow Template

The `ci.yml` file in this directory is a safe, modern template that includes:
- Latest action versions
- Proper permissions
- Timeout protection
- Cache support
- Continue-on-error for optional steps
- Multi-version Node.js testing

## Testing Locally

Before pushing workflow changes, test locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run workflow locally
act -j build

# Run with specific event
act push

# Dry run to see what would execute
act --dryrun
```

## Monitoring

After fixing workflows:
1. Go to Actions tab in GitHub
2. Click "All workflows"
3. Check status of recent runs
4. Review logs for any remaining issues

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
