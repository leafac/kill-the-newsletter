#!/bin/bash

set -euxo pipefail


cp services
cp exim.conf

#    $ chown root:root /etc/systemd/system/kill-the-newsletter.service
#    $ chown root:root /etc/systemd/system/exim.service
#    $ chown root:root /etc/systemd/system/caddy.service
#    $ chown root:root config/exim/exim.production.conf

#    $ systemctl daemon-reload
#    $ systemctl start kill-the-newsletter exim caddy
#    $ systemctl enable kill-the-newsletter exim caddy

