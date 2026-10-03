# Kill The Newsletter Deployment

> **Note:** this guide assumes that the reader is setting up Kill The Newsletter on a VPS, where the reader wants to minimize the use of `root`. But for a fully-single-use VPS is this really necessary? I don't know enough about sysadmin norms to have an informed opinion on this. Of course the other option is just to run Kill The Newsletter inside Docker or similar, which would make user privileges more of a moot point.

## First-Time Setup

### 1. Create a VPS

> **Note:** I gather that the first-party instance of Kill The Newsletter uses something called "Caddy", but I'm not familiar with that, so this guide assumes a bare-metal VPS.

e.g. on DigitalOcean.

> **Todo:** For particular VPS hosting services we could automate things further with things like [the DigitalOcean command-line interface](https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/).

You can start with the least expensive option; Ubuntu LTS is probably the most widely supported. As a hostname you can use something like `newsletters.mydomain.com`. The planned hostname should be the name of the droplet so that the droplet will be aware of its own hostname.

For security you should generate an SSH key to use rather than a password-based login.

> **Todo:** add instructions for how to generate an SSH key. But if we assume the reader knows what a terminal emulator is in the first place is this really necessary?

### 2. Create DNS records

Using, e.g., Mail-in-a-Box, create a DNS A record for, e.g., `newsletters.mydomain.com` and point it to the IP address of the VPS you just created.

Then, create DNS MX record pointing to that subdomain, e.g. `newsletters.mydomain.com` with the value `1 newsletters.mydomain.com.` (note the trailing period).

(I could probably figure out how to do this from the command line using `curl`.)

Using `curl` would be easiest if it were interactive (for the various user values):

```sh
read -p "Enter Mail-in-a-Box URL (including 'https://', e.g. 'https://box.mydomain.com'): " -a ADMIN_URL
read -p "Enter Mail-in-a-Box admin login email (e.g. 'me@mydomain.com'): " -a ADMIN_EMAIL
read -p "Enter login password for $ADMIN_EMAIL on $ADMIN_URL: " -sa ADMIN_PASSWORD
read -p "Enter desired Kill The Newsletter domain (excluding 'https://', e.g. 'newsletters.mydomain.com'): " -a $KTN_DOMAIN
curl -X POST -d "some text here" --user $ADMIN_EMAIL:$ADMIN_PASSWORD $ADMIN_URL/admin/dns/custom/$KTN_DOMAIN
curl -X POST -d "1 $KTN_DOMAIN." --user $ADMIN_EMAIL:$ADMIN_PASSWORD $ADMIN_URL/admin/dns/custom/$KTN_DOMAIN/mx
```

> **Todo:** This should probably include a check to see if the Mail-in-a-Box domain actually manages the desired Kill The Newsletter domain, as well as some sort of logic to include or exclude the `https://` automatically.

> **Todo:** I can't remember if I've fully tested the command-line stuff for Mail-in-a-Box.

### 3. Log into the VPS

In your terminal emulator, ssh as follows:

```sh
ssh root@newsletters.mydomain.com
```

You will be prompted to accept the fingerprint of the host; type "yes" to proceed.

### Configure System Updates

> **Todo:** add instructions here about how to set up a `cron` job to run `apt update && apt upgrade -y && apt autoremove` at regular intervals.

To configure automate system updates, edit your `crontab`:

```sh
crontab -e
```

Choose `nano` unless you have a preference otherwise.

Scroll to the bottom of the file and add the following text:

```sh
apt update && apt upgrade -y && apt autoremove && reboot
```

Type Ctrl-O then Ctrl-X to save and exit. (Note that on macOS this is still the Control key, not the Command key.)

### 4. Create a non-root user account

> **Todo:** The interactive aspects of this could be moved to later on so that the initial setup can be non-interactive and can done using a [startup script](https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/).

In addition to the security considerations we are also using the non-root account to store certain configuration variables:

