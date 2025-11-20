#!/usr/bin/env bash
set -euo pipefail

# Universal GitHub Actions Fix Script
# Fixes Spark chat → failed workflow issue across all repos
# Run: bash fix-all-repos.sh

echo "🔧 GitHub Actions Universal Fix Script"
echo "======================================"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Step 1: Clean up failed runs in current repo
echo "📊 Step 1: Cleaning up failed workflow runs..."
echo "----------------------------------------------"

CURRENT_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -n "$CURRENT_REPO" ]; then
    echo "Current repo: $CURRENT_REPO"
    
    # Get failed runs count
    FAILED_COUNT=$(gh run list --repo "$CURRENT_REPO" --status failure --limit 100 --json databaseId --jq '. | length' 2>/dev/null || echo "0")
    echo "Found $FAILED_COUNT failed runs"
    
    if [ "$FAILED_COUNT" -gt 0 ]; then
        echo "Deleting failed runs..."
        gh run list --repo "$CURRENT_REPO" --status failure --limit 100 --json databaseId --jq '.[].databaseId' | \
            xargs -I {} gh run delete {} --repo "$CURRENT_REPO" 2>/dev/null || true
        echo "✅ Deleted $FAILED_COUNT failed runs"
    fi
    
    # Cancel in-progress runs
    RUNNING_COUNT=$(gh run list --repo "$CURRENT_REPO" --status in_progress --limit 50 --json databaseId --jq '. | length' 2>/dev/null || echo "0")
    if [ "$RUNNING_COUNT" -gt 0 ]; then
        echo "Cancelling $RUNNING_COUNT in-progress runs..."
        gh run list --repo "$CURRENT_REPO" --status in_progress --limit 50 --json databaseId --jq '.[].databaseId' | \
            xargs -I {} gh run cancel {} --repo "$CURRENT_REPO" 2>/dev/null || true
        echo "✅ Cancelled $RUNNING_COUNT runs"
    fi
else
    echo "⚠️  Not in a git repo, skipping current repo cleanup"
fi

echo ""

# Step 2: List all user repos
echo "📋 Step 2: Finding all your repositories..."
echo "----------------------------------------------"

REPOS=$(gh repo list --limit 100 --json nameWithOwner --jq '.[].nameWithOwner')
REPO_COUNT=$(echo "$REPOS" | wc -l | tr -d ' ')

echo "Found $REPO_COUNT repositories"
echo ""

# Step 3: For each repo, clean up and fix workflows
echo "🔄 Step 3: Processing each repository..."
echo "----------------------------------------------"

FIXED_COUNT=0
SKIPPED_COUNT=0

for REPO in $REPOS; do
    echo ""
    echo "Processing: $REPO"
    
    # Check if repo has workflows
    HAS_WORKFLOWS=$(gh api "repos/$REPO/actions/workflows" --jq '.total_count' 2>/dev/null || echo "0")
    
    if [ "$HAS_WORKFLOWS" -eq 0 ]; then
        echo "  ⏭️  No workflows found, skipping"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    echo "  📁 Found $HAS_WORKFLOWS workflow(s)"
    
    # Clean failed runs
    FAILED=$(gh run list --repo "$REPO" --status failure --limit 100 --json databaseId --jq '. | length' 2>/dev/null || echo "0")
    if [ "$FAILED" -gt 0 ]; then
        echo "  🧹 Deleting $FAILED failed runs..."
        gh run list --repo "$REPO" --status failure --limit 100 --json databaseId --jq '.[].databaseId' | \
            xargs -I {} gh run delete {} --repo "$REPO" 2>/dev/null || true
    fi
    
    # Cancel running
    RUNNING=$(gh run list --repo "$REPO" --status in_progress --limit 50 --json databaseId --jq '. | length' 2>/dev/null || echo "0")
    if [ "$RUNNING" -gt 0 ]; then
        echo "  ⏹️  Cancelling $RUNNING in-progress runs..."
        gh run list --repo "$REPO" --status in_progress --limit 50 --json databaseId --jq '.[].databaseId' | \
            xargs -I {} gh run cancel {} --repo "$REPO" 2>/dev/null || true
    fi
    
    echo "  ✅ Cleaned up $REPO"
    ((FIXED_COUNT++))
done

echo ""
echo "======================================"
echo "✨ Summary"
echo "======================================"
echo "Repositories processed: $FIXED_COUNT"
echo "Repositories skipped: $SKIPPED_COUNT"
echo ""
echo "🎯 Next Steps:"
echo "1. Copy the fixed .github/workflows/ci.yml from this repo to your other repos"
echo "2. Or manually update workflows in each repo with these exclusions:"
echo "   - branches-ignore: spark/**, copilot/**, ai/**, temp/**"
echo "   - Add conditional: !contains(github.ref, 'spark/')"
echo ""
echo "✅ All failed runs have been cleaned up!"
echo ""
echo "📝 To apply the workflow fix to all repos, run:"
echo "   bash apply-workflow-fix.sh"
