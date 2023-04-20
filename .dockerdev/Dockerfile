ARG NODE_VERSION
FROM node:$NODE_VERSION-slim

RUN apt-get update -qq \
  && DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    build-essential \
    curl \
    git \
  && rm -rf /var/cache/apt/lists/*

ENV LANG=C.UTF-8
ENV APP_HOME=/home/node/app

USER node

RUN mkdir -p /home/node/history

WORKDIR /home/node/app
