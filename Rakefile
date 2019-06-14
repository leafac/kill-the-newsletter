require "rake/testtask"

task default: :test

Rake::TestTask.new { |t| t.test_files = ["test.rb"] }

desc "Run development server"
task(:server) { sh "rerun bundle exec ruby server.rb" }

desc "Run email server"
task(:email) { sh "sudo exim -C '#{File.expand_path("../exim.conf", __FILE__)}' -bd -q30m -d" }

# curl | bash for user data

# sudo chown -R leafac:admin /usr/local/var

# sudo exim -C "$(pwd)/exim.conf" -bd -q30m -d

# Deployment key?

# ssh root@servers_public_IP "bash -s" -- < /path/to/script/file

# **Install Dependencies**

# ```console
# $ brew bundle
# $ rbenv init # Follow instructions
# $ rbenv install $(< .ruby-version)
# $ bundle install
# $ chown root exim.conf
# ```

# **Run Server**

# ```console
# $ rerun bundle exec ruby server.rb
# ```

# **Run Email Server**

# ```console
# $ sudo exim -C exim.conf -bd -q30m -d
# ```

# See [Rakefile](Rakefile) for commands to manage Exim’s queue and to send test emails.






# Deployment
# ----------

# 1. Configure DNS to have A & AAAA records pointing to the machine’s IP address; a CNAME record pointing `www` to the top-level; and an MX record pointing to the top-level as well.

# 2. Add a user to run the application (running it as `root` would be insecure):

#    ```
#    [root]$ adduser <user> --disabled-password
#    [root]$ mkdir ~<user>/.ssh
#    [root]$ cp ~/.ssh/authorized_keys ~<user>/.ssh/authorized_keys
#    [root]$ chown <user>:<user> ~<user>/.ssh/authorized_keys
#    ```

# 3. Install **Kill the Newsletter!** and its dependencies:

#    ```
#    [root]$ curl -sL https://deb.nodesource.com/setup_10.x | bash
#    [root]$ curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
#    [root]$ echo "deb https://dl.yarnpkg.com/debian/ stable main" >> /etc/apt/sources.list.d/yarn.list
#    [root]$ apt update
#    [root]$ apt install --assume-yes build-essential gcc g++ make libssl-dev libreadline-dev zlib1g-dev libsqlite3-dev nodejs yarn exim4
#    [root]$ systemctl stop exim4
#    [root]$ systemctl disable exim4
#    [root]$ curl https://getcaddy.com | bash -s personal http.git
#    [root]$ setcap cap_net_bind_service=+ep /usr/local/bin/caddy
#    [<user>]$ curl -fsSL https://github.com/rbenv/rbenv-installer/raw/master/bin/rbenv-installer | bash
#    [<user>]$ echo 'export PATH=~/.rbenv/bin:$PATH' >> ~/.bashrc
#    [<user>]$ echo 'eval "$(rbenv init -)"' >> ~/.bashrc
#    [<user>]$ source ~/.bashrc
#    [<user>]$ git clone https://github.com/leafac/kill-the-newsletter.git
#    [<user>]$ cd kill-the-newsletter
#    [<user>:kill-the-newsletter]$ rbenv install $(cat .ruby-version)
#    [<user>:kill-the-newsletter]$ bundle install
#    [<user>:kill-the-newsletter]$ yarn install
#    [<user>:kill-the-newsletter]$ env RAILS_ENV=production bin/rails assets:precompile
#    ```

# 4. Configure **Kill the Newsletter!** (see [§ Settings](#settings)) and its dependencies:

#    | File | Example |
#    |-|-|
#    | `config/exim/exim.production.conf` | `config/exim/exim.production.example.conf` |
#    | `config/caddy/Caddyfile.production` | `config/caddy/Caddyfile.production.example` |
#    | `/etc/systemd/system/kill-the-newsletter.service` | `config/services/kill-the-newsletter.example.service` |
#    | `/etc/systemd/system/exim.service` | `config/services/exim.example.service` |
#    | `/etc/systemd/system/caddy.service` | `config/services/caddy.example.service` |

# 5. Set `root` as the owner of the systemd services and `config/exim/exim.production.conf` (otherwise Exim would refuse to run for security reasons):

#    ```
#    $ chown root:root /etc/systemd/system/kill-the-newsletter.service
#    $ chown root:root /etc/systemd/system/exim.service
#    $ chown root:root /etc/systemd/system/caddy.service
#    $ chown root:root config/exim/exim.production.conf
#    ```

# 6. Load, start and enable the services (so that they start at boot):

#    ```
#    $ systemctl daemon-reload
#    $ systemctl start kill-the-newsletter exim caddy
#    $ systemctl enable kill-the-newsletter exim caddy
#    ```
















# **List Emails in the Queue**

# ```
# $ sudo exim -C config/exim/exim.development.conf -bp
# ```

# **Force Immediate Delivery Retry**

# ```
# $ sudo exim -C config/exim/exim.development.conf -qff
# ```

# **Empty the Queue**

# ```
# $ sudo exim -C config/exim/exim.development.conf -bp | sudo exiqgrep -C config/exim/exim.development.conf -i | sudo xargs exim -C config/exim/exim.development.conf -Mrm
# ```

# **Read the Logs**

# ```
# $ sudo tail -F /usr/local/var/spool/exim/log/mainlog
# ```
