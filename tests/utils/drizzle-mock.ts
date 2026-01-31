// Mock drizzle-orm before any test files load
jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    sql: jest.fn((template, ...values) => ({
      sql: template,
      values,
      toString: () => template,
    })),
  };
});
