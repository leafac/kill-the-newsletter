Kill the Newsletter!
====================

![](app/assets/images/envelope-to-feed.svg)

Convert email newsletters into Atom feeds

https://www.kill-the-newsletter.com

|||
|-|-|
| Version | [0.0.5](CHANGELOG.md#005---2019-02-03) |
| Documentation | [GitHub](https://github.com/leafac/kill-the-newsletter#readme) |
| License | [GNU General Public License Version 3](https://gnu.org/licenses/gpl-3.0.txt) |
| Code of Conduct | [Contributor Covenant v1.4.0](http://contributor-covenant.org/version/1/4/) |
| Source | [GitHub](https://github.com/leafac/kill-the-newsletter) |
| Bug Reports | [GitHub Issues](https://github.com/leafac/kill-the-newsletter/issues) |
| Contributions | [GitHub Pull Requests](https://github.com/leafac/kill-the-newsletter/pulls) |
| Author | [Leandro Facchinetti](https://www.leafac.com) |

Architecture
------------

**Kill the Newsletter!** is a standard [Ruby on Rails](https://rubyonrails.org) application. It receives emails from a pipe created by [Exim](https://www.exim.org), and stores Atom feeds as plain text files in the filesystem—it does not use a database system such as [SQLite](https://www.sqlite.org) or [PostgreSQL](https://www.sqlite.org/index.html).

In production, **Kill the Newsletter!** lives behind a [Caddy](https://caddyserver.com) reverse proxy. Processes are managed by [systemd](https://www.freedesktop.org/wiki/Software/systemd/) services running on [Ubuntu](https://www.ubuntu.com).

**Kill the Newsletter!** is hosted on [DigitalOcean](https://www.digitalocean.com) with domain and DNS managed by [Namecheap](https://www.namecheap.com). (It is impossible to deploy **Kill the Newsletter!** to [Heroku](https://www.heroku.com/) because it depends on the file system.)

Development
-----------

1. Install the dependencies (example given for [macOS](https://www.apple.com/macos/) with [Homebrew](https://brew.sh)):

   ```
   $ brew install rbenv node yarn exim caddy
   $ rbenv init # Follow instructions
   $ rbenv install $(cat .ruby-version)
   $ bundle install
   $ yarn install
   ```

2. Start the application:

   ```
   $ bin/rails server
   ```

3. Create `config/exim/exim.development.conf` based on `config/exim/exim.development.example.conf`.

4. Set `root` as the owner of `config/exim/exim.development.conf` (otherwise Exim would refuse to run for security reasons):

   ```
   $ sudo chown root config/exim/exim.development.conf
   ```

5. Start Exim (see [§ Appendix: Managing the Exim Queue](#appendix-managing-the-exim-queue) for useful commands):

   ```
   $ sudo exim -C config/exim/exim.development.conf -bd -q30m -d
   ```

6. Visit <http://localhost:3000>. Create an inbox.

7. Send a test email:

   ```
   $ curl smtp://localhost --mail-from publisher@example.com --mail-rcpt <inbox-token>@localhost --upload-file test/fixtures/files/email.txt
   ```

Testing the Production Environment Locally
------------------------------------------

Before deploying, test the production environment locally.

1. Precompile the assets:

   ```
   $ env RAILS_ENV=production bin/rails assets:precompile
   ```

2. Start the application in the `production` environment:

   ```
   $ env RAILS_ENV=production KILL_THE_NEWSLETTER_HOST=localhost:2015 bin/rails server --binding localhost --port 3000
   ```

3. Start Exim (see [§ Appendix: Managing the Exim Queue](#appendix-managing-the-exim-queue) for useful commands):

   ```
   $ sudo exim -C config/exim/exim.development.conf -bd -q30m -d
   ```

4. Start Caddy as a reverse proxy:

   ```
   $ caddy -conf config/caddy/Caddyfile.development
   ```

5. Visit <http://localhost:2015>. Create an inbox.

6. Send a test email:

   ```
   $ curl smtp://localhost --mail-from publisher@example.com --mail-rcpt <inbox-token>@localhost --upload-file test/fixtures/files/email.txt
   ```

Deployment
----------

1. Configure DNS to have A & AAAA records pointing to the machine’s IP address; a CNAME record pointing `www` to the top-level; and an MX record pointing to the top-level as well.

2. Add a user to run the application (running it `root` would be insecure):

   ```
   [root]$ adduser <user> --disabled-password
   [root]$ mkdir ~<user>/.ssh
   [root]$ cp ~/.ssh/authorized_keys ~<user>/.ssh/authorized_keys
   [root]$ chown <user>:<user> ~<user>/.ssh/authorized_keys
   ```

3. Install **Kill the Newsletter!** and its dependencies:

   ```
   [root]$ curl -sL https://deb.nodesource.com/setup_10.x | bash
   [root]$ curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
   [root]$ echo "deb https://dl.yarnpkg.com/debian/ stable main" >> /etc/apt/sources.list.d/yarn.list
   [root]$ apt update
   [root]$ apt install --assume-yes build-essential gcc g++ make libssl-dev libreadline-dev zlib1g-dev libsqlite3-dev nodejs yarn exim4
   [root]$ systemctl stop exim4
   [root]$ systemctl disable exim4
   [root]$ curl https://getcaddy.com | bash -s personal http.git
   [root]$ setcap cap_net_bind_service=+ep /usr/local/bin/caddy
   [<user>]$ curl -fsSL https://github.com/rbenv/rbenv-installer/raw/master/bin/rbenv-installer | bash
   [<user>]$ echo 'export PATH=~/.rbenv/bin:$PATH' >> ~/.bashrc
   [<user>]$ echo 'eval "$(rbenv init -)"' >> ~/.bashrc
   [<user>]$ source ~/.bashrc
   [<user>]$ git clone https://github.com/leafac/kill-the-newsletter.git
   [<user>]$ cd kill-the-newsletter
   [<user>:kill-the-newsletter]$ rbenv install $(cat .ruby-version)
   [<user>:kill-the-newsletter]$ bundle install
   [<user>:kill-the-newsletter]$ yarn install
   [<user>:kill-the-newsletter]$ env RAILS_ENV=production bin/rails assets:precompile
   ```

4. Configure **Kill the Newsletter!** (see [§ Settings](#settings)) and its dependencies:

   | File | Example |
   |-|-|
   | `config/exim/exim.production.conf` | `config/exim/exim.production.example.conf` |
   | `config/caddy/Caddyfile.production` | `config/caddy/Caddyfile.production.example` |
   | `/etc/systemd/system/kill-the-newsletter.service` | `config/services/kill-the-newsletter.example.service` |
   | `/etc/systemd/system/exim.service` | `config/services/exim.example.service` |
   | `/etc/systemd/system/caddy.service` | `config/services/caddy.example.service` |

5. Set `root` as the owner of the systemd services and `config/exim/exim.production.conf` (otherwise Exim would refuse to run for security reasons):

   ```
   $ chown root:root /etc/systemd/system/kill-the-newsletter.service
   $ chown root:root /etc/systemd/system/exim.service
   $ chown root:root /etc/systemd/system/caddy.service
   $ chown root:root config/exim/exim.production.conf
   ```

6. Load, start and enable the services (so that they start at boot):

   ```
   $ systemctl daemon-reload
   $ systemctl start kill-the-newsletter exim caddy
   $ systemctl enable kill-the-newsletter exim caddy
   ```

7. Create a GitHub webhook for `https://<host>/deploy` with `Content type` equals `application/json` for automatic deployments.

Settings
--------

| Environment Variable | Default | Example from Production | Description |
|-|-|-|-|
| `KILL_THE_NEWSLETTER_HTTPS` | Unset | `true` | Whether links should be HTTP (unset) or HTTPS (set) |
| `KILL_THE_NEWSLETTER_HOST` | `localhost:3000` | `www.kill-the-newsletter.com` | Host for links |
| `KILL_THE_NEWSLETTER_EMAIL_HOST` | `localhost` | `kill-the-newsletter.com` | Host for which the application accepts emails |

Appendix: Managing the Exim Queue
---------------------------------

When Exim receives email, it tries to deliver the email to the Rails application immediately. If Exim fails to deliver (for example, because the Rails application is not running), then the email enters a retry queue. The following are some recipes on managing this queue:

**List Emails in the Queue**

```
$ sudo exim -C config/exim/exim.development.conf -bp
```

**Force Immediate Delivery Retry**

Restart Exim. Exim retries to deliver emails on the queue at startup.

**Empty the Queue**

```
$ sudo exim -C config/exim/exim.development.conf -bp | sudo exiqgrep -C config/exim/exim.development.conf -i | sudo xargs exim -C config/exim/exim.development.conf -Mrm
```

**Read the Logs**

```
$ sudo tail -F /usr/local/var/spool/exim/log/mainlog
```
