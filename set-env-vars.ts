#!/usr/bin/env bun

import { readFileSync, existsSync } from "fs";
import { config } from "dotenv";
import { z } from "zod";
config({ override: true });

/**
 * Script to load environment variables from a JSON file
 * and set them as CI/CD variables in a GitLab project
 */

const envSchema = z.object({
	ENV_FILE_PATH: z.string().min(1, "ENV_FILE_PATH is required"),
	GITLAB_ENVIRONMENT: z.string().min(1, "GITLAB_ENVIRONMENT is required"),
	GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
	GITLAB_PROJECT_ID: z.string().min(1, "GITLAB_PROJECT_ID is required"),
	GITLAB_API_URL: z.url("GITLAB_API_URL must be a valid URL"),
});

const env = envSchema.parse(process.env);
const {
	ENV_FILE_PATH,
	GITLAB_ENVIRONMENT,
	GITLAB_TOKEN,
	GITLAB_PROJECT_ID,
	GITLAB_API_URL,
} = env;

if (!existsSync(ENV_FILE_PATH)) {
	console.error(`Error: File not found: ${ENV_FILE_PATH}`);
	process.exit(1);
}

/**
 * Creates or updates a CI/CD variable in GitLab project
 */
async function setGitLabVariable(key: string, value: string): Promise<void> {
	const url = `${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/variables`;

	try {
		// First try to update the variable (PUT request)
		const updateResponse = await fetch(
			`${url}/${encodeURIComponent(key)}?filter[environment_scope]=${encodeURIComponent(GITLAB_ENVIRONMENT)}`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"PRIVATE-TOKEN": GITLAB_TOKEN,
				},
				body: JSON.stringify({
					value,
					protected: false,
					masked: false,
					environment_scope: GITLAB_ENVIRONMENT,
				}),
			},
		);

		// If variable doesn't exist (404), create it (POST request)
		if (updateResponse.status === 404) {
			const createResponse = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"PRIVATE-TOKEN": GITLAB_TOKEN,
				},
				body: JSON.stringify({
					key,
					value,
					protected: false,
					masked: false,
					environment_scope: GITLAB_ENVIRONMENT,
				}),
			});

			if (!createResponse.ok) {
				const errorData = await createResponse.json();
				throw new Error(
					`Failed to create variable ${key}: ${JSON.stringify(errorData)}`,
				);
			}

			console.log(`Created GitLab CI/CD variable: ${key}`);
		} else if (!updateResponse.ok) {
			const errorData = await updateResponse.json();
			throw new Error(
				`Failed to update variable ${key}: ${JSON.stringify(errorData)}`,
			);
		} else {
			console.log(`Updated GitLab CI/CD variable: ${key}`);
		}
	} catch (error) {
		console.error(`Error setting GitLab variable ${key}: ${error.message}`);
		throw error;
	}
}

async function main() {
	try {
		// Read and parse the JSON file
		const envFileContent = readFileSync(ENV_FILE_PATH, "utf-8");
		const envVariables = JSON.parse(envFileContent);

		// Validate that the content is an object
		if (typeof envVariables !== "object" || envVariables === null) {
			console.error("Error: Environment file must contain a JSON object");
			process.exit(1);
		}

		console.log(
			`Setting GitLab CI/CD variables for project ID: ${GITLAB_PROJECT_ID}`,
		);

		// Set each key-value pair as a GitLab CI/CD variable
		let count = 0;
		const promises = [];

		for (const [key, value] of Object.entries(envVariables)) {
			if (
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
			) {
				promises.push(
					setGitLabVariable(key, String(value))
						.then(() => {
							count++;
						})
						.catch((error) => {
							console.error(`Failed to set variable ${key}: ${error.message}`);
						}),
				);
			} else {
				console.warn(`Warning: Skipping non-primitive value for key: ${key}`);
			}
		}

		await Promise.all(promises);
		console.log(
			`Successfully set ${count} GitLab CI/CD variables from ${ENV_FILE_PATH}`,
		);
	} catch (error) {
		console.error(`Error processing environment file: ${error.message}`);
		process.exit(1);
	}
}

main();
