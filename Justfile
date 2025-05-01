set shell := ["zsh", "-c"]

[private]
@help:
  just --list --unsorted

deploy:
	bun run deploy

dev:
	bun vite dev

fix:
	bun run format
