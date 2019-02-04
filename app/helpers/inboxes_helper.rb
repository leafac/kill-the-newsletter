module InboxesHelper
  def inbox_email_address inbox
    "#{ inbox.id }@#{ Rails.configuration.email_host }"
  end

  def inbox_feed_url inbox
    "#{ root_url }feeds/#{ inbox.id }.xml"
  end
end
