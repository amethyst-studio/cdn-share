module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: {
      impliedStrict: true
    },
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'eslint-plugin-tsdoc',
    'typescript-sort-keys'
  ],
  extends: [
    'eslint:recommended',
    'standard-with-typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:typescript-sort-keys/recommended'
  ],
  ignorePatterns: [
    '/dist/',
    '/docs/',
    'ecosystem.config.js',
    'webpack.config.js'
  ],
  rules: {
    'tsdoc/syntax': 'warn',
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/ban-tslint-comment': 'error',
    '@typescript-eslint/class-literal-property-style': ['error', 'fields'],
    '@typescript-eslint/consistent-indexed-object-style': ['error', 'index-signature'],
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/member-delimiter-style': ['warn', { multiline: { delimiter: 'none', requireLast: false }, singleline: { delimiter: 'semi', requireLast: true } }],
    '@typescript-eslint/member-ordering': ['error', { default: { order: 'alphabetically', memberTypes: ['signature', 'public-static-field', 'protected-static-field', 'private-static-field', 'public-decorated-field', 'protected-decorated-field', 'private-decorated-field', 'public-instance-field', 'protected-instance-field', 'private-instance-field', 'public-abstract-field', 'protected-abstract-field', 'private-abstract-field', 'public-field', 'protected-field', 'private-field', 'static-field', 'instance-field', 'abstract-field', 'decorated-field', 'field', 'public-constructor', 'protected-constructor', 'private-constructor', 'constructor', 'public-static-method', 'protected-static-method', 'private-static-method', 'public-decorated-method', 'protected-decorated-method', 'private-decorated-method', 'public-instance-method', 'protected-instance-method', 'private-instance-method', 'public-abstract-method', 'protected-abstract-method', 'private-abstract-method', 'public-method', 'protected-method', 'private-method', 'static-method', 'instance-method', 'abstract-method', 'decorated-method', 'method'] } }],
    '@typescript-eslint/method-signature-style': ['warn', 'property'],
    '@typescript-eslint/no-base-to-string': 'warn',
    '@typescript-eslint/no-confusing-non-null-assertion': 'warn',
    '@typescript-eslint/no-confusing-void-expression': 'warn',
    '@typescript-eslint/no-dynamic-delete': 'warn',
    '@typescript-eslint/no-extraneous-class': 'warn',
    '@typescript-eslint/no-implicit-any-catch': 'warn',
    '@typescript-eslint/no-invalid-void-type': 'warn',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-unnecessary-qualifier': 'warn',
    '@typescript-eslint/no-unnecessary-type-arguments': 'warn',
    '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
    '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
    '@typescript-eslint/prefer-for-of': 'warn',
    '@typescript-eslint/prefer-includes': 'warn',
    '@typescript-eslint/prefer-literal-enum-member': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
    '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
    '@typescript-eslint/prefer-ts-expect-error': 'error',
    '@typescript-eslint/promise-function-async': 'error',
    '@typescript-eslint/require-array-sort-compare': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'warn',
    '@typescript-eslint/type-annotation-spacing': 'warn',
    '@typescript-eslint/typedef': 'warn',
    '@typescript-eslint/unified-signatures': 'warn'
  }
}
