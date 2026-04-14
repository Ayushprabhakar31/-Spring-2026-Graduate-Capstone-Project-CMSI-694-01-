#!/bin/bash

# Exit on error
set -e

# Config (edit these if needed)
BRANCH_NAME="feature/final-capstone"
COMMIT_MESSAGE="Final capstone submission"
PR_TITLE="Final Capstone Project"
PR_BODY="This PR contains the complete backend and frontend implementation."

echo "🚀 Starting PR creation..."

# Initialize git if not already
if [ ! -d ".git" ]; then
  echo "📦 Initializing git repo..."
  git init
fi

# Add remote if not exists
if ! git remote | grep origin > /dev/null; then
  echo "🔗 Adding remote..."
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
fi

# Create branch
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b $BRANCH_NAME || git checkout $BRANCH_NAME

# Add all files
echo "📁 Adding files..."
git add .

# Commit
echo "💾 Committing..."
git commit -m "$COMMIT_MESSAGE" || echo "⚠️ Nothing to commit"

# Push
echo "☁️ Pushing to GitHub..."
git push -u origin $BRANCH_NAME

# Create PR
echo "🔀 Creating Pull Request..."
gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base main --head $BRANCH_NAME

echo "✅ PR created successfully!"

