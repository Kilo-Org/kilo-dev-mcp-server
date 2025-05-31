/**
 * Jest configuration for the repo-mcp-server
 *
 * Note: This configuration is not yet working with ESM modules.
 * TODO: Fix ESM compatibility issues with the test setup
 */

export default {
	preset: "ts-jest",
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
}
