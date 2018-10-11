package main

// ---------------------------------------------------------------------------------------------------
// IMPORTS

import (
	"bytes"
	"encoding/json"
	"fmt"
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

	"github.com/jhillyerd/enmime"
	"github.com/mhale/smtpd"
)

// ---------------------------------------------------------------------------------------------------
// MAIN

func main() {
	PrintVersion()
	LoadSettings()
	WebServer()
	EmailServer()
}

// ---------------------------------------------------------------------------------------------------
// VERSION

func PrintVersion() {
	log.Printf("Version: 0.0.4")
}

// ---------------------------------------------------------------------------------------------------
// SETTINGS

var Settings struct {
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
		NameSizeLimit int
		Path          string
		Suffix        string
		URN           string
		SizeLimit     int
	}
	Token struct {
		Length     int
		Characters string
	}
}

func SettingsDefaults() {
	Settings.Name = "Kill the Newsletter!"
	Settings.Administrator = "mailto:administrator@example.com"
	Settings.Web.Server = ":8080"
	Settings.Web.URL = "http://localhost:8000"
	Settings.Web.URIs.Root = "/"
	Settings.Web.URIs.Feeds = "/feeds/"
	Settings.Email.Server = ":2525"
	Settings.Email.Host = "localhost"
	Settings.Feed.NameSizeLimit = 500
	Settings.Feed.Path = "./feeds/"
	Settings.Feed.Suffix = ".xml"
	Settings.Feed.URN = "localhost"
	Settings.Feed.SizeLimit = 500000
	Settings.Token.Length = 20
	Settings.Token.Characters = "abcdefghijklmnopqrstuvwxyz0123456789"
}

func LoadSettings() {
	rand.Seed(time.Now().UTC().UnixNano())

	SettingsDefaults()

	settingsFile, settingsFileError := ioutil.ReadFile("./kill-the-newsletter.json")
	if settingsFileError != nil {
		log.Printf("Using default settings. Failed to read settings file: %v", settingsFileError)
	} else {
		settingsParsingError := json.Unmarshal(settingsFile, &Settings)
		if settingsParsingError != nil {
			log.Fatalf("Failed to parse settings file: %v", settingsParsingError)
		}
	}

	log.Printf("Settings: %+v", Settings)

	if _, feedPathError := ioutil.ReadDir(Settings.Feed.Path); feedPathError != nil {
		log.Fatalf("Feed path error: %v", feedPathError)
	}
}

// ---------------------------------------------------------------------------------------------------
// WEB SERVER

func WebServer() {
	log.Printf("Starting web server")

	http.HandleFunc(Settings.Web.URIs.Root, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			fmt.Fprint(w, ViewIndex())
			return
		}

		feed := NewFeed(r.FormValue("name"), NewToken())
		if feed.Title == "" {
			fmt.Fprint(w, ViewErrorEmptyTitle())
			return
		}
		if len(feed.Title) > Settings.Feed.NameSizeLimit {
			fmt.Fprint(w, ViewErrorTitleTooLong())
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

	go func() { log.Fatal(http.ListenAndServe(Settings.Web.Server, nil)) }()
}

// ---------------------------------------------------------------------------------------------------
// EMAIL SERVER

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

			feedTruncateError := email.Feed.Truncate()
			if feedTruncateError != nil {
				log.Printf("Failed to truncate feed %+v: %v", email, feedTruncateError)
				continue
			}
		}
	}

	log.Fatal(smtpd.ListenAndServe(Settings.Email.Server, handler, Settings.Name, Settings.Name))
}

