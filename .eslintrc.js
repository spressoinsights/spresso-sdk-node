module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.base.json'],
        //project: ['./packages/auth/tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'functional', 'mocha', 'import', 'chai-friendly'],
    rules: {
        'functional/no-loop-statement': 'warn',
        'functional/immutable-data': 'warn',
        'functional/no-let': 'warn',
        'functional/prefer-readonly-type': 'off',
        'functional/no-method-signature': 'off',
        '@typescript-eslint/prefer-readonly': 'warn',
        '@typescript-eslint/class-literal-property-style': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/method-signature-style': 'off',
        '@typescript-eslint/prefer-enum-initializers': 'error',
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',
        '@typescript-eslint/no-confusing-void-expression': 'error',
        '@typescript-eslint/no-dynamic-delete': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        'prefer-arrow-callback': 'warn',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/prefer-reduce-type-parameter': 'error',
        '@typescript-eslint/prefer-return-this-type': 'warn',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/require-array-sort-compare': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-throw-literal': 'error',
        '@typescript-eslint/no-use-before-define': 'error',
        '@typescript-eslint/return-await': 'error',
        '@typescript-eslint/member-ordering': ['warn', { default: ['signature', 'field', 'constructor', 'method'] }],
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: ['classProperty', 'variable', 'function', 'method'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
            {
                selector: 'variable',
                modifiers: ['destructured'],
                format: null,
            },
            {
                selector: ['class', 'typeAlias'],
                format: ['PascalCase'],
            },
            {
                selector: ['interface'],
                format: ['PascalCase'],
                prefix: ['I'],
            },
            {
                selector: ['enum', 'enumMember'],
                format: ['UPPER_CASE'],
            },
        ],
        'mocha/no-mocha-arrows': 'off',
        'mocha/prefer-arrow-callback': 'warn',
        // Force capitalization for describe
        'mocha/valid-suite-description': ['warn', '^[A-Z]'],
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:functional/no-mutations',
        'prettier',
        'plugin:mocha/recommended',
        'plugin:chai-friendly/recommended',
    ],
    overrides: [
        {
            files: ['*.test.ts'], // Or *.test.js
            rules: {
                'functional/no-let': 'off',
                '@typescript-eslint/no-magic-numbers': 'off',
            },
        },
    ],
};
