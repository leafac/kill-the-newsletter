FROM scratch
MAINTAINER Leandro Facchinetti <me@leafac.com>

COPY kill-the-newsletter /
COPY kill-the-newsletter.json /

EXPOSE 2525
EXPOSE 8080

VOLUME /feeds

CMD ["/kill-the-newsletter"]
