#!/bin/bash

adduser kill-the-newsletter --disabled-password
usermod -aG sudo kill-the-newsletter
ufw allow ssh
ufw allow http
ufw allow https
ufw allow smtp
ufw enable
rsync -av --chown=kill-the-newsletter:kill-the-newsletter ~/.ssh /home/kill-the-newsletter

# https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#generating-a-new-ssh-key

# https://github.com/do-community/automated-setups/blob/master/Ubuntu-18.04/initial_server_setup.sh
