#!/bin/bash

set -euxo pipefail

# ssh root@www.kill-the-newsletter.com 'ufw allow ssh'
# ssh root@www.kill-the-newsletter.com 'ufw allow http'
# ssh root@www.kill-the-newsletter.com 'ufw allow https'
# ssh root@www.kill-the-newsletter.com 'ufw allow smtp'
# ssh root@www.kill-the-newsletter.com 'ufw enable'

# ssh root@www.kill-the-newsletter.com 'adduser kill-the-newsletter --disabled-password'
# ssh root@www.kill-the-newsletter.com 'rsync -av --chown=kill-the-newsletter:kill-the-newsletter ~/.ssh ~kill-the-newsletter'

# ssh kill-the-newsletter@www.kill-the-newsletter.com 'git clone https://github.com/leafac/www.kill-the-newsletter.com.git'

# ssh root@www.kill-the-newsletter.com 'apt update'
# ssh root@www.kill-the-newsletter.com 'apt install build-essential curl file git'
# ssh kill-the-newsletter@www.kill-the-newsletter.com 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"'
# ssh kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \$(/home/kill-the-newsletter/.linuxbrew/bin/brew shellenv)" >> ~/.bashrc'
# ssh kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && /home/kill-the-newsletter/.linuxbrew/bin/brew bundle'

ssh kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \$(rbenv init -)" >> ~/.bashrc'
# $ rbenv install $(< .ruby-version)
# $ bundle install

# $ chown root exim.conf

# setcap cap_net_bind_service=+ep ./caddy

# https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#generating-a-new-ssh-key
