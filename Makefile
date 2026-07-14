.PHONY: api-install api-build api-test mobile-test ci up down

api-install:
	cd services/api && npm install

api-build:
	cd services/api && npm run build

api-test:
	cd services/api && npm test

mobile-test:
	cd apps/mobile && flutter pub get && flutter test

ci:
	./scripts/ci.sh

up:
	docker compose up --build

down:
	docker compose down
