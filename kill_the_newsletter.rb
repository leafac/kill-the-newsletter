require "sinatra"
require "sinatra/reloader" if development?
require "fog/backblaze"
require "securerandom"
require "date"

Inbox = Struct.new :name, :token do
  def initialize name
    super name, Token.fresh
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

  def urn
    "urn:kill-the-newsletter:#{token}"
  end

  def save storage
    # storage.put_object(ENV.fetch("B2_BUCKET"), file, "hello world")
    @persisted = true
  end

  def persisted?
    !! @persisted
  end
end

Entry = Struct.new :id, :title, :author, :created_at, :content, :html do
  def initialize title, author, content, html
    super Token.fresh, title, author, DateTime.now.rfc3339, content, html
  end

  def from_email email
    html = ! email["html"].blank?
    new(
      email.fetch("subject"),
      email.fetch("from"),
      email.fetch("subject"),
      html ? email.fetch("html") : email.fetch("text"),
      html,
    )
  end

  def html?
    !! html
  end
end

module Token
  def self.fresh
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
  if name.blank?
    @error = "Please provide the newsletter name."
  else
    @inbox = Inbox.new name
    @inbox.save settings.storage
  end
  erb :index
end

post "/email" do
  logger.info params
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
  @error = "404 Not Found"
  erb :index
end
