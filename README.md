# GitLab CI/CD Environment Variables Manager

A set of TypeScript utilities for managing GitLab CI/CD environment variables and pipelines using Bun.js.

## Features

- **Set Environment Variables**: Upload environment variables from a JSON file to GitLab CI/CD
- **Remove Environment Variables**: Delete all environment variables from a specific GitLab environment
- **Remove Pipelines**: Clean up all pipelines from a GitLab project

## Prerequisites

- [Bun.js](https://bun.sh/) installed
- GitLab Personal Access Token with API access
- GitLab Project ID

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Create a `.env` file based on the `.env.dist` template:
   ```bash
   cp .env.dist .env
   ```
4. Edit the `.env` file with your GitLab credentials and settings

## Configuration

Set the following environment variables in your `.env` file:

```
GITLAB_TOKEN=your_personal_access_token
GITLAB_PROJECT_ID=your_project_id
GITLAB_API_URL=https://gitlab.com/api/v4  # Change for self-hosted GitLab
GITLAB_ENVIRONMENT=production  # Target environment for variables
ENV_FILE_PATH=./your-env-file.json  # Path to your JSON file with variables
BATCH_SIZE=20  # For pipeline operations
DELAY_MS=500  # Delay between API calls
```

## Usage

### Setting Environment Variables

1. Create a JSON file with your environment variables:

   ```json
   {
     "API_KEY": "your-api-key",
     "DEBUG_MODE": true,
     "MAX_CONNECTIONS": 100
   }
   ```

2. Run the script:
   ```bash
   ENV_FILE_PATH=./your-env-file.json GITLAB_ENVIRONMENT=production bun run set-env-vars.ts
   ```

### Removing Environment Variables

Remove all variables from a specific environment:

```bash
GITLAB_ENVIRONMENT=production bun run remove-env-vars.ts
```

### Removing Pipelines

Remove all pipelines from your project:

```bash
bun run remove-pipelines.ts
```

## Environment Files

You can create different environment files for different environments:

- `test.env.json` - For test environment
- `uat-qollabi-ai.env.json` - For UAT environment
- etc.

## Notes

- Variables are set as non-protected and non-masked by default
- The scripts handle primitive values (strings, numbers, booleans)
- Operations are performed in parallel for better performance
- Error handling is included with detailed logging

## Security Considerations

- Never commit your `.env` file or JSON files containing sensitive data
- Use GitLab's masked variables feature for sensitive values
- Ensure your GitLab token has appropriate permissions

## License

[MIT](LICENSE)
