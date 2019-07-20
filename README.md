# fediverse.space 🌐

The map of the fediverse that you always wanted.

Read the latest updates on Mastodon: [@fediversespace](https://cursed.technology/@fediversespace)

![A screenshot of fediverse.space](screenshot.png)

1. [Requirements](#requirements)
2. [Running it](#running-it)
3. [Commands](#commands)
4. [Privacy](#privacy)
5. [Deployment](#deployment)
6. [Acknowledgements](#acknowledgements)

## Requirements

Though dockerized, backend development is easiest if you have the following installed.

- For the scraper + API:
  - Elixir
  - Postgres
- For laying out the graph:
  - Java
- For the frontend:
  - Node.js
  - Yarn

## Running it

### Backend

- `cp example.env .env` and modify environment variables as required
- `docker-compose build`
- `docker-compose up -d phoenix`
  - if you don't specify `phoenix`, it'll also start `gephi` which should only be run as a regular one-off job

### Frontend

- `cd frontend && yarn install`
- `yarn start`

## Commands

### Backend

`./gradlew shadowJar` compiles the graph layout program. `java -Xmx1g -jar build/libs/graphBuilder.jar` runs it.
If running in docker, this means you run

- `docker-compose build gephi`
- `docker-compose run gephi java -Xmx1g -jar build/libs/graphBuilder.jar` lays out the graph

### Frontend

- `yarn build` creates an optimized build for deployment

## Privacy

This project doesn't crawl personal instances: the goal is to understand communities, not individuals. The threshold for what makes an instance "personal" is defined in the [backend config](backend/config/config.exs) and the [graph builder SQL](gephi/src/main/java/space/fediverse/graph/GraphBuilder.java).

## Deployment
You don't have to follow these instructions, but it's one way to set up a continuous deployment pipeline. The following are for the backend; the frontend is just a static HTML/JS site that can be deployed anywhere.
1. Install [Dokku](http://dokku.viewdocs.io/dokku/) on your web server.
2. Install [dokku-postgres](https://github.com/dokku/dokku-postgres), [dokku-monorepo](https://github.com/notpushkin/dokku-monorepo), and [dokku-letsencrypt](https://github.com/dokku/dokku-letsencrypt).
3. Create the apps
  * `dokku apps:create phoenix`
  * `dokku apps:create gephi`
4. Create the backing database
  * `dokku postgres:create fediversedb`
  * `dokku postgres:link fediversedb phoenix`
  * `dokku postgres:link fediversedb gephi`
5. Update the backend configuration. In particular, change the `user_agent` in [config.exs](/backend/config/config.exs) to something descriptive.
6. Push the apps, e.g. `git push dokku@<DOMAIN>:phoenix` (note that the first push cannot be from the CD pipeline).
7. Set up SSL for the Phoenix app
  * `dokku letsencrypt phoenix`
  * `dokku letsencrypt:cron-job --add`
8. Set up a cron job for the graph layout (use the `dokku` user). E.g.
```
SHELL=/bin/bash
0 2 * * * /usr/bin/dokku run gephi java -Xmx1g -jar build/libs/graphBuilder.jar
```

## Acknowledgements

[![NLnet logo](https://i.imgur.com/huV3rvo.png)](https://nlnet.nl/project/fediverse_space/)

Many thanks to [NLnet](https://nlnet.nl/project/fediverse_space/) for their support and guidance of this project.
