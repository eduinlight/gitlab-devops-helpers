#!/usr/bin/env bun

import { config } from "dotenv";
import { z } from "zod";
config();

const envSchema = z.object({
	GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
	GITLAB_PROJECT_ID: z.string().min(1, "GITLAB_PROJECT_ID is required"),
	GITLAB_API_URL: z.url("GITLAB_API_URL must be a valid URL"),
	GITLAB_ENVIRONMENT: z.string().min(1, "GITLAB_ENVIRONMENT is required"),
});

const env = envSchema.parse(process.env);
const { GITLAB_TOKEN, GITLAB_PROJECT_ID, GITLAB_API_URL, GITLAB_ENVIRONMENT } =
	env;

// Function to fetch all variables for the environment with pagination support
async function fetchEnvironmentVariables(): Promise<any[]> {
	console.log(`Fetching variables for environment: ${GITLAB_ENVIRONMENT}...`);

	let page = 1;
	const perPage = 100; // Maximum allowed by GitLab API
	let allVariables: any[] = [];
	let hasMorePages = true;

	try {
		while (hasMorePages) {
			console.log(`Fetching page ${page}...`);
			const response = await fetch(
				`${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/variables?scope=environment&environment_scope=${GITLAB_ENVIRONMENT}&page=${page}&per_page=${perPage}`,
				{
					method: "GET",
					headers: {
						"PRIVATE-TOKEN": GITLAB_TOKEN,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Failed to fetch variables: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			const variables = await response.json();
			allVariables = [...allVariables, ...variables];

			// Check if there are more pages
			const totalPages = parseInt(response.headers.get("x-total-pages") || "1");
			hasMorePages = page < totalPages;
			page++;
		}

		console.log(
			`Found ${allVariables.length} variables in environment: ${GITLAB_ENVIRONMENT}`,
		);
		return allVariables;
	} catch (error) {
		console.error(`Error fetching variables:`, error);
		throw error;
	}
}

// Function to delete a single variable
async function deleteVariable(key: string): Promise<void> {
	console.log(`Deleting variable: ${key}...`);

	try {
		const response = await fetch(
			`${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/variables/${encodeURIComponent(key)}`,
			{
				method: "DELETE",
				headers: {
					"PRIVATE-TOKEN": GITLAB_TOKEN,
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to delete variable ${key}: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		console.log(`✅ Successfully deleted variable: ${key}`);
	} catch (error) {
		console.error(`❌ Error deleting variable ${key}:`, error);
		throw error;
	}
}

// Main function to remove all environment variables
async function removeAllEnvironmentVariables() {
	console.log(
		`Starting removal of all variables for environment: ${GITLAB_ENVIRONMENT}`,
	);

	try {
		// Fetch all variables
		const variables = await fetchEnvironmentVariables();

		if (variables.length === 0) {
			console.log(`No variables found for environment: ${GITLAB_ENVIRONMENT}`);
			return;
		}

		console.log(`Preparing to delete ${variables.length} variables...`);

		// Delete variables one by one
		const results = await Promise.allSettled(
			variables.map((variable) => deleteVariable(variable.key)),
		);

		// Count successes and failures
		const successes = results.filter(
			(result) => result.status === "fulfilled",
		).length;
		const failures = results.filter(
			(result) => result.status === "rejected",
		).length;

		console.log(`\n--- Summary ---`);
		console.log(`Total variables processed: ${variables.length}`);
		console.log(`Successfully deleted: ${successes}`);
		console.log(`Failed to delete: ${failures}`);

		if (failures > 0) {
			console.error(
				`Some variables could not be deleted. Check the logs above for details.`,
			);
			process.exit(1);
		} else {
			console.log(
				`All variables successfully removed from environment: ${GITLAB_ENVIRONMENT}`,
			);
		}
	} catch (error) {
		console.error(`Fatal error:`, error);
		process.exit(1);
	}
}

// Run the script
removeAllEnvironmentVariables();
