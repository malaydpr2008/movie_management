#!/usr/bin/env node
/**
 * CineFlow Studio - Frontend Architecture Dependency Checker.
 *
 * Enforces Architectural Rules:
 * - Feature components (src/components/**) and pages (src/app/**) must NOT bypass the API layer.
 * - Prohibits raw `fetch()`, `window.fetch()`, `XMLHttpRequest`, and `axios` in components, pages, hooks, and stores.
 * - Only the centralized transport client (`src/lib/api/client.ts`) may perform raw HTTP network operations.
 * - All server communication must go through modular API clients (`src/lib/api/*`) or React Query hooks.
 *
 * Usage:
 *   node scripts/check-architecture.mjs
 *   node scripts/check-architecture.mjs --test-detector
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(FRONTEND_ROOT, 'src');

// Only central transport client is permitted to make direct HTTP requests
const ALLOWED_NETWORK_FILES = new Set([
  path.resolve(SRC_DIR, 'lib', 'api', 'client.ts'),
]);

// Directories subject to architectural enforcement
const ENFORCED_DIRECTORIES = ['components', 'app', 'hooks', 'stores'];

// Prohibited network invocation patterns
const PROHIBITED_PATTERNS = [
  {
    id: 'RAW_FETCH',
    label: 'Raw fetch() call',
    // Matches fetch(...) but avoids refetch, prefetch, apiFetch, or safeFetch
    regex: /(?<![a-zA-Z0-9_$.])fetch\s*\(/g,
  },
  {
    id: 'WINDOW_FETCH',
    label: 'window.fetch() call',
    regex: /window\.fetch\s*\(/g,
  },
  {
    id: 'XML_HTTP_REQUEST',
    label: 'XMLHttpRequest instantiation',
    regex: /new\s+XMLHttpRequest\s*\(/g,
  },
  {
    id: 'AXIOS',
    label: 'axios invocation or import',
    regex: /\baxios(\.|\s*\(|\s+from)/g,
  },
];

/**
 * Strips block and inline comments from source code to prevent false positives in comments.
 */
function stripComments(source) {
  // Strip block comments /* ... */
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Preserve line breaks so line numbers remain accurate
    return '\n'.repeat((match.match(/\n/g) || []).length);
  });
  return noBlock;
}

/**
 * Checks a single source file for architectural violations.
 */
export function checkFrontendFile(filePath, contentOverride = null) {
  const normalizedPath = path.resolve(filePath);
  if (ALLOWED_NETWORK_FILES.has(normalizedPath)) {
    return [];
  }

  const rawContent = contentOverride !== null ? contentOverride : fs.readFileSync(filePath, 'utf8');
  const cleanContent = stripComments(rawContent);
  const lines = cleanContent.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // Strip single line comments
    const strippedLine = line.replace(/\/\/.*$/, '');

    for (const pattern of PROHIBITED_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(strippedLine)) {
        violations.push({
          file: path.relative(FRONTEND_ROOT, filePath).replace(/\\/g, '/'),
          line: index + 1,
          rule: pattern.id,
          label: pattern.label,
          snippet: line.trim(),
        });
      }
    }
  });

  return violations;
}

/**
 * Recursively scans directory for TypeScript/JavaScript source files.
 */
function scanDirectory(dirPath, violationsList) {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath, violationsList);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const fileViolations = checkFrontendFile(fullPath);
      violationsList.push(...fileViolations);
    }
  }
}

/**
 * Self-test demonstrating detection of prohibited patterns on synthetic code snippets.
 */
function runDetectorSelfTest() {
  console.log('Running frontend detector self-test...');
  const syntheticCases = [
    { code: 'const res = await fetch("/api/v1/scenes");', expected: 'RAW_FETCH' },
    { code: 'const res = await window.fetch("/api/v1/scenes");', expected: 'WINDOW_FETCH' },
    { code: 'const xhr = new XMLHttpRequest();', expected: 'XML_HTTP_REQUEST' },
    { code: 'import axios from "axios"; axios.get("/api");', expected: 'AXIOS' },
  ];

  let passed = true;
  for (const tc of syntheticCases) {
    const violations = checkFrontendFile('src/components/studio/FakeComponent.tsx', tc.code);
    const caught = violations.some((v) => v.rule === tc.expected);
    if (!caught) {
      console.error(`❌ Self-test FAILED for snippet: "${tc.code}". Expected ${tc.expected}, got:`, violations);
      passed = false;
    }
  }

  // Also verify that legitimate patterns (refetch, prefetch, apiFetch) do NOT trigger false positives
  const legitimateCases = [
    'const { refetch } = useQuery(...); refetch();',
    'queryClient.prefetchQuery(...);',
    'import { apiFetch } from "@/lib/api/client"; const data = await apiFetch("/url");',
    'import { narrativeApi } from "@/lib/api/narrative"; narrativeApi.getScenes();',
  ];

  for (const code of legitimateCases) {
    const violations = checkFrontendFile('src/components/studio/LegitComponent.tsx', code);
    if (violations.length > 0) {
      console.error(`❌ False positive on legitimate code: "${code}":`, violations);
      passed = false;
    }
  }

  if (passed) {
    console.log('✅ Self-test PASSED: All prohibited patterns detected, legitimate patterns permitted.');
  }
  return passed ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test-detector')) {
    process.exit(runDetectorSelfTest());
  }

  console.log('='.repeat(70));
  console.log('CineFlow Studio - Frontend Architecture Dependency Checker');
  console.log('='.repeat(70));
  console.log(`Scanning frontend directories: ${ENFORCED_DIRECTORIES.join(', ')}`);
  console.log('Rule: Feature components must NOT bypass the API layer (no raw fetch/axios/XHR).');
  console.log('Allowed transport file: src/lib/api/client.ts');
  console.log('='.repeat(70));

  const allViolations = [];
  for (const dirName of ENFORCED_DIRECTORIES) {
    const targetDir = path.join(SRC_DIR, dirName);
    scanDirectory(targetDir, allViolations);
  }

  if (allViolations.length > 0) {
    console.error(`\n❌ FAILED: ${allViolations.length} architectural boundary violation(s) found:\n`);
    for (const v of allViolations) {
      console.error(`  • [${v.rule}] ${v.file}:${v.line} (${v.label})`);
      console.error(`    Snippet: ${v.snippet}\n`);
    }
    console.error('Action: Route network calls through modular API clients in @/lib/api or custom hooks.');
    console.error('See docs/architecture/DEPENDENCY_RULES.md for architectural details.\n');
    process.exit(1);
  }

  console.log('\n✅ PASSED: All UI components, pages, hooks, and stores use the API/query layer!');
  console.log('   • Raw fetch / XHR / Axios bypass: 0 violations found.');
  console.log('   • Centralized client in src/lib/api/client.ts correctly isolated.');
  console.log('='.repeat(70));
  process.exit(0);
}

main();
