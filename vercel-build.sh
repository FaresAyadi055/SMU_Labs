#!/bin/bash
# vercel-build.sh - Runs AFTER default build to fix pnpm symlinks

echo "🔧 Starting post-build fixes..."

# Step 1: Check if function directory exists
if [ ! -d ".vercel/output/functions/__fallback.func" ]; then
    echo "❌ Function directory not found! Build may have failed."
    exit 1
fi

# Step 2: Go to function directory
cd .vercel/output/functions/__fallback.func

echo "🔍 Found function directory, fixing pnpm symlinks..."

# Step 3: Find all broken symlinks and fix them
find node_modules -type l | while read symlink; do
    # Get the target of the symlink
    target=$(readlink "$symlink")
    
    # Check if target exists
    if [ ! -e "$target" ]; then
        echo "  ⚠️  Broken symlink: $symlink -> $target"
        
        # Extract package name from the symlink path
        package_name=$(basename "$symlink")
        
        # Try to find the package in .pnpm directory
        pnpm_package_path=$(find node_modules/.pnpm -maxdepth 2 -type d -name "node_modules" | while read nm; do
            if [ -d "$nm/$package_name" ]; then
                echo "$nm/$package_name"
                break
            fi
        done)
        
        if [ -n "$pnpm_package_path" ]; then
            echo "  ✅ Found package at: $pnpm_package_path"
            # Remove broken symlink
            rm "$symlink"
            # Copy actual files
            cp -r "$pnpm_package_path" "$(dirname "$symlink")/"
            echo "  ✅ Fixed: $package_name"
        fi
    fi
done

# Step 4: Ensure critical packages are real files
critical_packages=("mongoose" "mongodb" "bson" "kareem" "mquery" "mpath")

for pkg in "${critical_packages[@]}"; do
    if [ -L "node_modules/$pkg" ]; then
        echo "  ⚠️  $pkg is a symlink, fixing..."
        
        # Find the real package in .pnpm
        pkg_path=$(find node_modules/.pnpm -path "*/node_modules/$pkg" -type d | head -1)
        
        if [ -n "$pkg_path" ]; then
            rm -f "node_modules/$pkg"
            cp -r "$pkg_path" "node_modules/$pkg"
            echo "  ✅ Fixed $pkg"
        fi
    fi
done

# Step 5: Add Magic SDK if not present
if [ ! -d "node_modules/@magic-sdk/admin" ]; then
    echo "🔮 Adding Magic SDK..."
    
    # Try to find it in .pnpm first
    magic_path=$(find node_modules/.pnpm -path "*/node_modules/@magic-sdk/admin" -type d 2>/dev/null | head -1)
    
    if [ -n "$magic_path" ]; then
        echo "  ✅ Found Magic SDK in .pnpm, copying..."
        mkdir -p node_modules/@magic-sdk
        cp -r "$magic_path" node_modules/@magic-sdk/
    else
        echo "  ⚠️  Magic SDK not found in .pnpm, installing via npm..."
        # Install without modifying package.json
        npm install --no-save --no-package-lock @magic-sdk/admin
    fi
fi

# Step 6: Final verification
echo "🔍 Verifying critical packages..."

node -e "
const packages = ['mongoose', 'mongodb', 'bson', '@magic-sdk/admin'];
let allGood = true;
packages.forEach(pkg => {
  try {
    const path = require.resolve(pkg);
    const isSymlink = require('fs').lstatSync(path).isSymbolicLink();
    console.log('  ' + (isSymlink ? '⚠️' : '✅') + ' ' + pkg + (isSymlink ? ' (SYMLINK)' : ''));
    if (isSymlink) allGood = false;
  } catch (e) {
    console.log('  ❌ ' + pkg + ': MISSING');
    allGood = false;
  }
});
if (!allGood) {
  console.log('⚠️ Some packages are still symlinks or missing');
  process.exit(1);
}
"

# Step 7: Go back to root
cd ../../../..

echo "✅ Post-build fixes complete!"