#!/bin/bash

set -euxo pipefail

ssh-add

# ssh -tA root@www.kill-the-newsletter.com 'ufw allow ssh'
# ssh -tA root@www.kill-the-newsletter.com 'ufw allow http'
# ssh -tA root@www.kill-the-newsletter.com 'ufw allow https'
# ssh -tA root@www.kill-the-newsletter.com 'ufw allow smtp'
# ssh -tA root@www.kill-the-newsletter.com 'ufw enable'

# ssh -tA root@www.kill-the-newsletter.com 'adduser kill-the-newsletter'
# ssh -tA root@www.kill-the-newsletter.com 'adduser kill-the-newsletter sudo'
# ssh -tA root@www.kill-the-newsletter.com 'rsync -av --chown=kill-the-newsletter:kill-the-newsletter ~/.ssh ~kill-the-newsletter'

# ssh -tA kill-the-newsletter@www.kill-the-newsletter.com 'git clone git@github.com:leafac/www.kill-the-newsletter.com.git'

# ssh -tA root@www.kill-the-newsletter.com 'apt update'
# ssh -tA root@www.kill-the-newsletter.com 'apt install build-essential curl file git'
# ssh -tA kill-the-newsletter@www.kill-the-newsletter.com 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"'
# ssh -tA kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \$(/home/kill-the-newsletter/.linuxbrew/bin/brew shellenv)" >> ~/.bashrc'
# ssh -tA kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && /home/kill-the-newsletter/.linuxbrew/bin/brew bundle'

# ssh kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \$(rbenv init -)" >> ~/.bashrc'
# $ rbenv install $(< .ruby-version)
# $ bundle install

# $ chown root exim.conf

# setcap cap_net_bind_service=+ep ./caddy

# https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#generating-a-new-ssh-key
