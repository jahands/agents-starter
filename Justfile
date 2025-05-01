set shell := ["zsh", "-c"]

[private]
@help:
  just --list --unsorted

deploy:
	bun run deploy

fix:
	bun run format
