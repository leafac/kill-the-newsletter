<div align="center">
<h1><a href="https://www.kill-the-newsletter.com">Kill the Newsletter!</a></h1>
<p><strong>Convert email newsletters into Atom feeds</strong></p>
<p><img alt="Convert email newsletters into Atom feeds" src="static/logo.png" width="150" /></p>
<p>
<a href="https://github.com/leafac/www.kill-the-newsletter.com">
<img alt="Source" src="https://img.shields.io/badge/Source---" />
</a>
<a href="https://github.com/leafac/www.kill-the-newsletter.com/actions">
<img alt=".github/workflows/main.yml" src="https://github.com/leafac/www.kill-the-newsletter.com/workflows/.github/workflows/main.yml/badge.svg" />
</a>
</p>
</div>

# Running Locally

Install [Node.js](https://nodejs.org/) and run:

```console
$ npm install
$ npm start
```

The web server will be running at `http://localhost:8000` and the email server at `smtp://localhost:2525`.

# Deployment

1. Create a deployment SSH key pair:

   ```console
   $ ssh-keygen
   ```

2. Add the public key (`id_rsa.pub`) to DigitalOcean and to GitHub as a **Deploy key** for the repository.

3. Add the private key (`id_rsa`) to GitHub as a **Secret** called `SSH_PRIVATE_KEY`.

4. Create a DigitalOcean droplet.

5. Configure DNS:

   | Type    | Host  | Value                     |
   | ------- | ----- | ------------------------- |
   | `A`     | `@`   | `<droplet-ip>`            |
   | `CNAME` | `www` | `kill-the-newsletter.com` |
   | `MX`    | `@`   | `kill-the-newsletter.com` |

6. Setup the server:

   ```console
   $ npx pm2 deploy package.json production setup
   ```

7. Push to GitHub, which will trigger the Action that deploys the code and starts the server.
