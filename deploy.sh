#!/bin/bash

set -euxo pipefail

ssh-add

ssh -tA kill-the-newsletter@www.kill-the-newsletter.com 'cd www.kill-the-newsletter.com && git pull origin master'

ssh -tA root@www.kill-the-newsletter.com 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.conf /home/linuxbrew/.linuxbrew/etc/exim.conf'
ssh -tA root@www.kill-the-newsletter.com 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/server.service /etc/systemd/system/server.service'
ssh -tA root@www.kill-the-newsletter.com 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/caddy.service /etc/systemd/system/caddy.service'
ssh -tA root@www.kill-the-newsletter.com 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.service /etc/systemd/system/exim.service'

ssh -tA root@www.kill-the-newsletter.com 'systemctl daemon-reload'
ssh -tA root@www.kill-the-newsletter.com 'systemctl restart server caddy exim'
ssh -tA root@www.kill-the-newsletter.com 'systemctl enable server caddy exim'
