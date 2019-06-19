#!/bin/bash

set -euxo pipefail

ssh -t root@www.kill-the-newsletter.com 'ufw allow ssh'
ssh -t root@www.kill-the-newsletter.com 'ufw allow http'
ssh -t root@www.kill-the-newsletter.com 'ufw allow https'
ssh -t root@www.kill-the-newsletter.com 'ufw allow smtp'
ssh -t root@www.kill-the-newsletter.com 'ufw enable'

ssh -t root@www.kill-the-newsletter.com 'apt update'

ssh -t root@www.kill-the-newsletter.com 'ssh-keygen -t rsa -b 4096 -C "kill-the-newsletter@leafac.com"'
ssh -t root@www.kill-the-newsletter.com 'cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys'
ssh -t root@www.kill-the-newsletter.com 'cat ~/.ssh/id_rsa.pub'
echo "Add the key above as a Deploy Key on GitHub: https://github.com/leafac/www.kill-the-newsletter.com/settings/keys"
read -p "Press enter to continue"

ssh -t root@www.kill-the-newsletter.com 'adduser kill-the-newsletter'
ssh -t root@www.kill-the-newsletter.com 'adduser kill-the-newsletter sudo'
ssh -t root@www.kill-the-newsletter.com 'rsync -av --chown kill-the-newsletter:kill-the-newsletter ~/.ssh ~kill-the-newsletter'

ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'git clone git@github.com:leafac/www.kill-the-newsletter.com.git'

ssh -t root@www.kill-the-newsletter.com 'apt install build-essential curl file git'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" >> ~/.bashrc'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && bash -ic "brew bundle"' || true

ssh -t root@www.kill-the-newsletter.com 'apt install zlib1g-dev'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'echo "eval \"\$(rbenv init -)\"" >> ~/.bashrc'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && bash -ic "rbenv install $(< .ruby-version)"'
ssh -t kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && bash -ic "bundle install"'

ssh -t root@www.kill-the-newsletter.com 'setcap cap_net_bind_service=+ep $(realpath /home/linuxbrew/.linuxbrew/bin/caddy)'

bash deploy.sh
