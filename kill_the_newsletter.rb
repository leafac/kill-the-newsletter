require "sinatra"
require "sinatra/reloader" if development?
require "fog/backblaze"
require "securerandom"
require "date"

get "/" do
  erb :index
end

post "/" do
  halt erb(:index, locals: { error_message: "Please provide the newsletter name." }) if params["name"].blank?
  # STORAGE.put_object BUCKET, file(token), feed
  # name = params["name"]
  # @inbox = Inbox.new Rack::Utils.escape_html(name)
  # @entry = Entry.new(
  #   "“#{@inbox.name}” inbox created",
  #   "Kill the Newsletter!",
  #   Rack::Utils.escape_html(erb(:inbox)),
  #   true,
  # )
  # begin
  #   settings.storage.put_object(settings.bucket, @inbox.file, erb(:entry, layout: :feed))
  #   @inbox.persisted = true
  # rescue
  # end
  # erb :index
end

# post "/email" do
#   html = ! email["html"].blank?
#   @entry = Entry.new(
#     Rack::Utils.escape_html(email.fetch("subject")),
#     Rack::Utils.escape_html(email.fetch("from")),
#     Rack::Utils.escape_html(email.fetch("subject")),
#     Rack::Utils.escape_html(html ? email.fetch("html") : email.fetch("text")),
#     html,
#   )
#   rendered_entry = erb :entry
#   params.fetch("envelope").fetch("to").map do |email|
#     begin
#       token = email[0...-("@kill-the-newsletter.com".length)]
#       file = "#{token}.xml"
#       feed = settings.storage.get_object(settings.bucket, file)
#       updated_feed = feed.sub(/\n<updated>.*?<\/updated>/, rendered_entry)
#       truncated_feed = begin
#         if updated_feed.length <= 2_000_000
#           updated_feed
#         else
#           truncated_feed = updated_feed[0..2_000_000]
#           # TODO
#         end
#       end
#       settings.storage.put_object(settings.bucket, file, truncated_feed)
#     rescue Fog::Errors::NotFound
#       nil
#     end
#   end
#   200
# end
# 
# get "/feeds/:token.xml" do
#   begin
#     STORAGE.get_object(BUCKET, "#{token}.xml").tap { |file| content_type "text/xml" }.body
#   rescue Fog::Errors::NotFound
#     404
#   end
# end

not_found do
  erb :index, locals: { error_message: "404 Not Found" }
end

STORAGE = Fog::Storage.new(
  provider: "backblaze",
  b2_account_id: ENV.fetch("B2_ACCOUNT_ID"),
  b2_account_token: ENV.fetch("B2_ACCOUNT_TOKEN"),
  b2_bucket_name: ENV.fetch("B2_BUCKET"),
  b2_bucket_id: ENV.fetch("B2_BUCKET_ID"),
)

BUCKET = ENV.fetch("B2_BUCKET_ID")

def fresh_token
  SecureRandom.urlsafe_base64(30).tr("-_", "")[0...20].downcase
end

def now
  DateTime.now.rfc3339
end

# https://github.com/rails/rails/blob/ab3ad6a9ad119825636153cd521e25c280483340/activesupport/lib/active_support/core_ext/object/blank.rb
class String
  def blank?
    /\A[[:space:]]*\z/.match self
  end
end

class NilClass
  def blank?
    true
  end
end

__END__

@@ layout

<!DOCTYPE html>
<html>
  <head>
    <title>Kill the Newsletter!</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Convert email newsletters into Atom feeds.">
    <link rel="stylesheet" href="/stylesheets/styles.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
  </head>
  <body>
    <header>
      <h1>Kill the Newsletter!</h1>
      <p><%= File.read "public/images/envelope-to-feed.svg" %></p>
      <h2>Convert email newsletters into Atom feeds</h2>
    </header>
    <main>
      <% if defined? error_message %>
        <p class="error"><%= error_message %></p>
      <% end %>
      <%= yield %>
    </main>
    <footer>
      <p>Kill the Newsletter! is <a href="https://github.com/leafac/kill-the-newsletter">free software</a> by <a href="https://www.leafac.com">Leandro Facchinetti</a></p>
    </footer>
  </body>
</html>

@@ index

<form method="POST" action="/">
  <p><input type="text" name="name" placeholder="Newsletter name…" autofocus></p>
  <p><input type="submit" value="Create Inbox"></p>
</form>

@@ instructions

<p>Sign up for the newsletter with<br><a href="mailto:<%= token %>@kill-the-newsletter.com" target="_blank"><%= token %>@kill-the-newsletter.com</a></p>
<p>Subscribe to the Atom feed at<br><a href="https://www.kill-the-newsletter.com/feeds/<%= token %>.xml" target="_blank">https://www.kill-the-newsletter.com/feeds/<%= token %>.xml</a></p>
<p><em>Don’t share these addresses!</em><br>They contain a security token<br>that other people could use to send you spam<br>and unsubscribe you from your newsletters.</p>

@@ success

<p>“<%= name %>” inbox created</p>
<%= instructions %>
<p><a href="/" class="button">Create Another Inbox</a></p>

@@ error

<p class="error">Error creating “<%= name %>” inbox!<br>Please contact the <a href="mailto:kill-the-newsletter@leafac.com?subject=[Kill the Newsletter!] Error creating “<%= name %>” inbox with token “<%= token %>”">system administrator</a><br>with token “<%= token %>”.</p>

@@ feed

<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<link rel="self" type="application/atom+xml" href="https://www.kill-the-newsletter.com/feeds/<%= token %>.xml"/>
<link rel="alternate" type="text/html" href="https://www.kill-the-newsletter.com/"/>
<title><%= name %></title>
<subtitle>Kill the Newsletter! inbox “<%= token %>@kill-the-newsletter.com”.</subtitle>
<id>urn:kill-the-newsletter:<%= token %></id>
  <%= yield %>
</feed>

@@ entry

<updated><%= created_at %></updated>
<entry>
  <id>urn:kill-the-newsletter:<%= token %></id>
  <title><%= title %></title>
  <author><name><%= author %></name></author>
  <updated><%= created_at %></updated>
  <content<%= html? ? " type=\"html\"" : "" %>><%= content %></content>
</entry>
