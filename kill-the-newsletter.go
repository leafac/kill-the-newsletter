package main

import (
	"bytes"
	"encoding/json"
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

func main() {
	SeedRandomNumberGenerator()
	LoadConfiguration()
	WebServer()
	EmailServer()
}

// ---------------------------------------------------------------------------------------------------

func SeedRandomNumberGenerator() {
	rand.Seed(time.Now().UTC().UnixNano())
}

// ---------------------------------------------------------------------------------------------------

var Configuration struct {
	Name          string
	Administrator string
	Web           struct {
		Server string
		URL    string
		URIs   struct {
			Root  string
			Feeds string
		}
	}
	Email struct {
		Server string
		Host   string
	}
	Feed struct {
		Path   string
		Suffix string
		URN    string
	}
	Token struct {
		Length     int
		Characters string
	}
}

func ConfigurationDefaults() {
	Configuration.Name = "Kill the Newsletter!"
	Configuration.Administrator = "mailto:administrator@example.com"
	Configuration.Web.Server = ":8080"
	Configuration.Web.URL = "http://localhost:8080"
	Configuration.Web.URIs.Root = "/"
	Configuration.Web.URIs.Feeds = "/feeds/"
	Configuration.Email.Server = ":2525"
	Configuration.Email.Host = "localhost"
	Configuration.Feed.Path = "./feeds/"
	Configuration.Feed.Suffix = ".xml"
	Configuration.Feed.URN = "localhost"
	Configuration.Token.Length = 20
	Configuration.Token.Characters = "abcdefghijklmnopqrstuvwxyz0123456789"
}

func LoadConfiguration() {
	ConfigurationDefaults()

	configurationFile, configurationFileError := ioutil.ReadFile("./kill-the-newsletter.json")
	if configurationFileError != nil {
		log.Printf("Using default configuration. Failed to read configuration file: %v", configurationFileError)
	} else {
		configurationParsingError := json.Unmarshal(configurationFile, &Configuration)
		if configurationParsingError != nil {
			log.Fatalf("Failed to parse configuration file: %v", configurationParsingError)
		}
	}

	log.Printf("Configuration: %+v", Configuration)

	if _, feedPathError := ioutil.ReadDir(Configuration.Feed.Path); feedPathError != nil {
		log.Fatalf("Feed path error: %v", feedPathError)
	}
}

// ---------------------------------------------------------------------------------------------------

type Feed struct {
	Title    string
	Token    string
	Basename string
	Path     string
	URL      string
	URN      string
	Email    string
}

func NewFeed(title, token string) Feed {
	basename := token + Configuration.Feed.Suffix
	return Feed{
		Title:    title,
		Token:    token,
		Basename: basename,
		Path:     Configuration.Feed.Path + basename,
		URL:      Configuration.Web.URL + Configuration.Web.URIs.Feeds + basename,
		URN:      URN(token),
		Email:    token + "@" + Configuration.Email.Host,
	}
}

func (feed Feed) Create() error {
	return ioutil.WriteFile(feed.Path, []byte(feed.Atom()), 0644)
}

func (feed Feed) Update(entry Entry) error {
	feedText, feedTextError := feed.Text()
	if feedTextError != nil {
		return fmt.Errorf("Failed to read feed: %v", feedTextError)
	}

	updatedRegularExpressionResult := regexp.MustCompile("<updated>.*?</updated>").FindReaderIndex(bytes.NewReader(feedText))
	if updatedRegularExpressionResult == nil {
		return fmt.Errorf("Failed to find where to add new entry (“<updated>” tag)")
	}

	feedWriteError := ioutil.WriteFile(feed.Path,
		[]byte(string(feedText[:updatedRegularExpressionResult[0]])+entry.Atom()+string(feedText[updatedRegularExpressionResult[1]:])),
		0644)
	if feedWriteError != nil {
		return fmt.Errorf("Failed to write on feed: %v", feedWriteError)
	}

	return nil
}

func (feed Feed) Text() ([]byte, error) {
	return ioutil.ReadFile(feed.Path)
}

func NewToken() string {
	tokenBuffer := make([]byte, Configuration.Token.Length)
	for i := 0; i < Configuration.Token.Length; i++ {
		tokenBuffer[i] = Configuration.Token.Characters[rand.Intn(len(Configuration.Token.Characters))]
	}
	token := string(tokenBuffer)
	feed := NewFeed("", token)
	if _, feedPathError := os.Stat(feed.Path); feedPathError == nil {
		log.Printf("Improbability drive broken: Reused token: %v", token)
		return NewToken()
	}
	return token
}

func URN(token string) string {
	return "urn:" + Configuration.Feed.URN + ":" + token
}

// ---------------------------------------------------------------------------------------------------

type Entry struct {
	Id      string
	Updated time.Time
	Title   string
	Author  string
	Content string
}

func NewEntry(title, author, content string) Entry {
	return Entry{
		Id:      URN(NewToken()),
		Updated: time.Now(),
		Title:   title,
		Author:  author,
		Content: content,
	}
}

// ---------------------------------------------------------------------------------------------------

type Email struct {
	From string
	To   string
	Feed Feed
}

func NewEmail(from, to string) (Email, error) {
	email := Email{From: from, To: strings.ToLower(to)}

	matchedTo, matchedToError := regexp.MatchString("^["+Configuration.Token.Characters+"]+@"+Configuration.Email.Host+"$", email.To)
	if matchedToError != nil {
		return email, fmt.Errorf("Regular expression match failed: %v", matchedToError)
	}
	if !matchedTo {
		return email, fmt.Errorf("Invalid destination email address")
	}

	email.Feed = NewFeed("", email.To[:len(email.To)-len("@"+Configuration.Email.Host)])
	if _, feedPathError := os.Stat(email.Feed.Path); feedPathError != nil {
		return email, fmt.Errorf("Feed path error: %v", feedPathError)
	}

	return email, nil
}

func (email Email) Entry(message *enmime.Envelope) Entry {
	entry := NewEntry(message.GetHeader("Subject"), message.GetHeader("From"), message.HTML)
	if entry.Author == "" {
		entry.Author = email.From
	}
	if entry.Content == "" {
		entry.Content = message.Text
	}

	return entry
}

// ---------------------------------------------------------------------------------------------------

func WebServer() {
	log.Printf("Starting web server")

	http.HandleFunc(Configuration.Web.URIs.Root, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			fmt.Fprint(w, ViewIndex())
			return
		}

		feed := NewFeed(r.FormValue("title"), NewToken())
		if feed.Title == "" {
			fmt.Fprint(w, ViewErrorEmptyTitle())
			return
		}

		feedCreationError := feed.Create()
		if feedCreationError != nil {
			log.Printf("Failed to create feed %+v: %v", feed, feedCreationError)
			fmt.Fprint(w, ViewErrorFeedCreation(feed))
			return
		}
		log.Printf("Created feed: %+v", feed)

		fmt.Fprint(w, ViewFeedCreated(feed))
	})

	go func() { log.Fatal(http.ListenAndServe(Configuration.Web.Server, nil)) }()
}

