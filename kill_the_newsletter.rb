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

  def save
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

get "/" do
  erb :index
end

post "/" do
  name = params["name"]
  if name.nil? || name.strip.empty?
    @error = "Please provide the newsletter name."
  else
    @inbox = Inbox.from_name name
    unless @inbox.save
      @error = "Error creating “#{name}” inbox!<br>Please contact the <a href=\"mailto:kill-the-newsletter@leafac.com?subject=[Kill the Newsletter!] Error creating “#{name}” inbox with token “#{@inbox.token}”\">system administrator</a><br>with token “#{@inbox.token}”."
    end
  end
  erb :index
end

not_found do
  @error = "404 Not Found"
  erb :index
end
