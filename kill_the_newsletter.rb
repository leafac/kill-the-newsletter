require "sinatra"
require "sinatra/reloader" if development?
require "fog/backblaze"

#####################################################################################################
# CONFIGURATION

configure do
  set :name, ENV.fetch("NAME", "Kill the Newsletter!")
  set :url, ENV.fetch("URL", "http://localhost:5000")
  set :email_domain, ENV.fetch("EMAIL_DOMAIN", "localhost")
  set :urn, ENV.fetch("URN", "kill-the-newsletter")
  set :administrator_email, ENV.fetch("ADMINISTRATOR_EMAIL", "kill-the-newsletter@leafac.com")

  set :storage, Fog::Storage.new(
    provider: "backblaze",
    b2_account_id: ENV.fetch("B2_ACCOUNT_ID"),
    b2_account_token: ENV.fetch("B2_APPLICATION_KEY"),
    b2_bucket_name: ENV.fetch("B2_BUCKET"),
  )
  set :bucket, ENV.fetch("B2_BUCKET")

  set :feed_maximum_size, 500_000
  set :name_maximum_size, 1_000
end

#####################################################################################################
# ROUTE HANDLERS

get "/" do
  erb :index
end

post "/" do
  name = params["name"]
  token = fresh_token
  locals = { token: token, name: name }
  halt erb(:index, locals: { error_message: "Please provide the newsletter name." }) if name.blank?
  halt erb(:index, locals: { error_message: "Newsletter name is too long." }) if name.length > settings.name_maximum_size
  feed = erb :feed, layout: false, locals: locals do
    erb :entry, locals: {
      token: fresh_token,
      title: "“#{escape name}” inbox created",
      author: settings.name,
      created_at: now,
      html: true,
      content: erb(:instructions, locals: locals),
    }
  end
  begin
    put_feed token, feed
    logger.info "Inbox created: #{locals}"
    erb :success, locals: locals
  rescue => error
    logger.error "Error creating inbox: #{locals}"
    logger.error error
    erb :error, locals: locals
  end
end

post "/email" do
  html = email_field "html"
  text = email_field "text"
  entry = erb :entry, layout: false, locals: {
    token: fresh_token,
    title: email_field("subject"),
    author: email_field("from"),
    created_at: now,
    html: ! html.blank?,
    content: html.blank? ? text : html,
  }
  JSON.parse(params.fetch("envelope")).fetch("to").each do |to|
    begin
      raise Fog::Errors::NotFound if to !~ /@#{settings.email_domain}\z/
      token = to[0...-("@#{settings.email_domain}".length)]
      feed = get_feed token
      updated_feed = feed.sub /<updated>.*?<\/updated>/, entry
      if updated_feed.bytesize > settings.feed_maximum_size
        updated_feed = updated_feed.byteslice 0, settings.feed_maximum_size
        updated_feed = updated_feed[/.*<\/entry>/m] || updated_feed[/.*?<\/updated>/m]
        updated_feed += "\n</feed>"
      end
      put_feed token, updated_feed
      logger.info "Received email from “#{params.fetch("from")}” to “#{to}”"
    rescue Fog::Errors::NotFound
      logger.info "Discarded email from “#{params.fetch("from")}” to “#{to}”"
    end
  end
  200
end

get "/feeds/:token.xml" do |token|
  begin
    get_feed(token).tap { content_type "text/xml" }
  rescue Fog::Errors::NotFound
    404
  end
end

not_found do
  erb :not_found
end

#####################################################################################################
# HELPERS

