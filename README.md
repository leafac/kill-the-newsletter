<h1 align="center"><a href="https://kill-the-newsletter.com">Kill the Newsletter!</a></h1>
<h3 align="center">Convert email newsletters into Atom feeds</h3>
<p align="center">
<a href="https://github.com/leafac/kill-the-newsletter.com"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/kill-the-newsletter"><img alt="Package" src="https://badge.fury.io/js/kill-the-newsletter.svg"></a>
<a href="https://github.com/leafac/kill-the-newsletter.com/actions"><img src="https://github.com/leafac/kill-the-newsletter.com/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

<h2 align="center">Support</h2>
<h3 align="center">
<a href="https://patreon.com/leafac">Patreon (recurring)</a> ·
<a href="https://paypal.me/LeandroFacchinetti">PayPal (one-time)</a>
</h3>

### Videos

- [How to Deploy Kill the Newsletter! (and other Node.js Applications)](https://youtu.be/507WU47x8HI)
- [A code review from an older version](https://youtu.be/FMTb3Z-QiPY)

### Use the Hosted Version

The simplest way to use Kill the Newsletter! is with the hosted version at <https://kill-the-newsletter.com>.

Kill the Newsletter! is and will always be free; you don’t have to create an account; and I don’t collect your data or share it with anyone.

### Self-Host

You may run Kill the Newsletter! on your own servers if you wish. This guarantees the utmost privacy, and it’s also a fun system adminstration project. Kill the Newsletter! strikes a good balance between being relatively easy to self-host and being non-trivial at the same time, because it is a web application as well as an email server.

#### Test on Your Machine

The best way to start self-hosting is to test Kill the Newsletter! on your machine. You can’t really use Kill the Newsletter! if it’s running on your machine because Kill the Newsletter!’s email server must be accessible from the internet to receive email and most likely your internet service provider blocks this kind of connection to prevent spam. Still, this is a good first step to get your feet wet by downloading and running Kill the Newsletter! for the first time.

Download the [latest release](https://github.com/leafac/kill-the-newsletter/releases/latest) and give it a try. You may send test emails using [curl](https://curl.se) by creating a file like the following:

`email.txt`

```
From: Publisher <publisher@example.com>
To: ru9rmeebswmcy7wx@localhost
Subject: Test email with HTML
Date: Sat, 13 Mar 2021 11:30:40

<p>Some HTML</p>
```

And then running the following command:

```
$ curl smtp://localhost:2525 --mail-from publisher@example.com --mail-rcpt ru9rmeebswmcy7wx@localhost --upload-file email.txt
```

Remember to change the `ru9rmeebswmcy7wx` in the example above to the appropriate email address for your Kill the Newsletter! test inbox.

#### Pre-Requisites

To install Kill the Newsletter! on your own server you’ll need:

1. A domain (for example, `kill-the-newsletter.com`). I buy domains at [Namecheap](https://www.namecheap.com).
2. A DNS server. I use the DNS server that comes with the domain I bought at Namecheap (and they even provide free DNS service for domains bought elsewhere).
3. A server. I rent a $6/month [DigitalOcean](https://www.digitalocean.com) droplet created with the following configuration:

   |                        |                                                                      |
   | ---------------------- | -------------------------------------------------------------------- |
   | **Distributions**      | Ubuntu 20.04 (LTS)                                                   |
   | **Plan**               | Share CPU · Regular Intel · $5/mo                                    |
   | **Datacenter region**  | I use New York 1, but you should use whatever is closest to you      |
   | **Additional options** | IPv6 & Monitoring                                                    |
   | **Authentication**     | SSH keys                                                             |
   | **Hostname**           | Your domain, for example, `kill-the-newsletter.com`                  |
   | **Backups**            | Enabled (that’s what makes the $5/month plan actually cost $6/month) |

   I also like to assign the droplet a **Floating IP** because it allows me to destroy and create droplets without having to change the DNS and wait for the DNS propagation to happen.

   This is the cheapest DigitalOcean offering, and yet it has managed Kill the Newsletter!’s traffic for years, even when it occasionally receives extra attention, for example, when it makes the front page of HackerNews.

#### DNS Configuration

This is where you associate domains to servers. For example, you associate `kill-the-newsletter.com` to the DigitalOcean droplet on which Kill the Newsletter! runs.

| Type    | Host  | Value                                               |
| ------- | ----- | --------------------------------------------------- |
| `A`     | `@`   | The (Floating) IP address of the server             |
| `Alias` | `www` | Your domain, for example, `kill-the-newsletter.com` |
| `MX`    | `@`   | Your domain, for example, `kill-the-newsletter.com` |

#### Download Kill the Newsletter!

SSH into the server and download Kill the Newsletter!:

```console
[your machine] $ ssh root@kill-the-newsletter.com
[the server] # mkdir kill-the-newsletter && cd kill-the-newsletter
[the server] # curl -O https://github.com/leafac/kill-the-newsletter/releases/download/<version>/kill-the-newsletter--linux--<version>.tgz
[the server] # tar -xzf kill-the-newsletter--linux--<version>.tgz
```

#### Create `configuration.js`

You may adapt [`deployment-example/configuration.js`](deployment-example/configuration.js), which is the configuration running at `https://kill-the-newsletter.com`. In particular, you must change the following lines:

```javascript
// ...

webApplication.set("url", "https://kill-the-newsletter.com");
webApplication.set("email", "smtp://kill-the-newsletter.com");
webApplication.set("administrator", "mailto:kill-the-newsletter@leafac.com");

// ...

domains: ["kill-the-newsletter.com", "www.kill-the-newsletter.com"],

// ...
```

#### Try Running the Server

At this point you’re ready to run Kill the Newsletter! for real:

```console
[the server] # ./kill-the-newsletter configuration.js
```

Kill the Newsletter! starts a web server and an email server. They include everything you need to run securely in production, including support for HTTPS.

<details>
<summary>Isn’t running the service as <code>root</code> a bad idea?</summary>

This practice is frowned upon, but it may be okay in some cases (that’s how I’ve been running `https://kill-the-newsletter.com` for years). If the only thing of value on a machine is Kill the Newsletter!, then what would you be protecting by running the service as a unprivileged user? The most important things is the data, but that should be accessible from the unprivileged user anyway. I prefer to treat the machine as disposable and run the service as `root`—it’s as simple as it gets.

</details>

#### Install Kill the Newsletter! as a [systemd](https://systemd.io) Service

This ensures that Kill the Newsletter! is always running. If it hits an error and halts, systemd restarts it. If the machine reboots, systemd starts Kill the Newsletter! again.

First, stop the server you ran in the previous step.

Then, create a file at `/etc/systemd/system/kill-the-newsletter.service` with the contents from [`deployment-example/kill-the-newsletter.service`](deployment-example/kill-the-newsletter.service).

Finally, run the following commands:

```console
[the server] # systemctl daemon-reload
[the server] # systemctl enable kill-the-newsletter
[the server] # systemctl restart kill-the-newsletter
```

You may log out of the server and start enjoying your own Kill the Newsletter! installation.

#### Maintenance

All the data is stored under the `data` directory as a [SQLite](https://sqlite.org) database. If you every have to migrate to a different server, just take the `data` directory with you.

To update, just download and extract a newer [release](https://github.com/leafac/kill-the-newsletter/releases), and then restart the service with the following command:

```console
[the server] # systemctl restart kill-the-newsletter
```

### Advanced

#### Other Operating Systems

The guide above covers the basics of running Kill the Newsletter! on a Linux server, which is the most common way of deploying web services, but there are executables for Windows and macOS as well. The process is similar up to the point of installing Kill the Newsletter! as a systemd service, because other operating systems use other process managers.

#### Other Configuration

The `configuration.js` file is a JavaScript module that must return a function to be called by the `kill-the-newsletter` executable. Typically this configuration will start the servers (web and email) for Kill the Newsletter!, but it may do anything you wish. The `kill-the-newsletter` executable simply calls the `configuration.js` file and passes a [`require()`](https://nodejs.org/dist/latest/docs/api/modules.html#modules_require_id) function from the perspective of Kill the Newsletter! itself. You may `require(".")` to get a hold of the `killTheNewsletter()` function, which produces the `webApplication` and the `emailApplication`. You may also `require()` any of the Kill the Newsletter! production dependencies listed in [`package.json`](package.json).

#### Migration

If you installed Kill the Newsletter! before 2021-03-18 then you need to start from scratch because the deployment process changed (it’s **much** simpler now!). You may migrate existing feeds with the migration tools found in the [v1.0.1 release](https://github.com/leafac/kill-the-newsletter/releases/tag/v1.0.1) or the [`migration` tag](https://github.com/leafac/kill-the-newsletter/tree/migration). Just make a backup of your `feeds/` directory, download the migration executable, and run it from the directory containing `feeds/`. It’ll produce a `data/` directory with the data in the new format.

#### Using the [`kill-the-newsletter` npm Package](https://npm.im/kill-the-newsletter)

For people familiar with TypeScript/JavaScript, Kill the Newsletter! is also distributed as an npm package. You may run it with `npx kill-the-newsletter`, or `npm install kill-the-newsletter` into your project to `import` or `require` it and mount it as part of a bigger [Express](http://expressjs.com) application.
