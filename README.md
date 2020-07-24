<h1 align="center"><a href="https://www.kill-the-newsletter.com">Kill the Newsletter!</a></h1>
<h3 align="center">Convert email newsletters into Atom feeds</h3>
<p align="center"><img alt="Convert email newsletters into Atom feeds" src="static/logo.svg"></p>
<p align="center">
<a href="https://github.com/leafac/www.kill-the-newsletter.com"><img alt="Source" src="https://img.shields.io/badge/Source---"></a>
<a href="https://github.com/leafac/www.kill-the-newsletter.com/actions"><img alt="Continuous Integration" src="https://github.com/leafac/www.kill-the-newsletter.com/workflows/.github/workflows/main.yml/badge.svg"></a>
</p>

# Deploy Your Own Instance (Self-Host)

1. Create accounts on [GitHub](https://github.com), [Namecheap](https://www.namecheap.com), and [DigitalOcean](https://www.digitalocean.com).

2. [Fork](https://github.com/leafac/www.kill-the-newsletter.com/fork) this repository.

3. Create a deployment SSH key pair:

   ```console
   $ ssh-keygen
   ```

   **Private key (`id_rsa`):** Add to your fork under **Settings > Secrets** as a new secret called `SSH_PRIVATE_KEY`.

   **Public key (`id_rsa.pub`):** Add to your fork under **Settings > Deploy keys** and to your DigitalOcean account under **Account > Security > SSH keys**.

4. Buy a domain on Namecheap.

5. Create a DigitalOcean droplet:

   |                        |                                                         |
   | ---------------------- | ------------------------------------------------------- |
   | **Image**              | Ubuntu 18.04.3 (LTS) x64                                |
   | **Plan**               | Starter Standard \$5/mo                                 |
   | **Additional options** | Monitoring                                              |
   | **Authentication**     | Your Deployment SSH Key                                 |
   | **Hostname**           | `<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>` |
   | **Backups**            | Enable                                                  |

6. Assign the new droplet a **Firewall**:

   |                   |                                                         |           |
   | ----------------- | ------------------------------------------------------- | --------- |
   | **Name**          | `<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>` |           |
   | **Inbound Rules** | ICMP                                                    |           |
   |                   | SSH                                                     | 22        |
   |                   | Custom                                                  | 25 (SMTP) |
   |                   | HTTP                                                    | 80        |
   |                   | HTTPS                                                   | 443       |

7. Assign the new droplet a **Floating IP**.

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
    $ npx pm2 deploy package.json production setup
    ```

12. Migrate the existing feeds (if any):

    ```console
    $ ssh-add
    $ ssh -A root@<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”>
    root@<YOUR DOMAIN, FOR EXAMPLE, “kill-the-newsletter.com”> $ rsync -av <path-to-previous-feeds> /root/www.kill-the-newsletter.com/current/static/feeds/
    ```

13. Push to your fork, which will trigger the GitHub Action that deploys the code and starts the server.

# Run Locally

Install [Node.js](https://nodejs.org/) and run:

```console
$ npm install
$ npm start
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