helpers do
  def file token
    "#{token}.xml"
  end

  def email token
    "#{token}@#{settings.email_domain}"
  end

  def feed token
    "#{settings.url}/feeds/#{token}.xml"
  end

  def id token
    "urn:#{settings.urn}:#{token}"
  end

  def fresh_token
    SecureRandom.urlsafe_base64(30).tr("-_", "")[0...20].downcase
  end

  def now
    DateTime.now.rfc3339
  end

  # https://github.com/honeybadger-io/incoming/blob/00d6184855fa806222386c2cbb7f4111ee8d2fb1/lib/incoming/strategies/sendgrid.rb#L21-L34
  # https://github.com/thoughtbot/griddler/blob/7690cc31ded0f834b77160f1d85217b85d3480cd/lib/griddler/email.rb#L155
  # https://robots.thoughtbot.com/fight-back-utf-8-invalid-byte-sequences
  def email_field field
    encoding = JSON.parse(params.fetch("charsets")).fetch(field, "ASCII-8BIT")
    params.fetch(field, "")
          .force_encoding(encoding)
          .encode("UTF-8", encoding, invalid: :replace, undef: :replace, replace: "")
  end

  def get_feed token
    settings.storage.get_object(settings.bucket, file(token)).body
  end

  def put_feed token, feed
    settings.storage.put_object settings.bucket, file(token), feed
  end

  # https://github.com/rails/rails/blob/ab3ad6a9ad119825636153cd521e25c280483340/activesupport/lib/active_support/core_ext/object/blank.rb
  class String
    def blank?
      self =~ /\A[[:space:]]*\z/
    end
  end

  class NilClass
    def blank?
      true
    end
  end

  def escape text
    Rack::Utils.escape_html text
  end
end

#####################################################################################################
# TEMPLATES

__END__

@@ layout
<!DOCTYPE html>
<html>
  <head>
    <title><%= settings.name %></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Convert email newsletters into Atom feeds.">
    <link rel="stylesheet" href="/stylesheets/styles.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
  </head>
  <body>
    <header>
      <h1><a href="/"><%= settings.name %></a></h1>
      <p><%= File.read "public/images/envelope-to-feed.svg" %></p>
      <h2>Convert email newsletters into Atom feeds</h2>
    </header>
    <main>
      <%= yield %>
    </main>
    <footer>
      <p><%= settings.name %> is <a href="https://github.com/leafac/kill-the-newsletter">free software</a> by <a href="https://www.leafac.com">Leandro Facchinetti</a></p>
    </footer>
  </body>
</html>

@@ index
<% if defined? error_message %>
  <p class="error"><%= error_message %></p>
<% end %>
<form method="POST" action="/">
  <p><input type="text" name="name" placeholder="Newsletter name…" autofocus></p>
  <p><input type="submit" value="Create Inbox"></p>
</form>

@@ instructions
<p>Sign up for the newsletter with<br><a href="mailto:<%= email token %>" target="_blank"><%= email token %></a></p>
<p>Subscribe to the Atom feed at<br><a href="<%= feed token %>" target="_blank"><%= feed token %></a></p>
<p><em>Don’t share these addresses!</em><br>They contain a security token<br>that other people could use to send you spam<br>and unsubscribe you from your newsletters.</p>
<p><em>Enjoy your readings!</em></p>

@@ success
<p>“<%= escape name %>” inbox created</p>
<%= erb :instructions, locals: { token: token } %>
<p><a href="/" class="button">Create Another Inbox</a></p>

@@ error
<p class="error">Error creating “<%= escape name %>” inbox!<br>Please contact the <a href="mailto:<%= settings.administrator_email %>?subject=[<%= settings.name %>] Error creating “<%= escape name %>” inbox with token “<%= token %>”">system administrator</a><br>with token “<%= token %>”.</p>

@@ not_found
<p class="error">404 Not Found</p>
<p><a href="/" class="button">Create an Inbox</a></p>

@@ feed
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<link rel="self" type="application/atom+xml" href="<%= feed token %>"/>
<link rel="alternate" type="text/html" href="<%= settings.url %>/"/>
<title><%= escape name %></title>
<subtitle><%= settings.name %> inbox “<%= email token %>”.</subtitle>
<id><%= id token %></id>
<%= yield %>
</feed>

@@ entry
<updated><%= created_at %></updated>
<entry>
  <id><%= id token %></id>
  <title><%= escape title %></title>
  <author><name><%= escape author %></name></author>
  <updated><%= created_at %></updated>
  <content<%= html ? " type=\"html\"" : "" %>><%= escape content %></content>
</entry>
