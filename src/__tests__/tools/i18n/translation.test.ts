import { jest, describe, it, expect } from "@jest/globals";
import { translateI18nText } from "../../../tools/i18n/translation.js";

// Simple test that doesn't require mocking
describe("Translation Utilities", () => {
  describe("translateI18nText", () => {
    it("should return the original text if it's empty", async () => {
      const emptyText = "   ";
      const result = await translateI18nText(emptyText, "fr", "fake-api-key");
      expect(result).toBe(emptyText);
    });

    it("should throw an error if no API key is provided", async () => {
      await expect(translateI18nText("Hello world", "fr", "")).rejects.toThrow(
        "OpenRouter API key is required for translations"
      );
    });
  });
});
