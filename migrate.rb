require "nokogiri"
require "open-uri"
require "logger"
require "./server"

logger = Logger.new "migrate.log"
FEEDS_TO_MIGRATE = "feeds-to-migrate.log"
unless File.file? FEEDS_TO_MIGRATE
  logger.fatal "‘#{FEEDS_TO_MIGRATE}’ not found"
  abort
end
Sinatra::Application.new.helpers.instance_eval do
  File.readlines(FEEDS_TO_MIGRATE).each do |feed_basename|
    begin
      feed_basename.strip!
      next if feed_basename.empty?
      feed_path = "public/feeds/#{feed_basename}"
      if File.file? feed_path
        logger.info "‘#{feed_basename}’ skipped because it has already been migrated"
        next
      end
      token = File.basename feed_path, ".xml"
      feed = open("https://www.kill-the-newsletter.com/feeds/#{feed_basename}").read
      if feed.strip.empty?
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
    <title>Kill the Newsletter! Malfunction · Action Required</title>
    <author><name>Kill the Newsletter!</name></author>
    <updated>#{now}</updated>
    <content type="text">
You were affected by a rare Kill the Newsletter! malfuction.

I lost your feed, including its name, and for a while you didn’t receive any updates.

I fixed the problem, and while past entries are lost forver, you should receive updates from now on.

As for the feed name, for now I had to rename it to “Kill the Newsletter!” To restore the original name of the feed, please write to me at kill-the-newsletter@leafac.com with the feed address and the name you want.

I’m sorry about the trouble. Please continue to enjoy your readings.
    </content>
  </entry>
</feed>
FEED
        logger.info "‘#{feed_basename}’ migrated: it was blank"
      else
        File.write feed_path, Nokogiri::XML(feed) { |config| config.noblanks }.to_xml
        logger.info "‘#{feed_basename}’ migrated"
      end
    rescue => e
      logger.fatal "‘#{feed_basename}’ migration failed: #{[e.message, *e.backtrace].join("\n")}"
    end
  end
end
