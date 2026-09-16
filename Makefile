setup: install build migrate

install:
	npm ci

build:
	npm run build

migrate:
	npm run migrate

dev:
	npm run dev

lint:
	npx eslint .

test: build
	npm test