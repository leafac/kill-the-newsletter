# TODO

- Provide a link that reads “this newsletter already has an Atom feed to which you could subscribe directly instead of using Kill the Newsletter!”. To do that, parse the email coming in with LinkeDOM and look for `<link rel="alternate" type="application/atom+xml" href="/feed.xml">` (email from dynomight)
- Use different `publicId`s for the email address and the feed address https://github.com/leafac/kill-the-newsletter/issues/114
- Get the `from` email address from somewhere else? https://github.com/leafac/kill-the-newsletter/issues/102
- Reduce bandwidth
  - Enable cache HTTP header.
  - Setup Cloudflare.
- Document that you need to setup a MX record in the DNS to receive email.
