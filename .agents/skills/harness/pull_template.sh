#!/bin/bash

# Script to pull and convert a harness-100 template to Antigravity format
TEMPLATE_ID=$1
if [ -z "$TEMPLATE_ID" ]; then
    echo "❌ Error: Missing template ID."
    echo "Usage: ./pull_template.sh <template-id>"
    exit 1
fi

echo "🔍 Fetching template '$TEMPLATE_ID' from revfactory/harness-100..."

# Use a temporary directory for sparse checkout
TEMP_DIR=$(mktemp -d)
ORIGINAL_DIR=$(pwd)

cd "$TEMP_DIR"
# Sparse clone to avoid downloading the whole 15MB repo
git clone --depth 1 --filter=blob:none --sparse https://github.com/revfactory/harness-100.git > /dev/null 2>&1
cd harness-100
git sparse-checkout set "en/$TEMPLATE_ID" > /dev/null 2>&1

if [ ! -d "en/$TEMPLATE_ID/.claude" ]; then
    echo "❌ Error: Template '$TEMPLATE_ID' not found in the repository."
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "🔄 Converting template to Antigravity L3 Meta-Factory format..."
# Copy the `.claude` folder to the user's current directory as `.agent`
cp -r "en/$TEMPLATE_ID/.claude" "$ORIGINAL_DIR/.agent"

cd "$ORIGINAL_DIR"

# 1. Rename agents to knowledge (Antigravity's Persona location)
if [ -d ".agent/agents" ]; then
    mv .agent/agents .agent/knowledge
fi

# 2. Replace the word `.claude` with `.agent` inside all markdown files
# We try macOS sed first, then fallback to Linux sed
find .agent -type f -name "*.md" -exec sed -i '' 's/\.claude/\.agent/g' {} + 2>/dev/null || \
find .agent -type f -name "*.md" -exec sed -i 's/\.claude/\.agent/g' {} + 2>/dev/null

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Success! Template '$TEMPLATE_ID' is now installed."
echo "You can check the personas at .agent/knowledge/ and skills at .agent/skills/."