* Full Name []: I think we will use this somewhere
* Other []: the administrative email address for your deployment. (This should be a real email address, since it will be used for Let's Encrypt.)

Use the following series of commands to create a non-root user account with the the above variables:

> **Fixme:** double-check that I'm correctly commenting out the space in the real name.

```sh
read -p "Enter real name: " -a REALNAME
read -p "Enter administrative email: " -a ADMIN_EMAIL
read -p "Enter username: " -a USERNAME
echo # for newline
adduser --quiet $USERNAME --comment '$REALNAME,,,,$ADMIN_EMAIL'
usermod -aG sudo $USERNAME
rsync --archive --chown=$USERNAME:$USERNAME ~/.ssh /home/$USERNAME
```

When prompted for a username, use something like `newsletters` or `kill-the-newsletter`.

> **Todo:** maybe just choose the username as part of the script?

You should use a strong password. You can generate a strong password with a tool like [PassGen on GitHub](https://passwords-generator.github.io/) and save that password in your password manager of choice.

### 5. Disable root SSH access

Use the following commands to disable root login and password authentication for SSH:

```sh
sed -i "/PermitRootLogin /c\PermitRootLogin no" /etc/ssh/sshd_config
```

```sh
sed -i "/#PasswordAuthentication /c\PasswordAuthentication no" /etc/ssh/sshd_config
```

```sh
sed -i "/#PubkeyAuthentication /c\PubkeyAuthentication yes" /etc/ssh/sshd_config
```

> **Todo:** using `sed` is particularly janky with `sshd_config`, so it may be preferable to use [a higher-level tool](https://superuser.com/questions/759481/ssh-how-to-change-value-in-config-file-in-one-command).

Restart `sshd` to apply these changes:

```sh
systemctl restart ssh
```

You should now be able to SSH into the server using this username.

To test this, open a new terminal window (without closing the first one) and SSH in as follows:

```sh
ssh newsletters@newsletters.mydomain.com
```

If you are able to log in with this, great! If not, you should review the previous steps to correct any problems using the first terminal window from before and try again until you succeed, as you will not be able to reconnect using `root` at this point.

(Worst case scenario you can delete your VPS and create a new one. Changing the login method is the very first thing you should do with a new server, so that you won't lose any other work if you mess things up.)

End the SSH session as follows:

```sh
exit
```

And try logging back in with the `root` login:

```sh
ssh root@newsletters.mydomain.com
```

If everything is correct, this login should fail.

If the login fails, you can close the first terminal window and continue on the second one from before.

> **Note:** now that you are no longer using `root`, many commands will now have to be prepended with `sudo`, e.g. `sudo foobar`, and you will have to enter your password (from before) in order to proceed.

### 6. Set up a firewall

> **Todo:** I don't know what ports are needed for Kill The Newsletter, so this will have to be fleshed out later.

To enable the firewall, permitting only SSH, use the following:

```sh
sudo ufw allow OpenSSH && sudo ufw enable && sudo ufw status
```

This should show you that the firewall is enabled and that it permits only SSH.

To add HTTP access (for the web server), use the following command:

```sh
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw status
```

This should show you that `80/tcp` and `443/tcp` have been added to the permitted list.

Kill The Newsletter may need other ports, so for the time being disable the firewall, as we will return to it later.

```sh
sudo ufw disable && sudo ufw status
```

### 7. Certbot

Install Let's Encypt as follows:

```sh
sudo apt install certbot -y
```

Run `certbot` as follows:

```sh
sudo certbot certonly \
    --non-interactive \
    --agree-tos \
    --no-eff-email \
    --no-redirect \
    --standalone \
    --email "$(eval "getent passwd $UID | cut -d: -f5 | cut -d, -f5")" \
    --domains $(eval "hostname -f")
```

> **Todo:** I need to add automatic certificate renewals to this.

### 8. Download and install Kill The Newsletter

In a web browser, open [the Releases page](https://github.com/leafac/kill-the-newsletter/releases) for Kill The Computer.

Find the release you would like to use (probably just the [latest](https://github.com/leafac/kill-the-newsletter/releases/latest)); expand the "Assets" header, right-click the download link for `kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz`, and copy the URL to your clipboard.

> **Todo:** It would be nice if there were some more clever way of dealing with releases, but the way to do this would probably be for a setup script on the repository to be aware of what version it's installing, so that Kill The Newsletter could be installed using `curl <url> | sudo` the way Mail-in-a-Box is.

Back in your terminal emulator, download the release with the commend `wget` followed by the download URL pasted from your clipboard, e.g.:

```sh
wget https://github.com/leafac/kill-the-newsletter/releases/download/vX.Y.Z/kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

Once the file is downloaded, expand it as follows:

```sh
tar -xzf kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

And delete the archive:

```sh
rm kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

Use the commnd `ls` to list the contents of the current directory; it should show only the subdirectory `kill-the-newsletter`, as follows:

```sh
$ ls
kill-the-newsletter
```

I'm not sure why we need to do this, but install `libatomic`:

```sh
sudo apt install libatomic1 -y
```

I didn't need to do this the first time I did this setup process, so maybe it's because I was trying to run Kill The Newsletter as a user other than `root`?

### Configuration

Copy the configuration file as follows:

```sh
cp ./kill-the-newsletter/_/configuration/example.mjs configuration.mjs
```

We will be using `sed` to change key values in the configuration file.

To change the hostname:

```sh
sed -i "/hostname/c\  \"hostname\" : \"$(eval "hostname -f")\"," configuration.mjs
```

The administrator email:

```sh
sed -i "/systemAdministratorEmail/c\  systemAdministratorEmail : \"$(eval "getent passwd $UID | cut -d: -f5 | cut -d, -f5")\"," configuration.mjs
```

And the paths to the new certificate and key from before:

```sh
sed -i "/key:/c\    key : \"/etc/letsencrypt/live/$(eval "hostname -f")/privkey.pem\"," configuration.mjs
```

This second one doesn't work because there's a random line break, but let's pretend it does.

First, remove the line break following `certificate :` in `configuration.mjs` using `nano`, then:

```sh
sed -i "/certificate:/c\    certificate : \"/etc/letsencrypt/live/$(eval "hostname -f")/fullchain.pem\"," configuration.mjs
```

To change the data directory:

```sh
sed -i "/\/\/ dataDirectory/c\  dataDirectory : \"\/home\/$(eval "whoami")\/data\/\"," configuration.mjs
```

To check that the values are correct, print `configuration.mjs` to the terminal:

```sh
cat configuration.mjs
```

The values should now match the values you need.

> **Todo:** if the configuration were stored in a vanilla JSON file it would allow us to set variables using [`sde`](https://github.com/dvershinin/sde) instead of `sed`, which would just be a lot less janky. Other options include YAML or TOML.

### Systemd Service

Copy the Systemd `service` file as follows:

```sh
sudo cp ./kill-the-newsletter/_/configuration/kill-the-newsletter.service /etc/systemd/system/kill-the-newsletter.service
```

Change whichever configuration options in `kill-the-newsletter.service`:

<!--```sh
sudo sed -i "/ExecStart/c\ExecStart=$HOME/kill-the-newsletter/kill-the-newsletter configuration.mjs" /etc/systemd/system/kill-the-newsletter.service
```-->

```sh
sudo sed -i "/ExecStart/c\ExecStart=/home/$(eval "whoami")/kill-the-newsletter/kill-the-newsletter /home/$(eval "whoami")/configuration.mjs" /etc/systemd/system/kill-the-newsletter.service
```

<!--```sh
sudo sed -i "/WorkingDirectory/c\WorkingDirectory=$HOME" /etc/systemd/system/kill-the-newsletter.service
```-->

```sh
sudo sed -i "/WorkingDirectory/c\WorkingDirectory=/home/$(eval "whoami")" /etc/systemd/system/kill-the-newsletter.service
```

> **Note:** It currently isn't possible to run the service as `newsletters` rather than `root`, since it seems to require root access to listen at `0.0.0.0` port `25`. This permission could probably be granted by the service configuration, but I don't know how.

<!--We can change the user for the service to be `newsletters` rather than `root`, but then the application can't access the Let's Encypt files.

```sh
sudo sed -i "/User/c\User=$(eval "whoami")" /etc/systemd/system/kill-the-newsletter.service
```

We can change the owner group of the Let's Encrypt files to `sudo`:

```sh
sudo chgrp -R sudo /etc/letsencrypt
```

And allow the group to read and write:

```sh
sudo chmod -R 755 /etc/letsencrypt
```-->

Reload Systemd service definitions:

```sh
sudo systemctl daemon-reload
```

Enable and start Kill The Newsletter:

```sh
sudo systemctl start kill-the-newsletter
sudo systemctl enable kill-the-newsletter
```

Check that the Systemd service is running (i.e. that it didn't crash):

```sh
sudo systemctl status kill-the-newsletter
```

### Test

In a web browser, visit `newsletters.mydomain.com`.

If the web interface loads, great!

Create a new feed called "testfeed" (or something like that).

Copy the email address for that feed, paste it as the recipient of an email with dummy text, and send the email.

If the email doesn't immediately bounce, great!

Next, copy the RSS URL for the feed and paste into a command after `curl`, like so:

```sh
curl https://newsletters.mydomain.com/feeds/<randomly_generated_feed_filename>.xml
```

This command will print the raw XML of the feed, and you should see the email you just sent as a post on that feed.

## Updating to a New Version

> **Todo:** as stated above, this would be easiest with a setup script that could be run from `curl`.

Log into your VPS using SSH:

```sh
ssh newsletters@newsletters.mydomain.com
```

In a web browser, open [the Releases page](https://github.com/leafac/kill-the-newsletter/releases) for Kill The Computer.

Find the release you would like to use (probably just the [latest](https://github.com/leafac/kill-the-newsletter/releases/latest)); expand the "Assets" header, right-click the download link for `kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz`, and copy the URL to your clipboard.

Back in your terminal emulator, download the release with the commend `wget` followed by the download URL pasted from your clipboard, e.g.:

```sh
wget https://github.com/leafac/kill-the-newsletter/releases/download/vX.Y.Z/kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

Once the file is downloaded, expand it as follows:

```sh
tar -xzf kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

And delete the archive:

```sh
rm kill-the-newsletter--ubuntu--vX.Y.Z.tar.gz
```

Use the commnd `ls` to list the contents of the current directory; it should show only the subdirectory `kill-the-newsletter`, as follows:

```sh
$ ls
kill-the-newsletter
```

> **Todo:** the Radically Straightforward deployment guide recommends that you [do a backup first](https://github.com/radically-straightforward/radically-straightforward/blob/main/guides/deployment.md#backup-and-migration).
