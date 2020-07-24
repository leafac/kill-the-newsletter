FROM node:latest

WORKDIR /kill-the-newsletter

COPY package*.json ./
RUN npm ci --production
COPY . .

VOLUME /kill-the-newsletter/static/feeds/
VOLUME /kill-the-newsletter/static/alternate/

ENV WEB_PORT=8000
ENV EMAIL_PORT=2525
ENV BASE_URL=http://localhost:8000
ENV EMAIL_DOMAIN=localhost
ENV ISSUE_REPORT=mailto:kill-the-newsletter@leafac.com

EXPOSE 8000
EXPOSE 2525

CMD npx ts-node .
