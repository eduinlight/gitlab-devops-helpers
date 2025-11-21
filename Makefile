.PHONY: variables-uat variables-prd help

include .env
export

help:
  @echo "Available commands:"
  @echo "  make variables-uat  - Set UAT environment variables"
  @echo "  make variables-prd  - Set PRD environment variables"

variables-uat:
  GITLAB_ENVIRONMENT=uat ENV_FILE_PATH=uat-qollabi-ai.env.json bun run set-env-vars.ts

variables-prd:
  GITLAB_ENVIRONMENT=prd ENV_FILE_PATH=prd-qollabi-ai.env.json bun run set-env-vars.ts
