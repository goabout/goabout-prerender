FROM node:5.5.0

MAINTAINER Go About <tech@goabout.com>

RUN apt-get update && apt-get install -y \
  fontconfig \
&& rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app 
WORKDIR /usr/src/app
ADD . /usr/src/app

ENV PORT=80

EXPOSE 80

CMD [ "./docker/phantomjs", "server.js" ]
