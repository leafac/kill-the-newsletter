class InboxMailer < ApplicationMailer
  MAXIMUM_FEED_SIZE = 500_000
  def receive email
    id = Mail::Address.new("<#{email.header[:envelope_to]}>").local.downcase
    return unless Token.token? id
    feed_path = Rails.root.join 'public', 'feeds', "#{id}.xml"
    return unless File.file? feed_path
    feed_string = File.read feed_path
    part = email.html_part || email.text_part || email
    entry = Entry.new(
      title: email.subject,
      author: email.envelope_from,
      content: part.body,
      content_type: part.content_type =~ /html/ ? 'html' : 'text'
    )
    entry_string = ApplicationController.renderer.new.render 'entries/_entry', locals: { entry: entry }
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
end
