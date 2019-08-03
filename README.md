[![Build Status](https://travis-ci.com/leafac/www.kill-the-newsletter.com.svg?branch=master)](https://travis-ci.com/leafac/www.kill-the-newsletter.com)

<img alt="Kill the Newsletter!" src="public/logo.png" width="300">

Convert email newsletters into Atom feeds

https://www.kill-the-newsletter.com

https://github.com/leafac/www.kill-the-newsletter.com

**Kill the Newsletter!** is composed of two [Ruby](https://www.ruby-lang.org/en/) programs:

- **[Server](server.rb):** A [Sinatra](http://sinatrarb.com) application which serves the main website and creates feeds.
- **[Mail Handler](mail_handler.rb):** A script which is invoked by [Exim](https://www.exim.org) to receive an mail through a pipe and update a feed.

The feeds are simply stored as text files.

**Kill the Newsletter!** runs on:

- **Host:** [DigitalOcean](https://www.digitalocean.com). (It wouldn’t be possible to host **Kill the Newsletter!** on [Heroku](https://www.heroku.com/) because it depends on the file system.)
- **Domain & DNS:** [Namecheap](https://www.namecheap.com).
- **Continuous Integration Server:** [Travis CI](https://www.travis-ci.com).
- **Operating System:** [Ubuntu](https://www.ubuntu.com).
- **Process Manager:** [systemd](https://www.freedesktop.org/wiki/Software/systemd/).
- **Web Server:** [Thin](https://github.com/macournoyer/thin).
- **Reverse Proxy:** [Caddy](https://caddyserver.com).
- **Mail Server:** [Exim](https://www.exim.org).
- **Package Managers:** [Homebrew](https://brew.sh) & [Bundler](https://bundler.io).

Refer to `Rakefile` for server setup and deployment.
