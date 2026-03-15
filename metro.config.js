const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for JSON files in exercises and ONNX models
config.resolver.assetExts.push('json', 'onnx');

// Block directories and Node.js-only packages from the Metro module graph:
// 1. firebase/ (local Cloud Functions dir) conflicts with the firebase npm package
// 2. firebase-admin is Node.js-only (has "main": "lib/index.js" that Metro can't resolve)
// 3. scripts/ contains Node.js CLI scripts not meant for the RN bundle
const defaultBlockList = config.resolver.blockList;
const extraBlockList = [
  new RegExp(path.resolve(__dirname, 'firebase') + '/.*'),
  new RegExp(path.resolve(__dirname, 'scripts') + '/.*'),
  /node_modules\/firebase-admin\/.*/,
];

// Merge: default blockList can be a single RegExp or an array
config.resolver.blockList = Array.isArray(defaultBlockList)
  ? [...defaultBlockList, ...extraBlockList]
  : defaultBlockList
    ? [defaultBlockList, ...extraBlockList]
    : extraBlockList;

// Explicitly resolve 'firebase' to node_modules (not local firebase/ dir)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  firebase: path.resolve(__dirname, 'node_modules/firebase'),
};

module.exports = config;