// ---------------------------------------------------------------------------------------------------
// FEED

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
	basename := token + Settings.Feed.Suffix
	return Feed{
		Title:    title,
		Token:    token,
		Basename: basename,
		Path:     Settings.Feed.Path + basename,
		URL:      Settings.Web.URL + Settings.Web.URIs.Feeds + basename,
		URN:      URN(token),
		Email:    token + "@" + Settings.Email.Host,
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

	updatedRegularExpressionResult := regexp.MustCompile("\n<updated>.*?</updated>").FindReaderIndex(bytes.NewReader(feedText))
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

func (feed Feed) Truncate() error {
	feedText, feedTextError := feed.Text()
	if feedTextError != nil {
		return fmt.Errorf("Failed to read feed: %v", feedTextError)
	}
	if len(feedText) <= Settings.Feed.SizeLimit {
		return nil
	}

	feedTextTruncated := feedText[:Settings.Feed.SizeLimit]

	entryEndRegularExpressionResult := regexp.MustCompile(".*</entry>").FindReaderIndex(bytes.NewReader(feedTextTruncated))
	if entryEndRegularExpressionResult == nil {
		entryEndRegularExpressionResult = regexp.MustCompile(".*?</updated>").FindReaderIndex(bytes.NewReader(feedTextTruncated))
		if entryEndRegularExpressionResult == nil {
			return fmt.Errorf("Failed to find where to truncate (“</entry>” closing tag or “<updated>” tag)")
		}
	}

	feedWriteError := ioutil.WriteFile(feed.Path,
		[]byte(string(feedTextTruncated[:entryEndRegularExpressionResult[1]])+"\n</feed>"),
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
	tokenBuffer := make([]byte, Settings.Token.Length)
	for i := 0; i < Settings.Token.Length; i++ {
		tokenBuffer[i] = Settings.Token.Characters[rand.Intn(len(Settings.Token.Characters))]
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
	return "urn:" + Settings.Feed.URN + ":" + token
}

// ---------------------------------------------------------------------------------------------------
// ENTRY

type Entry struct {
	Id          string
	Updated     time.Time
	Title       string
	Author      string
	ContentType string
	Content     string
}

func NewEntry(title, author, contentType, content string) Entry {
	return Entry{
		Id:          URN(NewToken()),
		Updated:     time.Now(),
		Title:       title,
		Author:      author,
		ContentType: contentType,
		Content:     content,
	}
}

// ---------------------------------------------------------------------------------------------------
// EMAIL

type Email struct {
	From string
	To   string
	Feed Feed
}

func NewEmail(from, to string) (Email, error) {
	email := Email{From: from, To: strings.ToLower(to)}

	matchedTo, matchedToError := regexp.MatchString("^["+Settings.Token.Characters+"]+@"+Settings.Email.Host+"$", email.To)
	if matchedToError != nil {
		return email, fmt.Errorf("Regular expression match failed: %v", matchedToError)
	}
	if !matchedTo {
		return email, fmt.Errorf("Invalid destination email address")
	}

	email.Feed = NewFeed("", email.To[:len(email.To)-len("@"+Settings.Email.Host)])
	if _, feedPathError := os.Stat(email.Feed.Path); feedPathError != nil {
		return email, fmt.Errorf("Feed path error: %v", feedPathError)
	}

	return email, nil
}

func (email Email) Entry(message *enmime.Envelope) Entry {
	entry := NewEntry(message.GetHeader("Subject"), message.GetHeader("From"), "html", message.HTML)
	if entry.Author == "" {
		entry.Author = email.From
	}
	if entry.Content == "" {
		entry.ContentType = "text"
		entry.Content = message.Text
	}

	return entry
}

// ---------------------------------------------------------------------------------------------------
// VIEWS

func Template(view string) string {
	return `<!DOCTYPE html>
<html>
  <head>
    <title>` + Settings.Name + `</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Convert email newsletters into Atom feeds.">
    <link rel="stylesheet" href="/stylesheets/main.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
  </head>
  <body>
    <header>
      <h1><a href="/">` + Settings.Name + `</a></h1>
      <p><img src="envelope-to-feed.svg" alt=""/></p>
      <h2>Convert email newsletters into Atom feeds</h2>
    </header>
    <main>
      ` + view + `
    </main>
    <footer>
      <p>` + Settings.Name + ` is <a href="https://github.com/leafac/kill-the-newsletter">free software</a> by <a href="https://www.leafac.com">Leandro Facchinetti</a></p>
    </footer>
  </body>
</html>
`
}

func ViewIndex() string {
	return Template(PartialForm())
}

func ViewErrorEmptyTitle() string {
	return Template(`<p class="error">Please provide the newsletter name.</p>` + PartialForm())
}

func ViewErrorTitleTooLong() string {
	return Template(`<p class="error">Newsletter name is too long.</p>` + PartialForm())
}

func ViewErrorFeedCreation(feed Feed) string {
	return Template(`
<p class="error">Error creating “` + html.EscapeString(feed.Title) + `” inbox!<br>Please contact the <a href="` + Settings.Administrator + `?subject=[` + Settings.Name + `] Error creating “` + html.EscapeString(feed.Title) + `” inbox with token “` + feed.Token + `”">system administrator</a><br>with token “` + feed.Token + `”.</p>
`)
}

func ViewFeedCreated(feed Feed) string {
	createdEntry := feed.CreatedEntry()
	return Template(`<p>` + createdEntry.Title + `</p>` + createdEntry.Content)
}

func PartialForm() string {
	return `
<form method="POST" action="` + Settings.Web.URL + Settings.Web.URIs.Root + `">
	<p><input type="text" name="name" placeholder="Newsletter name…" autofocus></p>
	<p><input type="submit" value="Create Inbox"></p>
</form>
`
}

func (feed Feed) CreatedEntry() Entry {
	return NewEntry(
		`“`+html.EscapeString(feed.Title)+`” inbox created`,
		Settings.Name,
		"html",
		`
<p>Sign up for the newsletter with<br><a href="mailto:`+feed.Email+`" target="_blank">`+feed.Email+`</a></p>
<p>Subscribe to the Atom feed at<br><a href="`+feed.URL+`" target="_blank">`+feed.URL+`</a></p>
<p><em>Don’t share these addresses!</em><br>They contain a security token<br>that other people could use to send you spam<br>and unsubscribe you from your newsletters.</p>
<p><em>Enjoy your readings!</em></p>
<p><a href="`+Settings.Web.URL+Settings.Web.URIs.Root+`" class="button">Create Another Inbox</a></p>
`)
}

func (feed Feed) Atom() string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" type="application/atom+xml" href="` + feed.URL + `"/>
  <link rel="alternate" type="text/html" href="` + Settings.Web.URL + Settings.Web.URIs.Root + `"/>
  <title>` + html.EscapeString(feed.Title) + `</title>
  <subtitle>` + Settings.Name + ` inbox “` + feed.Email + `”</subtitle>
  <id>` + feed.URN + `</id>
` + feed.CreatedEntry().Atom() + `
</feed>
`
}

func (entry Entry) Atom() string {
	updatedString := entry.Updated.Format(time.RFC3339)
	return `
<updated>` + updatedString + `</updated>
<entry>
  <id>` + entry.Id + `</id>
  <title>` + html.EscapeString(entry.Title) + `</title>
  <author><name>` + html.EscapeString(entry.Author) + `</name></author>
	<updated>` + updatedString + `</updated>
  <content type="` + entry.ContentType + `">` + html.EscapeString(entry.Content) + `</content>
</entry>
`
}
