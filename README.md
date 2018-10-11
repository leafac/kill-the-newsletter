Kill the Newsletter!
====================

![](envelope-to-feed.svg)

Convert email newsletters into Atom feeds

https://www.kill-the-newsletter.com

|||
|-|-|
| Version | [0.0.4](CHANGELOG.md#004---2018-10-11) |
| Documentation | [GitHub](https://github.com/leafac/kill-the-newsletter#readme) |
| License | [GNU General Public License Version 3](https://gnu.org/licenses/gpl-3.0.txt) |
| Code of Conduct | [Contributor Covenant v1.4.0](http://contributor-covenant.org/version/1/4/) |
| Source | [GitHub](https://github.com/leafac/kill-the-newsletter) |
| Bug Reports | [GitHub Issues](https://github.com/leafac/kill-the-newsletter/issues) |
| Contributions | [GitHub Pull Requests](https://github.com/leafac/kill-the-newsletter/pulls) |
| Author | [Leandro Facchinetti](https://www.leafac.com) |

Setup
-----

Install [Go](https://golang.org), [Caddy](https://caddyserver.com), and the dependencies:

```console
$ go get github.com/jhillyerd/enmime github.com/mhale/smtpd
```

Development
-----------

Start Caddy:

```console
$ caddy
```

Visit http://localhost:8000.

Create inboxes and send emails to them, for example:

```console
$ curl smtp://localhost:2525 --mail-from publisher@example.com --mail-rcpt <token>@localhost --upload-file email.example.txt
```

Deployment
----------

It is not possible to deploy **Kill the Newsletter!** to [Heroku](https://www.heroku.com/) because it depends on the file system. We recommend a [DigitalOcean](https://www.digitalocean.com) Droplet running [Ubuntu](https://www.ubuntu.com).

```console
$ wget 'https://dl.google.com/go/go1.11.1.linux-amd64.tar.gz'
$ tar xvzf go1.11.1.linux-amd64.tar.gz
$ wget 'https://caddyserver.com/download/linux/amd64?plugins=hook.service,http.git&license=personal&telemetry=on' -O caddy.tar.gz
$ mkdir caddy && tar xvzf caddy.tar.gz -C caddy
```

```console
$ caddy -service install -agree -email <email@example.com> -conf Caddyfile.production
```

Settings
--------

Configure **Kill the Newsletter!** with a file named `kill-the-newsletter.json`. See `kill-the-newsletter.example.json` for an example of `kill-the-newsletter.json` that runs in production. The following are the available settings:

| Key | Default | Description |
|-|-|-|
| `Name` | `"Kill the Newsletter!"` | Service name |
| `Administrator` | `mailto:administrator@example.com` | System administrator contact |
| `Web.Server` | `":8080"` | Network address on which the web server listens |
| `Web.URL` | `"http://localhost:8000"` | Base URL for links |
| `Web.URIs.Root` | `"/"` | Root URI |
| `Web.URIs.Feeds` | `"/feeds/"` | URI under which to find the feeds |
| `Email.Server` | `":2525"` | Network address on which the email server listens |
| `Email.Host` | `"localhost"` | Host for which the application accepts emails |
| `Feed.NameSizeLimit` | `500` | Maximum size for a feed name |
| `Feed.Path` | `"./feeds/"` | Filesystem path in which to store the feeds as files |
| `Feed.Suffix` | `".xml"` | Suffix to use for feeds files |
| `Feed.URN` | `"localhost"` | URN to use when creating identifiers for feeds and entries |
| `Feed.SizeLimit` | `500000` | Maximum size (in bytes) for feeds |
| `Token.Length` | `20` | Length of the tokens that identify feeds |
| `Token.Characters` | `"abcdefghijklmnopqrstuvwxyz0123456789"` | Characters that form the tokens that identify feeds |