// ---------------------------------------------------------------------------------------------------

func EmailServer() {
	log.Printf("Starting email server")

	handler := func(origin net.Addr, from string, tos []string, data []byte) {
		emails := make([]Email, 0)
		for _, to := range tos {
			email, emailError := NewEmail(from, to)
			if emailError != nil {
				log.Printf("Email discarded %+v: %v", email, emailError)
				continue
			}
			emails = append(emails, email)
		}
		if len(emails) == 0 {
			return
		}

		message, messageError := enmime.ReadEnvelope(bytes.NewReader(data))
		if messageError != nil {
			log.Printf("Emails discarded %+v: Failed to read message: %v", emails, messageError)
			return
		}

		for _, email := range emails {
			feedUpdateError := email.Feed.Update(email.Entry(message))
			if feedUpdateError != nil {
				log.Printf("Email discarded %+v: %v", email, feedUpdateError)
				continue
			}

			log.Printf("Email received: %+v", email)
		}
	}

	log.Fatal(smtpd.ListenAndServe(Configuration.Email.Server, handler, Configuration.Name, Configuration.Name))
}

// ---------------------------------------------------------------------------------------------------

func Template(view string) string {
	return `
<!DOCTYPE html>
<html>
  <head>
    <title>` + Configuration.Name + `</title>
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
      <h1>` + Configuration.Name + `</h1>
      <p>Convert email newsletters into Atom feeds.</p>
    </header>
    <section>
      ` + view + `
      <form method="POST" action="` + Configuration.Web.URL + Configuration.Web.URIs.Root + `">
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

      <p>There’s nothing technical preventing the use of ` + Configuration.Name + ` as disposable email inboxes. But the service exists for a single, well-defined purpose: to transform email newsletters into Atom feeds. Any other use isn’t welcome and abuse is going to result in service shutdown for everyone, which is sad. Please help keep ` + Configuration.Name + ` alive by using <a href="https://www.mailinator.com/">Mailinator</a>, <a href="https://www.guerrillamail.com/">Guerrilla Mail</a> and others for your disposable-email needs.</p>

      <h1>License</h1>

      <p>The contents of the feeds belong to the publishers, of course. ` + Configuration.Name + ` only transforms the emails into a different format. The code for the service is free software under the <a href="https://www.gnu.org/licenses/gpl.html">GPL v3</a> license. It is publicly <a href="https://git.leafac.com/kill-the-newsletter">available</a> and anyone can contribute or self-host their own instances.</p>
    </section>

    <footer>
      <p>Created by <a href="https://www.leafac.com">Leandro Facchinetti</a>.</p>
    </footer>
  </body>
</html>
`
}

