// A simple TypeScript test file to check if Jest is working with TypeScript
import { test, expect } from "@jest/globals";

test("simple TypeScript test", () => {
  const sum = (a: number, b: number): number => a + b;
  expect(sum(1, 1)).toBe(2);
});
