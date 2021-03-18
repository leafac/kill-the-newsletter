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

# [Watch the Code Review!](https://youtu.be/FMTb3Z-QiPY)

### Use the Hosted Version

The simplest way to use Kill the Newsletter! is with the hosted version at <https://kill-the-newsletter.com>.

The service is and will always be free; you don’t have to create an account; and I don’t collect your data or share it with anyone.

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

(Remember to change the `ru9rmeebswmcy7wx` in the example above to the appropriate email address for your Kill the Newsletter! test inbox.)

#### Pre-Requisites

To install Kill the Newsletter! on your own server you’ll need:

1. A domain (for example, `kill-the-newsletter.com`). I use [Namecheap](https://www.namecheap.com) to buy domains.
2. A DNS server. I use the DNS server that comes with the domain I bought at Namecheap (and they even provide free DNS service for domains bought elsewhere).
3. A server. I rent a $6/month DigitalOcean droplet created with the following configurations:

   |                        |                                                                      |
   | ---------------------- | -------------------------------------------------------------------- |
   | **Distributions**      | Ubuntu 20.04 (LTS)                                                   |
   | **Plan**               | Share CPU · Regular Intel · $5/mo                                    |
   | **Datacenter region**  | Whatever is closest to you—I use New York 1.                         |
   | **Additional options** | IPv6 & Monitoring                                                    |
   | **Authentication**     | SSH keys                                                             |
   | **Hostname**           | Your domain, for example, `kill-the-newsletter.com`.                 |
   | **Backups**            | Enabled (that’s what makes the $5/month plan actually cost $6/month) |

   I also like to assign the droplet a **Floating IP** because it allows me to destroy and create a new droplet without having to change the DNS and wait for the DNS propagation to happen.

   This is the cheapest DigitalOcean offering, and yet it has managed Kill the Newsletter!’s traffic for years, even when it occasionally receives extra attention, for example, when it makes the front page of HackerNews.

---

8. Configure the DNS in Namecheap:

   | Type    | Host  | Value                                                   |
   | ------- | ----- | ------------------------------------------------------- |
   | `A`     | `@`   | `<FLOATING IP>`                                         |
   | `CNAME` | `www` | `<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>` |
   | `MX`    | `@`   | `<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>` |

9. Configure the deployment on [`package.json`](package.json), particularly under the following keys:

   - `apps.env.BASE_URL`.
   - `apps.env.EMAIL_DOMAIN`.
   - `apps.env.ISSUE_REPORT`.
   - `deploy.production.host`.
   - `deploy.production.repo`.

10. Configure [Caddy](https://caddyserver.com), the reverse proxy, on [`Caddyfile`](Caddyfile).

11. Setup the server:

    ```console
    $ ssh-add
    $ npm run deploy:setup
    ```

12. Migrate the existing feeds (if any):

    ```console
    $ ssh-add
    $ ssh -A root@<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>
    root@<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”> $ rsync -av <path-to-previous-feeds> /root/kill-the-newsletter.com/current/static/feeds/
    root@<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”> $ rsync -av <path-to-previous-alternate> /root/kill-the-newsletter.com/current/static/alternate/
    ```

13. Push to your fork, which will trigger the GitHub Action that deploys the code and starts the server.

# Run Locally

Install [Node.js](https://nodejs.org/) and run:

```console
$ npm install
$ npm run develop
```

The web server will be running at `http://localhost:8000` and the email server at `smtp://localhost:2525`.

# Run Tests

Install [Node.js](https://nodejs.org/) and run:

```console
$ npm install-test
```

# Docker Support (Experimental)

Install [Docker](https://www.docker.com/) and run:

```console
$ docker build -t kill-the-newsletter .
$ docker run kill-the-newsletter
```

The web server will be running at `http://localhost:8000` and the email server at `smtp://localhost:2525`.

For use in production, start with the example [`Dockerfile`](Dockerfile).
