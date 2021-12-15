FROM redis:6-buster
USER root 

# api port
EXPOSE 3301

# update and install initial packages
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    ca-certificates \
    curl \
    apt-transport-https \
    lsb-release \
    gnupg \
    git

RUN update-ca-certificates

# add yarn repo
RUN curl https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# install nvm and node 13.8.0
SHELL ["/bin/bash", "--login", "-c"]
RUN curl -o- -k https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
RUN nvm install 16.5.0
# ENV NODE_VERSION=16.5.0
# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# ENV NVM_DIR=/root/.nvm
# RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
# RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
# RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
# ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# install yarn
RUN apt-get update && apt-get install --no-install-recommends -y \
  yarn

# clone and move into Get5API folder
RUN mkdir /Get5API
RUN mkdir /etc/redis
WORKDIR /Get5API
RUN git clone https://github.com/PhlexPlexico/G5API.git
WORKDIR /Get5API/G5API

# copy production and redis into place
RUN cp /Get5API/G5API/config/production.json.template /Get5API/G5API/config/production.json
RUN cp /Get5API/G5API/config/redis.conf /etc/redis/redis.conf

# set config with env variables, build, and run application
CMD sh /Get5API/G5API/config/setEnv.sh && \
    yarn install --production && \
    yarn migrate-create-prod && \
    yarn migrate-prod-upgrade && \
    yarn && \
    redis-server /etc/redis/redis.conf --daemonize yes --appendonly yes && \
    yarn startprod && \
    yarn pm2 logs
