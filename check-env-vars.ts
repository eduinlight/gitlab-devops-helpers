#!/usr/bin/env bun

import { readFileSync, existsSync } from "fs";
import { config } from "dotenv";
import { z } from "zod";
config({ override: true });

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

async function fetchGitLabVariables(): Promise<Record<string, string>> {
  const url = `${GITLAB_API_URL}/projects/${GITLAB_PROJECT_ID}/variables`;
  const variables: Record<string, string> = {};
  let page = 1;

  while (true) {
    const response = await fetch(`${url}?per_page=100&page=${page}`, {
      headers: { "PRIVATE-TOKEN": GITLAB_TOKEN },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch variables: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const v of data) {
      if (v.environment_scope === GITLAB_ENVIRONMENT) {
        variables[v.key] = v.value;
      }
    }

    page++;
  }

  return variables;
}

async function main() {
  const envFileContent = readFileSync(ENV_FILE_PATH, "utf-8");
  const localVars: Record<string, string> = JSON.parse(envFileContent);

  console.log(`Checking GitLab CI/CD variables for project ID: ${GITLAB_PROJECT_ID}`);
  console.log(`Environment: ${GITLAB_ENVIRONMENT}\n`);

  const gitlabVars = await fetchGitLabVariables();

  const allKeys = [...new Set([...Object.keys(localVars), ...Object.keys(gitlabVars)])].sort();

  const matched: string[] = [];
  const mismatched: { key: string; gitlab: string; local: string }[] = [];
  const missingInGitlab: string[] = [];
  const missingInLocal: string[] = [];

  for (const key of allKeys) {
    const inGitlab = key in gitlabVars;
    const inLocal = key in localVars;

    if (inGitlab && inLocal) {
      if (gitlabVars[key] === localVars[key]) {
        matched.push(key);
      } else {
        mismatched.push({ key, gitlab: gitlabVars[key], local: localVars[key] });
      }
    } else if (inGitlab && !inLocal) {
      missingInLocal.push(key);
    } else {
      missingInGitlab.push(key);
    }
  }

  console.log(`=== SUMMARY ===`);
  console.log(`Matching: ${matched.length}`);
  console.log(`Mismatched values: ${mismatched.length}`);
  console.log(`In GitLab but NOT in JSON file: ${missingInLocal.length}`);
  console.log(`In JSON file but NOT in GitLab: ${missingInGitlab.length}`);

  if (mismatched.length > 0) {
    console.log(`\n=== MISMATCHED VALUES ===`);
    for (const { key, gitlab, local } of mismatched) {
      console.log(`\n${key}:`);
      console.log(`  GitLab: ${gitlab}`);
      console.log(`  Local:  ${local}`);
    }
  }

  if (missingInLocal.length > 0) {
    console.log(`\n=== IN GITLAB BUT NOT IN JSON FILE ===`);
    for (const key of missingInLocal) {
      console.log(`  ${key} = ${gitlabVars[key]}`);
    }
  }

  if (missingInGitlab.length > 0) {
    console.log(`\n=== IN JSON FILE BUT NOT IN GITLAB ===`);
    for (const key of missingInGitlab) {
      console.log(`  ${key} = ${localVars[key]}`);
    }
  }

  if (mismatched.length === 0 && missingInGitlab.length === 0 && missingInLocal.length === 0) {
    console.log(`\nAll variables match!`);
  }
}

main();
