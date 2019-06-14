require "sinatra"

get "/" do
  erb :new
end

post "/" do
  @name = params["name"]
  halt 400 if @name.nil? || @name.strip.empty? || @name.length > 500
  @token = fresh_token
  File.write "public/feeds/#{@token}.xml", erb(:feed, layout: false)
  erb :created
end

helpers do
  def fresh_token
    SecureRandom.alphanumeric(20).downcase
  end

  def h text
    Rack::Utils.escape_html text
  end
end
