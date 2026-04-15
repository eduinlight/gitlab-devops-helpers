.PHONY: variables-uat variables-prd check-uat check-uat-branch check-prd help

include .env
export

help:
	@echo "Available commands:"
	@echo "  make variables-uat        - Set UAT environment variables"
	@echo "  make variables-uat-branch - Set UAT branch environment variables"
	@echo "  make variables-prd        - Set PRD environment variables"
	@echo "  make check-uat            - Check UAT environment variables"
	@echo "  make check-uat-branch     - Check UAT branch environment variables"
	@echo "  make check-prd            - Check PRD environment variables"

variables-uat:
	GITLAB_ENVIRONMENT=uat ENV_FILE_PATH=uat-qollabi-ai.env.json bun run set-env-vars.ts

variables-uat-branch:
	GITLAB_ENVIRONMENT=uat/* ENV_FILE_PATH=uat-qollabi-ai.env.json bun run set-env-vars.ts

variables-prd:
	GITLAB_ENVIRONMENT=prd ENV_FILE_PATH=prd-qollabi-ai.env.json bun run set-env-vars.ts

check-uat:
	GITLAB_ENVIRONMENT=uat ENV_FILE_PATH=uat-qollabi-ai.env.json bun run check-env-vars.ts

check-uat-branch:
	GITLAB_ENVIRONMENT=uat/* ENV_FILE_PATH=uat-qollabi-ai.env.json bun run check-env-vars.ts

check-prd:
	GITLAB_ENVIRONMENT=prd ENV_FILE_PATH=prd-qollabi-ai.env.json bun run check-env-vars.ts
