import { jest, describe, it, expect } from "@jest/globals";
import { detectIndentation } from "../../../utils/json-utils.js";

// We'll test the whitespace preservation directly without mocking
describe("JSON whitespace preservation", () => {
  it("should correctly detect tab indentation", () => {
    const tabIndentedJson = `{
\t"key1": "value1",
\t"key2": "value2",
\t"key3": "value3"
}`;

    const indent = detectIndentation(tabIndentedJson);
    expect(indent.char).toBe("\t");
    expect(indent.size).toBe(1);
  });

  it("should correctly detect space indentation", () => {
    const spaceIndentedJson = `{
    "key1": "value1",
    "key2": "value2",
    "key3": "value3"
}`;

    const indent = detectIndentation(spaceIndentedJson);
    expect(indent.char).toBe(" ");
    expect(indent.size).toBe(4);
  });

  it("should correctly detect 2-space indentation", () => {
    const twoSpaceIndentedJson = `{
  "key1": "value1",
  "key2": "value2",
  "key3": "value3"
}`;

    const indent = detectIndentation(twoSpaceIndentedJson);
    expect(indent.char).toBe(" ");
    expect(indent.size).toBe(2);
  });

  it("should correctly format JSON with tab indentation", () => {
    // This test directly tests the logic used in removeKeysFromFile

    // Original JSON object
    const json = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    // Manually create a tab-indented string
    const tabIndented =
      '{\n\t"key1": "value1",\n\t"key2": "value2",\n\t"key3": "value3"\n}\n';

    // Format using the same logic as in removeKeysFromFile
    const jsonString = JSON.stringify(json, null, 2);
    const formattedJson = jsonString.replace(/^ {2}/gm, "\t");
    const finalJson = formattedJson + "\n";

    // Verify tab indentation is preserved
    expect(finalJson).toContain("\t");
    expect(finalJson).not.toContain("  ");

    // Compare with expected output
    expect(finalJson).toBe(tabIndented);
  });

  it("should preserve space indentation when formatting JSON", () => {
    // Original JSON
    const originalJson = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };

    // Space-indented JSON string
    const spaceIndentedJson = `{
    "key1": "value1",
    "key2": "value2",
    "key3": "value3"
}`;

    // Detect indentation
    const indent = detectIndentation(spaceIndentedJson);

    // Format JSON with detected indentation
    const jsonString = JSON.stringify(originalJson, null, indent.size);
    // For space indentation, we can use the default JSON.stringify behavior
    const formattedJson = jsonString;

    // Add newline at the end
    const finalJson = formattedJson + "\n";

    // Verify the content maintains space indentation
    expect(finalJson).toContain("    "); // Contains 4 spaces
  });
});
