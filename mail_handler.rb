require "mail"
require "nokogiri"
require "./server"

mail = Mail.new STDIN.read
token = Mail::Address.new(mail[:envelope_to].value).local.downcase
return unless token =~ /\A[a-z0-9]{20,100}\z/
feed_path = File.expand_path "../public/feeds/#{token}.xml", __FILE__
return unless File.file? feed_path
feed = Nokogiri::XML(File.read(feed_path)) { |config| config.strict.noblanks }
part = mail.html_part || mail.text_part || mail
# https://github.com/honeybadger-io/incoming/blob/00d6184855fa806222386c2cbb7f4111ee8d2fb1/lib/incoming/strategies/sendgrid.rb#L21-L34
# https://github.com/thoughtbot/griddler/blob/7690cc31ded0f834b77160f1d85217b85d3480cd/lib/griddler/email.rb#L155
# https://robots.thoughtbot.com/fight-back-utf-8-invalid-byte-sequences
# https://github.com/robforman/sendgrid-parse/blob/658337e29eb6dc164457cfdabb2cc766e5f2213d/lib/sendgrid-parse/encodable_hash.rb
# https://zenlikeai.wordpress.com/2013/04/06/sendgrid-parse-incoming-email-encoding-errors-for-rails-apps-using-postgresql/
# https://github.com/mikel/mail
# ActiveSupport Unicode.tidy_bytes
# http://norman.github.io/utf8_utils/
# String.scrub
# https://github.com/brianmario/charlock_holmes
fix_encoding = -> text {
  if text.valid_encoding?
    text
  else
    text.force_encoding(part.content_type_parameters.fetch("charset", "binary").strip)
        .encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
  end.gsub(/[[:cntrl:]]/, "")
}
feed.at_css("updated").replace(
  Sinatra::Application.new.helpers.erb(
    :entry,
    layout: false,
    locals: {
      title: fix_encoding[mail.subject],
      author: fix_encoding[mail[:from]&.value || mail.envelope_from],
      content_type: part.content_type =~ /html/ ? "html" : "text",
      content: fix_encoding[part.decoded],
    }
  )
)
feed.at_css("entry:last-of-type").remove until feed.to_s.length <= 500_000
File.write feed_path, feed.to_xml

# LOGGER
#   rescue => e
#     logger.fatal e.message
#     logger.fatal e.backtrace.join("\n")
#     raise e
#   end
