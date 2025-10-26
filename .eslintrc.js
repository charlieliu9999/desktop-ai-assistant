module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'build',
    'out',
    'node_modules',
    'bisheng-integration/**',
    'demo_RIS/**',
    'demo.1/**',
    'glass-test-app/**',
    'docs/**',
    'src/renderer/pages/SettingsWindow.tsx',
    'tests/**',
    'vite.dev-only.config.ts',
    '*.js',
    '!.eslintrc.js',
    '!tailwind.config.js',
    '!postcss.config.js',
    '!vite.config.ts',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    'no-constant-condition': 'off',
    'no-useless-escape': 'off',
    'no-prototype-builtins': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'react/no-unknown-property': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-empty': 'off',
    'no-case-declarations': 'off',
    '@typescript-eslint/no-unused-vars': [
      'off',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-react': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-console': 'off',

    // ========== 样式规范 ==========
    // 警告: 禁止在className中使用废弃的dark:glass-dark类
    // 注意: 这是一个简单的字符串检查,可能有误报
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'Literal[value=/dark:glass-dark/]',
        message: '禁止使用废弃的 dark:glass-dark 类,请使用 .glass 类代替',
      },
      {
        selector: 'TemplateLiteral[quasis.0.value.raw=/dark:glass-dark/]',
        message: '禁止使用废弃的 dark:glass-dark 类,请使用 .glass 类代替',
      },
    ],
  },
  overrides: [
    {
      files: ['src/main/**/*.ts'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        'no-console': 'off', // Allow console in main process
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['src/renderer/**/*.{ts,tsx}'],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        'no-console': 'off', // Warn about console in renderer
      },
    },
    {
      files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['*.config.{js,ts}', '.eslintrc.js'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
  ],
};
