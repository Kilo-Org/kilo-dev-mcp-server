import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import fs from "node:fs/promises";
import path from "node:path";
import { detectIndentation } from "../../../utils/json-utils.js";
import { reorderJsonToMatchSource } from "../../../utils/order-utils.js";
import {
  writeJsonFile,
  readJsonFile,
  formatJsonWithIndentation,
} from "../../../utils/i18n-utils.js";

// Mock fs modules
jest.mock("node:fs/promises");
jest.mock("node:fs", () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
  };
});

describe("i18n JSON Formatting and Ordering", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("JSON Formatting", () => {
    it("should preserve tab indentation when formatting JSON", async () => {
      // Original JSON with tab indentation
      const originalContent = `{
\t"key1": "value1",
\t"key2": "value2",
\t"key3": "value3"
}`;

      const json = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
        key4: "new value", // Added key
      };

      // Format JSON with original indentation
      const formattedJson = formatJsonWithIndentation(json, originalContent);

      // Verify tab indentation is preserved
      expect(formattedJson).toContain("\t");
      expect(formattedJson).not.toContain("  ");
      expect(formattedJson).toContain("key4");
    });

    it("should preserve space indentation when formatting JSON", async () => {
      // Original JSON with space indentation
      const originalContent = `{
    "key1": "value1",
    "key2": "value2",
    "key3": "value3"
}`;

      const json = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
        key4: "new value", // Added key
      };

      // Format JSON with original indentation
      const formattedJson = formatJsonWithIndentation(json, originalContent);

      // Verify space indentation is preserved
      expect(formattedJson).toContain("    ");
      expect(formattedJson).not.toContain("\t");
      expect(formattedJson).toContain("key4");
    });
  });

  describe("JSON Reordering", () => {
    it("should correctly reorder JSON based on source structure", () => {
      // Source JSON (English)
      const sourceJson = {
        greeting: "Hello",
        farewell: "Goodbye",
        welcome: "Welcome",
      };

      // Target JSON (another language)
      const targetJson = {
        welcome: "Bienvenue",
        greeting: "Bonjour",
        farewell: "Au revoir",
        extra: "Extra field",
      };

      // Reorder target to match source
      const reorderedJson = reorderJsonToMatchSource(targetJson, sourceJson);

      // Check the order of keys
      const reorderedKeys = Object.keys(reorderedJson);
      expect(reorderedKeys[0]).toBe("greeting");
      expect(reorderedKeys[1]).toBe("farewell");
      expect(reorderedKeys[2]).toBe("welcome");
      expect(reorderedKeys[3]).toBe("extra"); // Extra keys should be at the end

      // Ensure values are preserved
      expect(reorderedJson.greeting).toBe("Bonjour");
      expect(reorderedJson.farewell).toBe("Au revoir");
      expect(reorderedJson.welcome).toBe("Bienvenue");
      expect(reorderedJson.extra).toBe("Extra field");
    });
  });

  describe("File Operations", () => {
    it("should read and write JSON files preserving formatting", async () => {
      // Original content with specific formatting
      const originalContent = `{
    "key1": "value1",
    "key2": "value2"
}`;

      // Mock file read
      jest.spyOn(fs, "readFile").mockResolvedValue(originalContent);

      // Read the file
      const result = await readJsonFile("/mock/path/test.json");

      // Verify content and parsed JSON
      expect(result.content).toBe(originalContent);
      expect(result.json).toEqual({
        key1: "value1",
        key2: "value2",
      });

      // Modify the JSON
      const modifiedJson = {
        ...result.json,
        key3: "value3",
      };

      // Mock file write
      const writeFileSpy = jest
        .spyOn(fs, "writeFile")
        .mockResolvedValue(undefined);

      // Write the modified JSON
      await writeJsonFile("/mock/path/test.json", modifiedJson, result.content);

      // Verify writeFile was called with formatted content
      expect(writeFileSpy).toHaveBeenCalled();

      // Get the content that was written
      const writtenContent = writeFileSpy.mock.calls[0][1];

      // Verify the content maintains the original formatting
      expect(writtenContent).toContain("    ");
      expect(writtenContent).toContain("key3");
    });
  });
});
