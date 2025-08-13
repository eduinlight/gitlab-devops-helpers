#!/usr/bin/env bun
import { config } from "dotenv";
import { z } from "zod";
config({ override: true });

/**
 * Script to remove all pipelines from a GitLab project
 * This script will delete all pipelines for the specified project
 */

const envSchema = z.object({
	GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
	GITLAB_PROJECT_ID: z.string().min(1, "GITLAB_PROJECT_ID is required"),
	GITLAB_API_URL: z.url("GITLAB_API_URL must be a valid URL"),
	BATCH_SIZE: z
		.string()
		.transform((val) => parseInt(val))
		.pipe(z.number().min(1).max(100))
		.default(20),
	DELAY_MS: z
		.string()
		.transform((val) => parseInt(val))
		.pipe(z.number().min(0))
		.default(1000),
});

const env = envSchema.parse(process.env);
const {
	GITLAB_TOKEN,
	GITLAB_PROJECT_ID,
	GITLAB_API_URL,
	BATCH_SIZE,
	DELAY_MS,
} = env;

/**
 * Fetches a page of pipelines from the GitLab API
 */
async function fetchPipelines(page: number): Promise<any[]> {
	const url = `${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/pipelines?per_page=${BATCH_SIZE}&page=${page}`;

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"PRIVATE-TOKEN": GITLAB_TOKEN,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`Failed to fetch pipelines: ${JSON.stringify(errorData)}`,
			);
		}

		return await response.json();
	} catch (error) {
		console.error(`Error fetching pipelines: ${error.message}`);
		throw error;
	}
}

/**
 * Deletes a pipeline by ID
 */
async function deletePipeline(pipelineId: number): Promise<void> {
	const url = `${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/pipelines/${pipelineId}`;

	try {
		const response = await fetch(url, {
			method: "DELETE",
			headers: {
				"PRIVATE-TOKEN": GITLAB_TOKEN,
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`Failed to delete pipeline ${pipelineId}: ${JSON.stringify(errorData)}`,
			);
		}

		console.log(`Deleted pipeline: ${pipelineId}`);
	} catch (error) {
		console.error(`Error deleting pipeline ${pipelineId}: ${error.message}`);
		throw error;
	}
}

/**
 * Sleep function to add delay between requests
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	try {
		console.log(
			`Removing all pipelines for GitLab project ID: ${GITLAB_PROJECT_ID}`,
		);

		let page = 1;
		let totalDeleted = 0;
		let pipelines: any[] = [];

		do {
			console.log(`Fetching page ${page} of pipelines...`);
			pipelines = await fetchPipelines(page);

			if (pipelines.length === 0) {
				console.log("No more pipelines found.");
				break;
			}

			console.log(`Found ${pipelines.length} pipelines on page ${page}.`);

			// Delete each pipeline with a delay between requests
			for (const pipeline of pipelines) {
				await deletePipeline(pipeline.id);
				totalDeleted++;
				await sleep(DELAY_MS);
			}

			page++;
		} while (pipelines.length > 0);

		console.log(
			`Successfully deleted ${totalDeleted} pipelines from project ID: ${GITLAB_PROJECT_ID}`,
		);
	} catch (error) {
		console.error(`Error removing pipelines: ${error.message}`);
		process.exit(1);
	}
}

// Ask for confirmation before proceeding
console.log(
	`WARNING: This will delete ALL pipelines for GitLab project ID: ${GITLAB_PROJECT_ID}`,
);
console.log("Press Ctrl+C to cancel or wait 5 seconds to continue...");

// Wait 5 seconds before starting
setTimeout(() => {
	main();
}, 5000);
