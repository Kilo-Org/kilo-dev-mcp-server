import { jest, describe, it, expect } from "@jest/globals";
import { detectIndentation } from "../../utils/json-utils.js";
import { formatJsonWithIndentation } from "../../utils/i18n-utils.js";

describe("JSON Formatting Utilities", () => {
  describe("detectIndentation", () => {
    it("should detect tab indentation", () => {
      const content = `{
\t"key1": "value1",
\t"key2": "value2"
}`;
      const indent = detectIndentation(content);
      expect(indent.char).toBe("\t");
      expect(indent.size).toBe(1);
    });

    it("should detect 2-space indentation", () => {
      const content = `{
  "key1": "value1",
  "key2": "value2"
}`;
      const indent = detectIndentation(content);
      expect(indent.char).toBe(" ");
      expect(indent.size).toBe(2);
    });

    it("should detect 4-space indentation", () => {
      const content = `{
    "key1": "value1",
    "key2": "value2"
}`;
      const indent = detectIndentation(content);
      expect(indent.char).toBe(" ");
      expect(indent.size).toBe(4);
    });

    it("should handle mixed indentation and use the most common", () => {
      const content = `{
    "key1": "value1",
  "key2": "value2",
    "key3": "value3",
    "key4": "value4"
}`;
      const indent = detectIndentation(content);
      expect(indent.char).toBe(" ");
      expect(indent.size).toBe(4); // 4 spaces is more common
    });

    it("should handle empty content", () => {
      const content = "";
      const indent = detectIndentation(content);
      expect(indent.char).toBe(" "); // Default
      expect(indent.size).toBe(2); // Default
    });
  });

  describe("formatJsonWithIndentation", () => {
    it("should preserve tab indentation", () => {
      const originalContent = `{
\t"key1": "value1",
\t"key2": "value2"
}`;
      const json = { key1: "value1", key2: "value2", key3: "value3" };
      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that tabs are used for indentation
      expect(formatted).toContain('\t"key1"');
      expect(formatted).toContain('\t"key2"');
      expect(formatted).toContain('\t"key3"');
      expect(formatted).not.toContain('  "key'); // No 2-space indentation
    });

    it("should preserve 2-space indentation", () => {
      const originalContent = `{
  "key1": "value1",
  "key2": "value2"
}`;
      const json = { key1: "value1", key2: "value2", key3: "value3" };
      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that 2 spaces are used for indentation
      expect(formatted).toContain('  "key1"');
      expect(formatted).toContain('  "key2"');
      expect(formatted).toContain('  "key3"');
      expect(formatted).not.toContain('\t"key'); // No tab indentation
    });

    it("should preserve 4-space indentation", () => {
      const originalContent = `{
    "key1": "value1",
    "key2": "value2"
}`;
      const json = { key1: "value1", key2: "value2", key3: "value3" };
      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that 4 spaces are used for indentation
      expect(formatted).toContain('    "key1"');
      expect(formatted).toContain('    "key2"');
      expect(formatted).toContain('    "key3"');
      expect(formatted).not.toContain('\t"key'); // No tab indentation
    });

    it("should handle nested objects with tab indentation", () => {
      const originalContent = `{
\t"key1": "value1",
\t"nested": {
\t\t"nestedKey1": "nestedValue1",
\t\t"nestedKey2": "nestedValue2"
\t}
}`;
      const json = {
        key1: "value1",
        nested: {
          nestedKey1: "nestedValue1",
          nestedKey2: "nestedValue2",
          nestedKey3: "nestedValue3", // Added key
        },
        key2: "value2", // Added key
      };

      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that tabs are used for indentation at all levels
      expect(formatted).toContain('\t"key1"');
      expect(formatted).toContain('\t"nested"');
      expect(formatted).toContain('\t\t"nestedKey1"');
      expect(formatted).toContain('\t\t"nestedKey2"');
      expect(formatted).toContain('\t\t"nestedKey3"'); // New key should have tab indentation
      expect(formatted).toContain('\t"key2"'); // New key should have tab indentation
      expect(formatted).not.toContain('  "'); // No space indentation
    });

    it("should handle nested objects with space indentation", () => {
      const originalContent = `{
  "key1": "value1",
  "nested": {
    "nestedKey1": "nestedValue1",
    "nestedKey2": "nestedValue2"
  }
}`;
      const json = {
        key1: "value1",
        nested: {
          nestedKey1: "nestedValue1",
          nestedKey2: "nestedValue2",
          nestedKey3: "nestedValue3", // Added key
        },
        key2: "value2", // Added key
      };

      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that spaces are used for indentation at all levels
      expect(formatted).toContain('  "key1"');
      expect(formatted).toContain('  "nested"');
      expect(formatted).toContain('    "nestedKey1"');
      expect(formatted).toContain('    "nestedKey2"');
      expect(formatted).toContain('    "nestedKey3"'); // New key should have space indentation
      expect(formatted).toContain('  "key2"'); // New key should have space indentation
      expect(formatted).not.toContain('\t"'); // No tab indentation
    });

    it("should handle arrays with proper indentation", () => {
      const originalContent = `{
\t"key1": "value1",
\t"array": [
\t\t"item1",
\t\t"item2"
\t]
}`;
      const json = {
        key1: "value1",
        array: ["item1", "item2", "item3"], // Added item
      };

      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that tabs are used for indentation in arrays
      expect(formatted).toContain('\t"array": [');
      expect(formatted).toContain('\t\t"item1"');
      expect(formatted).toContain('\t\t"item2"');
      expect(formatted).toContain('\t\t"item3"'); // New item should have tab indentation
      expect(formatted).toContain("\t]");
    });

    it("should handle empty objects and arrays", () => {
      const originalContent = `{
\t"emptyObject": {},
\t"emptyArray": []
}`;
      const json = {
        emptyObject: {},
        emptyArray: [],
        newEmptyObject: {},
        newEmptyArray: [],
      };

      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that empty objects and arrays are formatted correctly
      expect(formatted).toContain('\t"emptyObject": {}');
      expect(formatted).toContain('\t"emptyArray": []');
      expect(formatted).toContain('\t"newEmptyObject": {}');
      expect(formatted).toContain('\t"newEmptyArray": []');
    });

    it("should handle special characters in keys and values", () => {
      const originalContent = `{
\t"key-with-dash": "value",
\t"key_with_underscore": "value",
\t"key.with.dots": "value",
\t"keyWithQuotes": "value with \"quotes\""
}`;
      const json = {
        "key-with-dash": "value",
        key_with_underscore: "value",
        "key.with.dots": "value",
        keyWithQuotes: 'value with "quotes"',
        "new-key-with-special-chars": 'new value with "quotes" and \\',
      };

      const formatted = formatJsonWithIndentation(json, originalContent);

      // Check that special characters are handled correctly
      expect(formatted).toContain('\t"key-with-dash"');
      expect(formatted).toContain('\t"key_with_underscore"');
      expect(formatted).toContain('\t"key.with.dots"');
      expect(formatted).toContain(
        '\t"keyWithQuotes": "value with \\"quotes\\""'
      );
      expect(formatted).toContain('\t"new-key-with-special-chars"');
    });
  });
});
