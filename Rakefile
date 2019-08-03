require "rake/testtask"
require "nokogiri"

task default: :test

Rake::TestTask.new { |t| t.test_files = ["test.rb"] }

desc "Check that feeds are parseable with Nokogiri"
task :check_feeds do
  Dir["public/feeds/*.xml"].each do |feed_path|
    Nokogiri::XML(File.read(feed_path)) { |config| config.strict.noblanks }
  rescue => e
    puts [feed_path, e.message, *e.backtrace].join("\n")
  end
end

desc "Setup production server"
task :setup do
  sh 'ssh-add'

  root 'ufw allow ssh'
  root 'ufw allow http'
  root 'ufw allow https'
  root 'ufw allow smtp'
  root 'ufw enable'

  root 'apt update'

  root 'adduser kill-the-newsletter'
  root 'adduser kill-the-newsletter sudo'
  root 'rsync -av --chown kill-the-newsletter:kill-the-newsletter ~/.ssh ~kill-the-newsletter'

  user 'git clone git@github.com:leafac/www.kill-the-newsletter.com.git'

  root 'apt install --yes build-essential curl file git'
  user 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"'
  user 'echo "eval \"\$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)\"" >> ~/.bashrc'
  user_with_environment "brew bundle || true"

  root 'apt install --yes zlib1g-dev'
  user 'echo "eval \"\$(rbenv init -)\"" >> ~/.bashrc'
  user_with_environment "rbenv install $(< .ruby-version)"
  user_with_environment "bundle install"

  root 'setcap cap_net_bind_service=+ep $(realpath /home/linuxbrew/.linuxbrew/bin/caddy)'
end

desc "Deploy"
task :deploy do
  sh 'ssh-add'

  root 'systemctl stop server caddy exim || true'

  user_with_environment "git pull origin master"
  
  user_with_environment "brew bundle || true"
  user_with_environment "bundle install"

  root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.conf /home/linuxbrew/.linuxbrew/etc/exim.conf'

  root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/server.service /etc/systemd/system/server.service'
  root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/caddy.service /etc/systemd/system/caddy.service'
  root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.service /etc/systemd/system/exim.service'

  root 'systemctl daemon-reload'
  root 'systemctl start server caddy exim'
  root 'systemctl enable server caddy exim'
end

def root(command) sh "ssh -tA root@kill-the-newsletter.com '#{command}'" end
def user(command) sh "ssh -tA kill-the-newsletter@kill-the-newsletter.com '#{command}'" end
def user_with_environment(command) user "cd www.kill-the-newsletter.com && bash -ic \"#{command}\"" end
