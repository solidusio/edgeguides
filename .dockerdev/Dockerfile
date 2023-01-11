ARG NODE_VERSION
FROM node:$NODE_VERSION-slim

RUN apt-get update -qq \
  && DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    build-essential \
    curl \
    git \
  && rm -rf /var/cache/apt/lists/*

ENV APP_USER=solidusio_user \
    LANG=C.UTF-8
ENV APP_HOME=/home/$APP_USER/app

RUN useradd -ms /bin/bash $APP_USER

USER $APP_USER

RUN mkdir -p /home/$APP_USER/history

WORKDIR /home/$APP_USER/app
