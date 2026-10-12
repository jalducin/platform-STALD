// Análisis de calidad reproducible (openspec: calidad-sonar).
// Solo activa las reglas equivalentes a las que SonarQube for IDE (SonarLint) marcó en VS Code, con la misma clave
// de Sonar al lado. Lo corre `node calidad.mjs` (npm run calidad) desde tests/calidad; la raíz es el repo.
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import html from 'eslint-plugin-html';
import tseslint from 'typescript-eslint';

// Reglas JS/TS → clave de Sonar. calidad.mjs usa este mapa para contar por regla de Sonar.
export const CLAVES = {
  'sonarjs/no-nested-conditional': 'S3358',
  'sonarjs/cognitive-complexity': 'S3776',
  'sonarjs/no-unenclosed-multiline-block': 'S2681',
  'sonarjs/pseudo-random': 'S2245',
  'prefer-object-spread': 'S6661',
  'unicorn/new-for-builtins': 'S7723',
  'sonarjs/no-ignored-exceptions': 'S2486',
  'unicorn/prefer-math-trunc': 'S7767',
  'unicorn/prefer-string-replace-all': 'S7781',
  'sonarjs/void-use': 'S3735',
  'unicorn/prefer-structured-clone': 'S7784',
  'sonarjs/todo-tag': 'S1135',
  'sonarjs/no-all-duplicated-branches': 'S3923',
  'sonarjs/no-dead-store': 'S1854',
  'default-param-last': 'S1788',
  'unicorn/prefer-number-properties': 'S7773',
  'prefer-object-has-own': 'S6653',
  'no-await-in-loop': 'S9382',
};

const reglas = Object.fromEntries(Object.keys(CLAVES).map((r) => [r, 'warn']));
// Mismo umbral que Sonar (15).
reglas['sonarjs/cognitive-complexity'] = ['warn', 15];
// Sonar solo marca los globales que tienen equivalente en Number (parseInt, parseFloat, isNaN, isFinite); no NaN ni
// Infinity.
reglas['unicorn/prefer-number-properties'] = ['warn', { checkInfinity: false, checkNaN: false }];

const plugins = { sonarjs, unicorn };
const navegador = { ...globals.browser };

export default [
  {
    ignores: [
      '**/node_modules/**', '.claude/**', '.worktrees/**', 'supabase/**', 'tests/**', 'openspec/**',
      'ai-specs/**', 'herramientas/**', 'juegos/datos/**',
    ],
  },
  {
    files: ['juegos/**/*.js', 'ingles/**/*.js', 'comun/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: navegador },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins,
    rules: reglas,
  },
  {
    files: ['*.html', 'juegos/*.html'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: navegador },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { ...plugins, html },
    rules: reglas,
  },
  {
    files: ['server/**/*.ts'],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module', globals: { Deno: 'readonly' } },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins,
    rules: reglas,
  },
];
