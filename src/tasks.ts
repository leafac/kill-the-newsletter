import child_process from "child_process";

switch (process.argv[2]) {
  case "provision":
    child_process.execSync(`ssh-add`);

    exec(`ufw allow ssh`);
    exec(`ufw allow http`);
    exec(`ufw allow https`);
    exec(`ufw allow smtp`);
    exec(`ufw enable`);

    // https://github.com/nodesource/distributions#debinstall
    // https://certbot.eff.org/docs/install.html
    exec(`apt-get update`);
    exec(`apt-get install -y build-essential software-properties-common`);
    exec(`curl -sL https://deb.nodesource.com/setup_13.x | bash -`);
    exec(`add-apt-repository universe`);
    exec(`add-apt-repository ppa:certbot/certbot`);
    exec(`apt-get install -y nodejs certbot`);

    exec(`git clone git@github.com:leafac/www.kill-the-newsletter.com.git`);
    break;
  case "deploy":
    child_process.execSync(`ssh-add`);

    execInFolder(`git pull origin master`);
    break;
  default:
    console.error(
      `Unknown invocation: ${JSON.stringify(process.argv, undefined, 2)}`
    );
    process.exit(1);
}

function exec(command: string): void {
  console.log("$", command);
  child_process.execFileSync(
    "ssh",
    ["-tA", "root@kill-the-newsletter.com", command],
    { stdio: "inherit" }
  );
}

function execInFolder(command: string): void {
  exec(`cd www.kill-the-newsletter.com && ${command}`);
}

// - run: |
//     mkdir ~/.ssh
//     echo "${{ secrets.SECRET_PRIVATE_DEPLOY_KEY }}" > ~/.ssh/id_rsa
//     chmod 600 ~/.ssh/id_rsa

// https://github.com/webfactory/ssh-agent

// root 'apt-get install -y curl file git'

// desc "Setup production server"
// task :setup do
// end

// desc "Deploy"
// task :deploy do
//   sh 'ssh-add'

//   root 'systemctl stop server caddy exim || true'

//   user_with_environment "git pull origin master"

//   user_with_environment "brew bundle || true"
//   user_with_environment "bundle install"

//   root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.conf /home/linuxbrew/.linuxbrew/etc/exim.conf'

//   root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/server.service /etc/systemd/system/server.service'
//   root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/caddy.service /etc/systemd/system/caddy.service'
//   root 'rsync -av --chown root:root ~kill-the-newsletter/www.kill-the-newsletter.com/exim.service /etc/systemd/system/exim.service'

//   root 'systemctl daemon-reload'
//   root 'systemctl start server caddy exim'
//   root 'systemctl enable server caddy exim'
// end
