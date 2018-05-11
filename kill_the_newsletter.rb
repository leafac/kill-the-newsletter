require "sinatra"
require "sinatra/reloader" if development?
require "fog/backblaze"
require "securerandom"
require "date"

module IDable
  def id
    "urn:kill-the-newsletter:#{token}"
  end

  private

    def fresh_id
      SecureRandom.urlsafe_base64(30).tr("-_", "")[0...20].downcase
    end
end

class String
  def blank?
    strip.empty?
  end
end

class NilClass
  def blank?
    true
  end
end

Inbox = Struct.new :token, :name, :persisted do
  include IDable

  def initialize name
    super fresh_id, name, false
  end

  def email
    "#{token}@kill-the-newsletter.com"
  end

  def feed
    "https://www.kill-the-newsletter.com/feeds/#{file}"
  end

  def file
    "#{token}.xml"
  end

  def persisted?
    !! persisted
  end
end

Entry = Struct.new :token, :title, :author, :created_at, :content, :html do
  include IDable

  def initialize title, author, content, html
    super fresh_id, title, author, DateTime.now.rfc3339, content, html
  end

  def html?
    !! html
  end
end

configure do
  set :storage, Fog::Storage.new(
    provider: "backblaze",
    b2_account_id: ENV.fetch("B2_ACCOUNT_ID"),
    b2_account_token: ENV.fetch("B2_ACCOUNT_TOKEN"),
    b2_bucket_name: ENV.fetch("B2_BUCKET"),
    b2_bucket_id: ENV.fetch("B2_BUCKET_ID"),
  )
  set :bucket, ENV.fetch("B2_BUCKET")
end

get "/" do
  erb :index
end

post "/" do
  name = params["name"]
  halt erb(:index, locals: { error_message: "Please provide the newsletter name." }) if name.blank?
  @inbox = Inbox.new Rack::Utils.escape_html(name)
  @entry = Entry.new(
    "“#{@inbox.name}” inbox created",
    "Kill the Newsletter!",
    Rack::Utils.escape_html(erb(:inbox)),
    true,
  )
  begin
    settings.storage.put_object(settings.bucket, @inbox.file, erb(:entry, layout: :feed))
    @inbox.persisted = true
  rescue
  end
  erb :index
end

post "/email" do
  html = ! email["html"].blank?
  @entry = Entry.new(
    Rack::Utils.escape_html(email.fetch("subject")),
    Rack::Utils.escape_html(email.fetch("from")),
    Rack::Utils.escape_html(email.fetch("subject")),
    Rack::Utils.escape_html(html ? email.fetch("html") : email.fetch("text")),
    html,
  )
  rendered_entry = erb :entry
  params.fetch("envelope").fetch("to").map do |email|
    begin
      token = email[0...-("@kill-the-newsletter.com".length)]
      file = "#{token}.xml"
      feed = settings.storage.get_object(settings.bucket, file)
      updated_feed = feed.sub(/\n<updated>.*?<\/updated>/, rendered_entry)
      truncated_feed = begin
        if updated_feed.length <= 2_000_000
          updated_feed
        else
          truncated_feed = updated_feed[0..2_000_000]
          # TODO
        end
      end
      settings.storage.put_object(settings.bucket, file, truncated_feed)
    rescue Fog::Errors::NotFound
      nil
    end
  end
  200
end

get "/feeds/:file" do
  begin
    file = settings.storage.get_object(settings.bucket, params.fetch("file"))
    content_type file.headers.fetch("Content-Type")
    file.body
  rescue Fog::Errors::NotFound
    404
  end
end

not_found do
  erb :index, locals: { error_message: "404 Not Found" }
end
