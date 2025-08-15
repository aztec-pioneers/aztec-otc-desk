# OTC Monorepo

## Requirements

- Docker: [install here](https://www.docker.com/get-started/) - needed to compile Aztec contracts
- Node.js: recommended to use [nvm for bash/zsh](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) or [nvm for fish](https://github.com/jorgebucaran/nvm.fish?tab=readme-ov-file#installation)
- pnpm & turbo: `npm install -g pnpm turbo`

## Bootstrap the monorepo

You only need to bootstrap the monorepo once after cloning it. Run this in the root:

```sh
pnpm install  # installs the correct version of turbo
turbo bootstrap
```

You can run `turbo bootstrap` after you pull new git commits but it's not necessary as all scripts (e.g., `turbo dev`) will run it automatically.

## Project structure

- `apps/` - Applications
- `packages/` - Packages

## Common scripts

Scripts that should be run from the root of the monorepo:

- `pnpm aztec:sandbox` - Start Aztec sandbox

All other scripts should be run from a project folder (e.g., `cd apps/interface && turbo dev`). These scripts follow the same pattern in all projects:

- `turbo dev` - Start in development mode
- `turbo build` - Build for production
- `turbo test` - Run `turbo test:lint` && `turbo test:runtime`
- `turbo test:runtime` - Run unit tests
- `turbo test:lint` - Type-check and lint code
- `turbo compile` - If available, compile contracts & other artifacts

## Note on Aztec

Don't use `aztec` or `aztec-nargo` commands - `turbo` handles all Aztec-related tasks for you. If you still have a need to use `aztec` or `aztec-nargo`, use `bash ./scripts/aztec.sh` and `bash ./scripts/aztec-nargo.sh` respectively - these will make sure you are using the correct version of Aztec.

### Updating Aztec

Do a project-wide search of an old version of Aztec and replace it with the new version. Among the files you will be updating are: `package.json`, `Nargo.toml`, `pnpm-workspace.yaml` and scripts in `scripts/`. Run `turbo test` after updating to test the monorepo.

## PR guidelines

1. Title prefixed with `feat`, `fix`, `refactor` or `chore`. Optionally, add scope in parenthesis. E.g., `feat: add new feature`, `chore(ci): update node version`
2. Branch name prefixed with 2 letter initials and then dashed name of the feature. E.g., `om/update-docs`
3. When merged, commits are squashed into one commit with the title of the PR.
