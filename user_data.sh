#!/bin/bash

adduser kill-the-newsletter --disabled-password
usermod -aG sudo kill-the-newsletter
ufw allow ssh
ufw allow http
ufw allow https
ufw allow smtp
ufw enable
rsync -av --chown=kill-the-newsletter:kill-the-newsletter ~/.ssh /home/kill-the-newsletter
