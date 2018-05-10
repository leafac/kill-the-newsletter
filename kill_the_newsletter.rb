require "sinatra"
require "sinatra/reloader" if development?
require "fog/backblaze"
require "securerandom"

Inbox = Struct.new :name, :token do
  def self.from_name name
    new name, fresh_token
  end

  def email
    "#{token}@kill-the-newsletter.com"
  end

  def feed
    "https://www.kill-the-newsletter.com/feeds/#{token}.xml"
  end

  def save storage
    storage.put_object(ENV.fetch("B2_BUCKET"), "#{token}.xml", "hello world")
    @persisted = true
  end

  def persisted?
    !! @persisted
  end

  private

    def self.fresh_token
      SecureRandom.urlsafe_base64(30).tr("-_", "")[0...20].downcase
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
end

get "/" do
  erb :index
end

post "/" do
  name = params["name"]
  if name.nil? || name.strip.empty?
    @error = "Please provide the newsletter name."
  else
    @inbox = Inbox.from_name name
    @inbox.save settings.storage
  end
  erb :index
end

post "/email" do
  logger.info params
  200
end

not_found do
  @error = "404 Not Found"
  erb :index
end
