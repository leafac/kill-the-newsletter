FROM node:16

RUN git config --global url."https://github.com/".insteadOf ssh://git@github.com:

WORKDIR /kill-the-newsletter

COPY package*.json ./
RUN npm ci
RUN npm dedupe --production
COPY . .

VOLUME /kill-the-newsletter/static/feeds/
VOLUME /kill-the-newsletter/static/alternate/

ENV WEB_PORT=4000
ENV EMAIL_PORT=2525
ENV BASE_URL=http://localhost:4000
ENV EMAIL_DOMAIN=localhost
ENV ISSUE_REPORT=mailto:kill-the-newsletter@leafac.com

EXPOSE 4000
EXPOSE 2525

CMD npx ts-node .