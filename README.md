# Solidus Developer Documentation

This repository hosts the developer documentation for Solidus, the open-source eCommerce framework for industry
trailblazers.

The documentation, which is still a work in progress, is built using [Docusaurus 2](https://docusaurus.io/) and
published to https://edgeguides.solidus.io.

## Installation

```
$ yarn
```

## Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without
having to restart the server. This guide is versioned, so your live changes will be on http://localhost:3000/next.

## Versions

The documentation in this repo is versioned for every major and minor release.
All changes merged to the main docs (under `docs/`) will refer to the `master` branch of the Solidus repo.
Past versions won't generally be updated, but in case a patchlevel release requires a change it should be directed at the appropriate folder under `versioned_docs/`.

We have a helper script to backport documentation changes to previous versions. Run `bin/backport -h` for more information.

In order to release a new version from the documentation under `docs/` this command can be used:

```
npm run docusaurus docs:version 1.2
```

## Docker development

```
$ docker-compose up -d
```

Wait for the `app` container to be ready (you can check the logs with `docker-compose logs -f app`).

```
$ docker-compose exec app yarn start -h 0.0.0.0
```

Now you can access the documentation at http://localhost:3000.

## Deployment

There's nothing special to do here: this website is published via Cloudflare Pages. All PRs generate a preview
environment, and all commits to `main` will cause the main site to be rebuilt.

## Contributing

To organize the documentation and make it more usable, the guides follow the [Diátaxis](https://diataxis.fr/)
framework. If you are planning on making significant contributions, we strongly recommend getting familiar
with Diátaxis' taxonomy and conventions.
