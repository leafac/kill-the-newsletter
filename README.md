Kill the Newsletter!
====================

Convert email newsletters into Atom feeds.

https://www.kill-the-newsletter.com

|||
|-|-|
| Version | [0.0.3](#0.0.3) |
| Documentation | [GitHub](https://github.com/leafac/kill-the-newsletter#readme) |
| License | [GNU General Public License Version 3](https://gnu.org/licenses/gpl-3.0.txt) |
| Code of Conduct | [Contributor Covenant v1.4.0](http://contributor-covenant.org/version/1/4/) |
| Source | [GitHub](https://github.com/leafac/kill-the-newsletter) |
| Bug Reports | [GitHub Issues](https://github.com/leafac/kill-the-newsletter/issues) |
| Contributions | [GitHub Pull Requests](https://github.com/leafac/kill-the-newsletter/pulls) |
| Author | [Leandro Facchinetti](https://www.leafac.com) |

Configuration
-------------

| Environment Variable | Description | Example | Default Value | Required |
|-|-|-|-|-|
| `B2_ACCOUNT_ID` | Backblaze B2 Cloud Storage Account ID | `b59189777aec` | | ✓ |
| `B2_APPLICATION_KEY` | Backblaze B2 Cloud Storage Application Key | `5dc69b45c8661d6de1c52f45766e989638d7157179` | | ✓ |
| `B2_BUCKET` | Backblaze B2 Cloud Storage Bucket | `kill-the-newsletter` | | ✓ |
| `NAME` | Display name | | `Kill the Newsletter!` | |
| `URL` | Service URL | `https://www.kill-the-newsletter.com` | `http://localhost:5000` | |
| `EMAIL_DOMAIN` | Domain to receive emails | `kill-the-newsletter.com` | `localhost` | |
| `URN` | URN used in feeds ids | | `kill-the-newsletter` | |
| `ADMINISTRATOR_EMAIL` | Email address for support requests | `administrator@example.com` | `kill-the-newsletter@leafac.com` | |

* * *

```shell
$ curl --request POST \
       --url http://localhost:5000/email \
       --form 'from=GLaDOS <glados@example.com>' \
       --form 'envelope={"to":["cfni8kcr4oqalfwgechq@localhost"]}' \
       --form 'subject=Come to the party' \
       --form 'text=There will be cake' \
       --form 'html=There will be <em>cake</em>'
```
