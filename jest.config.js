/**
 * Jest configuration for the kilo-dev-mcp-server
 *
 * This configuration is set up for TypeScript tests with ESM modules.
 */

export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts", ".tsx"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	transformIgnorePatterns: [
		// Transform ESM modules in node_modules when needed
		"node_modules/(?!(p-limit|yocto-queue)/)",
	],
	testMatch: ["**/__tests__/**/*.test.ts"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
}
