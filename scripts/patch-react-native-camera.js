#!/usr/bin/env node

/**
 * Patch script to fix react-native-camera's deprecated jcenter() usage
 * This replaces jcenter() with mavenCentral() in the library's build.gradle
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-camera',
  'android',
  'build.gradle'
);

if (!fs.existsSync(buildGradlePath)) {
  console.log('react-native-camera build.gradle not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');

// Replace jcenter() with mavenCentral()
const originalContent = content;
content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

if (content !== originalContent) {
  fs.writeFileSync(buildGradlePath, content, 'utf8');
  console.log('✅ Patched react-native-camera build.gradle: jcenter() → mavenCentral()');
} else {
  console.log('ℹ️  react-native-camera build.gradle already patched or no jcenter() found');
}
