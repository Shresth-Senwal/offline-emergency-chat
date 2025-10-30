#!/usr/bin/env node

/**
 * Comprehensive patch script to fix React Native library build issues
 * - Fixes react-native-camera's deprecated jcenter() usage
 * - Fixes react-native-libsodium's missing compileSdk and ndkVersion issues
 * - Fixes react-native-ble-plx's jcenter() usage
 */

const fs = require('fs');
const path = require('path');

function patchFile(filePath, patches, libraryName) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${libraryName} build.gradle not found, skipping`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let patchCount = 0;

  patches.forEach(({ pattern, replacement, description }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      patchCount++;
      console.log(`  ✓ ${description}`);
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Patched ${libraryName} (${patchCount} changes)\n`);
    return true;
  } else {
    console.log(`ℹ️  ${libraryName} already patched or no changes needed\n`);
    return false;
  }
}

// Patch react-native-camera
console.log('Patching react-native-camera...');
patchFile(
  path.join(__dirname, '..', 'node_modules', 'react-native-camera', 'android', 'build.gradle'),
  [
    {
      pattern: /jcenter\(\)/g,
      replacement: 'mavenCentral()',
      description: 'Replace jcenter() with mavenCentral()'
    }
  ],
  'react-native-camera'
);

// Patch react-native-libsodium
console.log('Patching react-native-libsodium...');
const libsodiumPath = path.join(__dirname, '..', 'node_modules', 'react-native-libsodium', 'android', 'build.gradle');
if (fs.existsSync(libsodiumPath)) {
  let content = fs.readFileSync(libsodiumPath, 'utf8');
  const originalContent = content;

  // Fix 1: Replace jcenter() with mavenCentral()
  content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

  // Fix 2: Add compileSdk if missing
  if (!content.includes('compileSdk')) {
    content = content.replace(
      /android\s*\{/,
      `android {
    compileSdk rootProject.ext.compileSdkVersion`
    );
    console.log('  ✓ Added compileSdk');
  }

  // Fix 3: Fix ndkVersion - remove or set properly
  if (content.includes('ndkVersion = null')) {
    content = content.replace(/ndkVersion\s*=\s*null/, 'ndkVersion "27.0.12077973"');
    console.log('  ✓ Fixed ndkVersion');
  } else if (content.match(/ndkVersion\s*=\s*[^"]/)) {
    content = content.replace(/ndkVersion\s*=\s*([^"\n]+)/, 'ndkVersion "27.0.12077973"');
    console.log('  ✓ Fixed ndkVersion format');
  }

  if (content !== originalContent) {
    fs.writeFileSync(libsodiumPath, content, 'utf8');
    console.log('✅ Patched react-native-libsodium\n');
  } else {
    console.log('ℹ️  react-native-libsodium already patched\n');
  }
} else {
  console.log('⚠️  react-native-libsodium build.gradle not found\n');
}

// Patch react-native-ble-plx
console.log('Patching react-native-ble-plx...');
patchFile(
  path.join(__dirname, '..', 'node_modules', 'react-native-ble-plx', 'android', 'build.gradle'),
  [
    {
      pattern: /jcenter\(\)/g,
      replacement: 'mavenCentral()',
      description: 'Replace jcenter() with mavenCentral()'
    }
  ],
  'react-native-ble-plx'
);

console.log('🎉 All patches applied successfully!');
