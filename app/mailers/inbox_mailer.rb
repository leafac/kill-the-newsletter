class InboxMailer < ApplicationMailer
  MAXIMUM_FEED_SIZE = 500_000
  def receive email
    id = Mail::Address.new("<#{email.header[:envelope_to]}>").local.downcase
    return unless Token.token? id
    feed_path = Rails.root.join 'public', 'feeds', "#{id}.xml"
    return unless File.file? feed_path
    feed_string = File.read feed_path
    part = email.html_part || email.text_part || email
    body = part.body.decoded
                    .force_encoding(part.content_type_parameters.fetch('charset', 'binary').strip)
                    .encode('UTF-8', invalid: :replace, undef: :replace, replace: '')
    entry = Entry.new(
      title: fix_encoding(email.subject),
      author: fix_encoding(email.envelope_from),
      content: fix_encoding(body),
      content_type: part.content_type =~ /html/ ? 'html' : 'text'
    )
    entry_string = ApplicationController.renderer.new.render 'entries/_entry', locals: { entry: entry }
    feed_string = fix_encoding feed_string
    entry_string = fix_encoding entry_string
    updated_feed_string = feed_string.sub /<updated>.*?<\/updated>/, entry_string
    if updated_feed_string.bytesize > MAXIMUM_FEED_SIZE
      updated_feed_string = updated_feed_string.byteslice 0, MAXIMUM_FEED_SIZE
      updated_feed_string = updated_feed_string[/.*<\/entry>/m] || updated_feed_string[/.*?<\/updated>/m]
      updated_feed_string += "\n</feed>"
    end
    File.write feed_path, updated_feed_string
  rescue => e
    logger.fatal e.message
    logger.fatal e.backtrace.join("\n")
    raise e
  end

  private

    # https://github.com/honeybadger-io/incoming/blob/00d6184855fa806222386c2cbb7f4111ee8d2fb1/lib/incoming/strategies/sendgrid.rb#L21-L34
    # https://github.com/thoughtbot/griddler/blob/7690cc31ded0f834b77160f1d85217b85d3480cd/lib/griddler/email.rb#L155
    # https://robots.thoughtbot.com/fight-back-utf-8-invalid-byte-sequences
    # https://github.com/robforman/sendgrid-parse/blob/658337e29eb6dc164457cfdabb2cc766e5f2213d/lib/sendgrid-parse/encodable_hash.rb
    # https://zenlikeai.wordpress.com/2013/04/06/sendgrid-parse-incoming-email-encoding-errors-for-rails-apps-using-postgresql/
    def fix_encoding string
      if string.valid_encoding?
        string
      else
        string.force_encoding('binary').encode('UTF-8', invalid: :replace, undef: :replace, replace: '')
      end
    end
end
