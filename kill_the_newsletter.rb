require "sinatra"
require "sinatra/reloader" if development?
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

  private

    def self.fresh_token
      SecureRandom.urlsafe_base64(30).tr("-_", "")[0...20].downcase
    end
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
  end
  erb :index
end

# not_found do
#   erb :not_found
# end
