module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
