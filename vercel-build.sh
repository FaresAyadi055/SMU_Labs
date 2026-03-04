#!/bin/bash
# vercel-build.sh - Works with npm install

echo "🔧 Starting post-build fixes..."

# Step 1: Check if function directory exists
if [ ! -d ".vercel/output/functions/__fallback.func" ]; then
    echo "❌ Function directory not found! Build may have failed."
    exit 1
fi

# Step 2: Go to function directory
cd .vercel/output/functions/__fallback.func

echo "🔍 Found function directory, checking dependencies..."

# Step 3: Add Magic SDK if not present (npm creates flat structure automatically!)
if [ ! -d "node_modules/@magic-sdk/admin" ]; then
    echo "🔮 Adding Magic SDK..."
    npm install --no-save @magic-sdk/admin
fi

# Step 4: Verify critical packages
echo "🔍 Verifying packages..."
node -e "
const packages = ['mongoose', '@magic-sdk/admin'];
packages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log('  ✅ ' + pkg);
  } catch (e) {
    console.log('  ❌ ' + pkg + ': ' + e.message);
    process.exit(1);
  }
});
"

# Step 5: Go back
cd ../../../..

echo "✅ Post-build fixes complete!"