func ViewIndex() string {
	return Template("")
}

func ViewErrorEmptyTitle() string {
	return Template(`<p class="error">Give the feed a title.</p>`)
}

func ViewErrorFeedCreation(feed Feed) string {
	return Template(`
<div class="error">
  <p><em>Failed to create feed “` + feed.Title + `”!</em></p>
  <p>Please contact the <a href="` + Configuration.Administrator + `">system administrator</a> and report the issue with the token “` + feed.Token + `”.</p>
</div>`)
}

func ViewFeedCreated(feed Feed) string {
	createdEntry := feed.CreatedEntry()
	return Template(`<div class="success"><p><em>` + createdEntry.Title + `.</em></p>` + createdEntry.Content + `</div>`)
}

func (feed Feed) CreatedEntry() Entry {
	return NewEntry(
		`Created feed “`+html.EscapeString(feed.Title)+`”`,
		Configuration.Name,
		`
<p>Subscribe to the Atom feed on a feed reader:<br /><a href="`+feed.URL+`" target="_blank">`+feed.URL+`</a></p>
<p>Sign up for a newsletter with the email address:<br /><a href="mailto:`+feed.Email+`" target="_blank">`+feed.Email+`</a></p>
<p>Emails sent to this email address show up as entries on the Atom feed.</p>
<p>Both addresses contain a security token, so don’t share them! Otherwise, people would be able to spam the feed or unsubscribe from the newsletter. Instead, share `+Configuration.Name+` and let people create their own feeds.</p>
<p><em>Enjoy your readings!</em></p>`)
}

func (feed Feed) Atom() string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" type="application/atom+xml" href="` + feed.URL + `"/>
  <link rel="alternate" type="text/html" href="` + Configuration.Web.URL + Configuration.Web.URIs.Root + `"/>
  <title>` + html.EscapeString(feed.Title) + `</title>
  <subtitle>` + Configuration.Name + ` inbox “` + feed.Email + `”.</subtitle>
  <id>` + feed.URN + `</id>
` + feed.CreatedEntry().Atom() + `
</feed>`
}

func (entry Entry) Atom() string {
	updatedString := entry.Updated.Format(time.RFC3339)
	return `
<updated>` + updatedString + `</updated>
<entry>
  <id>` + entry.Id + `</id>
  <updated>` + updatedString + `</updated>
  <title>` + html.EscapeString(entry.Title) + `</title>
  <author>
    <name>` + html.EscapeString(entry.Author) + `</name>
  </author>
  <content type="html">` + html.EscapeString(entry.Content) + `</content>
</entry>
`
}
