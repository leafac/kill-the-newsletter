require "nokogiri"
require "./server"

Sinatra::Application.new.helpers.instance_eval do
  Dir["public/feeds/*"].each do |feed_path|
    token = File.basename feed_path, ".xml"
    feed_string = File.read feed_path
    if feed_string.strip.empty?
      File.write feed_path, <<-FEED
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" type="application/atom+xml" href="https://www.kill-the-newsletter.com/feeds/#{token}.xml"/>
  <link rel="alternate" type="text/html" href="https://www.kill-the-newsletter.com/"/>
  <title>Kill the Newsletter!</title>
  <subtitle>Kill the Newsletter! Inbox “#{token}@kill-the-newsletter.com”</subtitle>
  <id>urn:kill-the-newsletter:#{token}</id>
  <updated>#{now}</updated>
  <entry>
    <id>urn:kill-the-newsletter:#{fresh_token}</id>
    <title>Kill the Newsletter! Bug · Action Required</title>
    <author><name>Kill the Newsletter!</name></author>
    <updated>#{now}</updated>
    <content type="text">
I’m sorry, but you hit a rare Kill the Newsletter! bug. I fixed the bug, but I lost your feed in the process. For a while you didn’t receive any updates, but they must be working from now on. I also lost the name of the inbox. For now, I renamed it to “Kill the Newsletter!”. To fix this, please contact me at kill-the-newsletter@leafac.com with the feed address and the name you’d like.
    </content>
  </entry>
</feed>
FEED
      puts "Fixed #{token}"
    end
    begin
      Nokogiri::XML(feed_string) { |config| config.strict.noblanks }
    rescue Nokogiri::XML::SyntaxError => e
      puts "Problem with #{token}: #{e}"
    end
  end
end
