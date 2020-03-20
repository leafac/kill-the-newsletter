import child_process from "child_process";

switch (process.argv[2]) {
  case "provision":
    child_process.execSync(`ssh-add`);

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
    execInFolder(`npm ci`);
    // TODO: rsync
    // TODO: $ pm2 startup OR $ pm2 save
    // TODO: $ pm2 start env.js --watch --ignore-watch="node_modules"
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
  exec(`cd www.kill-the-newsletter.com && env NODE_ENV=production ${command}`);
}

// - run: |
//     mkdir ~/.ssh
//     echo "${{ secrets.SECRET_PRIVATE_DEPLOY_KEY }}" > ~/.ssh/id_rsa
//     chmod 600 ~/.ssh/id_rsa

// https://github.com/webfactory/ssh-agent

// root 'apt-get install -y curl file git'
