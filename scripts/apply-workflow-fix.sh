#!/usr/bin/env bash
set -euo pipefail

# Apply the fixed workflow to all repositories
# This clones each repo, updates the workflow, commits and pushes

echo "🚀 Applying Workflow Fix to All Repositories"
echo "============================================="
echo ""

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI required. Install: brew install gh"
    exit 1
fi

TEMPLATE_WORKFLOW="$PWD/.github/workflows/ci.yml"

if [ ! -f "$TEMPLATE_WORKFLOW" ]; then
    echo "❌ Template workflow not found at: $TEMPLATE_WORKFLOW"
    exit 1
fi

echo "✅ Template workflow: $TEMPLATE_WORKFLOW"
echo ""

# Get all repos
REPOS=$(gh repo list --limit 100 --json nameWithOwner --jq '.[].nameWithOwner')
TEMP_DIR=$(mktemp -d)

echo "Working directory: $TEMP_DIR"
echo ""

UPDATED=0
SKIPPED=0

for REPO in $REPOS; do
    echo "Processing: $REPO"
    
    REPO_DIR="$TEMP_DIR/$(basename $REPO)"
    
    # Clone repo
    if gh repo clone "$REPO" "$REPO_DIR" -- --depth 1 2>/dev/null; then
        cd "$REPO_DIR"
        
        # Check if workflows dir exists
        if [ ! -d ".github/workflows" ]; then
            mkdir -p ".github/workflows"
        fi
        
        # Copy the fixed workflow
        cp "$TEMPLATE_WORKFLOW" ".github/workflows/ci.yml"
        
        # Commit and push if changed
        if git diff --quiet; then
            echo "  ⏭️  No changes needed"
            ((SKIPPED++))
        else
            git config user.name "GitHub Actions Fix Bot"
            git config user.email "actions@github.com"
            git add .github/workflows/ci.yml
            git commit -m "fix(ci): prevent Spark chat sessions from triggering workflow failures

- Add branch exclusions for spark/**, copilot/**, ai/**, temp/**
- Add path exclusions for markdown and docs
- Add conditional to skip AI-triggered commits
- Restrict PR triggers to ready_for_review only"
            
            if git push origin HEAD 2>/dev/null; then
                echo "  ✅ Updated and pushed"
                ((UPDATED++))
            else
                echo "  ⚠️  Failed to push (check permissions)"
            fi
        fi
        
        cd - > /dev/null
    else
        echo "  ⚠️  Failed to clone"
    fi
    
    echo ""
done

# Cleanup
rm -rf "$TEMP_DIR"

echo "============================================="
echo "✨ Summary"
echo "============================================="
echo "Repositories updated: $UPDATED"
echo "Repositories skipped: $SKIPPED"
echo ""
echo "✅ Done!"
