# use latest stable node
FROM node:lts-alpine

# set build arguments
ARG VERSION=1.0.0

# set environment variables for container
ENV BASE_URL=https://www.kill-the-newsletter.com \
    EMAIL_DOMAIN=kill-the-newsletter.com \
    ISSUE_REPORT=mailto:kill-the-newsletter@leafac.com

WORKDIR /src

RUN apk --no-cache add git

# download release and unpack archive
RUN wget -q -O release.tar.gz https://github.com/leafac/www.kill-the-newsletter.com/archive/$VERSION.tar.gz \
	&& tar -C . -xzf release.tar.gz \
	&& rm release.tar.gz \
	&& mv www.kill-the-newsletter.com-$VERSION/* . \
	&& rm -rf www.kill-the-newsletter.com-$VERSION/

# install dependencies
RUN npm install \
    && npm audit fix

VOLUME /static/feeds/

# expose http & smtp
EXPOSE 8000 \
       25

# start application
CMD [ "npm", "start" ]