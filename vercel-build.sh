#!/bin/bash
# vercel-build.sh

echo "🔧 Building project..."
npm run build

echo "🔮 Adding Magic SDK to function..."
cd .vercel/output/functions/__fallback.func
npm install @magic-sdk/admin --no-save

echo "✅ Build complete!"
