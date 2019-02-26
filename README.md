# fediverse.space 🌐
The map of the fediverse that you always wanted.

![A screenshot of fediverse.space](screenshot.png)

## Requirements
- For everything:
  - Docker
  - Docker-compose
- For the scraper + API:
  - Python 3
- For laying out the graph:
  - Java
- For the frontend:
  - Yarn

## Running it
### Backend
- `cp example.env .env` and modify environment variables as required
- `docker-compose build`
- `docker-compose up -d django`
  - if you don't specify `django`, it'll also start `gephi` which should only be run as a regular one-off job
  - to run in production, run `caddy` rather than `django`
### Frontend
- `cd frontend && yarn install`
- `yarn start`

## Commands
### Backend

After running the backend in Docker:

- `docker-compose exec web python manage.py scrape` scrapes the fediverse
  - It only scrapes instances that have not been scraped in the last 24 hours.
  - By default, it'll only scrape 50 instances in one go. If you want to scrape everything, pass the `--all` flag.
- `docker-compose exec web python manage.py build_edges` aggregates this information into edges with weights
- `docker-compose run gephi java -Xmx1g -jar build/libs/graphBuilder.jar` lays out the graph

To run in production, use `docker-compose -f docker-compose.yml -f docker-compose.production.yml` instead of just `docker-compose`.

### Frontend
- `yarn build` to create an optimized build for deployment

