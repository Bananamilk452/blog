# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development server:** `pnpm dev`
- **Build:** `pnpm build`
- **Start server:** `pnpm start`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Prisma:** `pnpm prisma <command>`

## Development Workflow

After completing a task, please run the following commands to ensure code quality and prevent regressions:

1.  `pnpm format`: To format the code.
2.  `pnpm build`: To check for any build errors.

## Architecture

This is a special blog project that uses the [fedify](https://fedify.dev/) package to expose blog posts to the fediverse. Fedify is an ActivityPub server framework for building federated server apps. For more details on how to work with fedify, please refer to the documentation found at [https://fedify.dev/llms.txt](https://fedify.dev/llms.txt).

The project is built with [Next.js](https://nextjs.org/) using the App Router. The main parts of the application are in the `src` directory.

- `src/app`: Contains the pages and API routes for the application.
- `src/components`: Contains reusable React components.
- `src/hooks`: Contains custom React hooks.
- `src/lib`: Contains utility functions.
- `src/prisma`: Contains the Prisma schema and is used for database access.
- `src/federation.ts`: This file contains the core logic for fedify integration. It's recommended to examine this file to understand its role in the application.
