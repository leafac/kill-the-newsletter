package main

import (
	"bytes"
	"fmt"
	"github.com/jhillyerd/enmime"
	"github.com/mhale/smtpd"
	"html"
	"io/ioutil"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

const server = ":80"
const emailServer = ":25"
const feedsPath = "/var/www/www.kill-the-newsletter.com/feeds/"
const host = "https://www.kill-the-newsletter.com"
const emailHost = "kill-the-newsletter.com"
const feedsURI = "/feeds/"
const rootURI = "/"
const URN = "kill-the-newsletter"
const name = "Kill the Newsletter!"
const feedsSuffix = ".xml"
const systemAdministrator = "mailto:kill-the-newsletter@leafac.com"

const tokenLength = 20
const tokenCharacters = "abcdefghijklmnopqrstuvwxyz0123456789"

func main() {
	http.HandleFunc(rootURI, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			fmt.Fprint(w, template(""))
			return
		}
		title := r.FormValue("title")
		if title == "" {
			fmt.Fprint(w, template(`<p class="error">Give the feed a title.</p>`))
			return
		}
		token := newToken()
		feedBasename := token + feedsSuffix
		feedPath := feedsPath + feedBasename
		feedURL := host + feedsURI + feedBasename
		email := token + "@" + emailHost
		messageTitle := `Created feed “` + html.EscapeString(title) + `”`
		message := `
<p>Subscribe to the Atom feed “` + feedURL + `” on a feed reader.</p>
<p>Sign up for a newsletter with the email address “` + email + `”.</p>
<p>Emails sent to this email address show up as entries on the Atom feed.</p>
<p>Both addresses contain a security token, so don’t share them! Otherwise, people would be able to spam the feed or unsubscribe from the newsletter. Instead, share ` + name + ` and let people create their own feeds.</p>
<p><em>Enjoy your readings!</em></p>`

		feedError := ioutil.WriteFile(
			feedPath,
			[]byte(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" type="application/atom+xml" href="`+feedURL+`"/>
  <link rel="alternate" type="text/html" href="`+host+rootURI+`"/>
  <title>`+html.EscapeString(title)+`</title>
  <subtitle>`+name+` inbox “`+email+`”.</subtitle>
  <id>urn:`+URN+`:`+token+`</id>
`+entry(messageTitle, name, message)+`
</feed>`),
			0600)

		if feedError != nil {
			log.Print(`Failed to create feed:
Title: “` + title + `”
Token: “` + token + `”
Path: “` + feedPath + `”
URL: “` + feedURL + `”
Email: “` + email + `”
Error: “` + feedError.Error() + `”`)
			fmt.Fprint(w, template(`
<div class="error">
  <p><em>Failed to create feed for “`+title+`”!</em></p>
  <p>Please contact the <a href="`+systemAdministrator+`">system administrator</a> and report the issue with the token “`+token+`”.</p>
</div>`))
			return
		}

		log.Print(`Creating feed:
Title: “` + title + `”
Token: “` + token + `”
Path: “` + feedPath + `”
URL: “` + feedURL + `”
Email: “` + email + `”`)

		fmt.Fprint(w, template(`<div class="success"><p><em>`+messageTitle+`.</em></p>`+message+`</div>`))
	})

	rand.Seed(time.Now().UTC().UnixNano())
	log.Print(name + " web server starting on “" + server + "”.")
	go func() { log.Fatal(http.ListenAndServe(server, nil)) }()
	log.Print(name + " email server starting on “" + emailServer + "” for email host “" + emailHost + "”.")
	log.Fatal(smtpd.ListenAndServe(emailServer, func(origin net.Addr, from string, to []string, data []byte) {
		for _, thisTo := range to {
			sanitizedTo := strings.ToLower(thisTo)
			matchedTo, errTo := regexp.MatchString("^["+tokenCharacters+"]+@"+emailHost+"$", sanitizedTo)
			if errTo != nil {
				log.Print("Email discarded: regular expression match failed for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			if !matchedTo {
				log.Print("Email discarded: invalid email address for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			token := sanitizedTo[:len(sanitizedTo)-len("@"+emailHost)]
			feedBasename := token + feedsSuffix
			feedPath := feedsPath + feedBasename
			if _, err := os.Stat(feedPath); os.IsNotExist(err) {
				log.Print("Email discarded: feed “" + feedPath + "” not found for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			feedText, feedTextError := ioutil.ReadFile(feedPath)
			if feedTextError != nil {
				log.Print("Email discarded: failed to read feed “" + feedPath + "” for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			message, messageError := enmime.ReadEnvelope(bytes.NewReader(data))
			if messageError != nil {
				log.Print("Email discarded: failed to read message for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			title := message.GetHeader("Subject")
			author := message.GetHeader("From")
			if author == "" {
				author = from
			}
			updatedRegularExpressionResult := regexp.MustCompile("<updated>.*?</updated>").FindReaderIndex(bytes.NewReader(feedText))
			if updatedRegularExpressionResult == nil {
				log.Print("Email discarded: couldn’t find where to add new entry (“<updated>” tag) on feed “" + feedPath + "” for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}
			content := message.HTML
			if content == "" {
				content = message.Text
			}
			feedWriteError := ioutil.WriteFile(feedPath,
				[]byte(string(feedText[:updatedRegularExpressionResult[0]])+entry(title, author, string(content))+string(feedText[updatedRegularExpressionResult[1]:])),
				0600)
			if feedWriteError != nil {
				log.Print("Email discarded: couldn’t write on feed “" + feedPath + "” for email coming from “" + from + "” to “" + sanitizedTo + "”.")
				return
			}

			log.Print("Email received from “" + from + "” to “" + sanitizedTo + "” on feed “" + feedPath + "”.")
		}
	}, name, name))
}

func newToken() string {
	tokenBuffer := make([]byte, tokenLength)
	for i := 0; i < tokenLength; i++ {
		tokenBuffer[i] = tokenCharacters[rand.Intn(len(tokenCharacters))]
	}
	return string(tokenBuffer)
}

func now() string {
	return time.Now().Format(time.RFC3339)
}

// ---------------------------------------------------------------------------------------------------

func template(view string) string {
	return `
<!DOCTYPE html>
<html>
  <head>
    <title>` + name + `</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Convert email newsletters into Atom feeds." />
    <style type="text/css">

      *, *::before, *::after {
        box-sizing: border-box;
        outline: none;
      }

      body {
        color: #444444;
        font-family: "Iowan Old Style", Georgia, serif;
        margin: 40px auto;
        max-width: 650px;
        line-height: 1.6;
        font-size: 18px;
        padding: 0 10px;
      }

      a {
        text-decoration: none;
        color: #7EA3DF;
      }

      h1, h2 {
        line-height: 1.2;
        margin: 30px 0 20px 0;
      }

      h2 {
        font-weight: 400;
        font-style: italic;
      }

      header, section {
        margin: 50px 0;
      }

      header h1 {
        margin-bottom: 0;
      }

      header p {
        font-style: italic;
        margin: 0;
      }

      input {
        color: #444444;
        font-family: "Gill Sans", Verdana, sans-serif;
        font-size: 18px;
      }

      input[type="text"] {
        border: 0;
        border-bottom: 1px solid #EEEEEE;
        font-size: 30px;
        width: 100%;
      }

      .success, .error {
        border-left: 7px solid;
        padding-left: 15px;
        margin: 30px 0;
      }

      .success {
        border-left-color: #8FA134;
      }

      .error {
        border-left-color: #AE5F1D;
      }

      footer {
        text-size: 16px;
        font-style: italic;
      }

    </style>
  </head>
  <body>
    <header>
      <h1>` + name + `</h1>
      <p>Convert email newsletters into Atom feeds.</p>
    </header>
    <section>
      ` + view + `
      <form method="POST" action="` + host + rootURI + `">
        <p><input type="text" name="title" placeholder="Feed title…" autofocus="autofocus" /></p>
        <p><input type="submit" value="Create feed" /></p>
      </form>
    </section>
    <section>
      <h1>How it Works</h1>

      <h2>Step 1</h2>

      <p>
        Create a feed on the form above.<br />
        It generates an Atom feed and an email address.
      </p>

      <h2>Step 2</h2>

      <p>Subscribe to the generated Atom feed on a feed reader.</p>

      <h2>Step 3</h2>

      <p>
        Sign up for a newsletter with the generated email address.<br />
        Emails sent to this email address show up as entries on the Atom feed.
      </p>

      <h1>Fair Play</h1>

      <p>There’s nothing technical preventing the use of ` + name + ` as disposable email inboxes. But the service exists for a single, well-defined purpose: to transform email newsletters into Atom feeds. Any other use isn’t welcome and abuse is going to result in shutting down the service for everyone. Please help keep ` + name + ` alive by using <a href="https://www.mailinator.com/">Mailinator</a>, <a href="https://www.guerrillamail.com/">Guerrilla Mail</a> and others for your disposable-email needs.</p>

      <h1>License</h1>

      <p>The contents of the feeds belong to the publishers, of course. ` + name + ` only transforms the emails into a different format. The code for the service is free software under the <a href="https://www.gnu.org/licenses/gpl.html">GPL v3</a> license. It is publicly <a href="https://git.leafac.com/kill-the-newsletter">available</a> and anyone can contribute or self-host their own instances.</p>
    </section>

    <footer>
      <p>Created by <a href="https://leafac.com">Leandro Facchinetti</a>.</p>
    </footer>
  </body>
</html>
`
}

func entry(title, author, content string) string {
	return `
<updated>` + now() + `</updated>
<entry>
  <title>` + html.EscapeString(title) + `</title>
  <author>
    <name>` + html.EscapeString(author) + `</name>
  </author>
  <id>urn:` + URN + `:` + newToken() + `</id>
  <updated>` + now() + `</updated>
  <content type="html">` + html.EscapeString(content) + `</content>
</entry>
`
}