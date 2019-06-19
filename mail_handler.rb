require "mail"
require "nokogiri"
require "logger"
require "./server"

logger = Logger.new "mail_handler.log"
mail_string = nil
begin
  mail_string = STDIN.read
  mail = Mail.new mail_string
  token = Mail::Address.new(mail[:envelope_to].decoded).local.downcase
  return unless token =~ /\A[a-z0-9]{20,100}\z/
  feed_path = File.expand_path "../public/feeds/#{token}.xml", __FILE__
  return unless File.file? feed_path
  feed = Nokogiri::XML(File.read(feed_path)) { |config| config.strict.noblanks }
  part = mail.html_part || mail.text_part || mail
  feed.at_css("updated").replace(
    Sinatra::Application.new.helpers.erb(
      :entry,
      layout: false,
      locals: {
        title: mail.subject,
        author: mail[:from]&.decoded || mail.envelope_from,
        content_type: part.content_type =~ /html/ ? "html" : "text",
        content: part.decoded,
      }
    )
  )
  feed.at_css("entry:last-of-type").remove until feed.to_xml.length <= 500_000
  File.write feed_path, feed.to_xml
rescue => e
  logger.fatal [e.message, *e.backtrace, mail_string].join("\n")
  abort
end
