require "mail"
require "./server"

mail = Mail.new STDIN.read
token = Mail::Address.new(mail.smtp_envelope_to.first).local # TODO: Remove ‘.first’
# feed = File.read File.expand_path("../public/feeds/#{token}.xml", __FILE__) rescue return
part = mail.multipart? ? mail.html_part || mail.text_part : mail
# part.content_type_parameters => {'charset' => 'ISO-8859-1'}
entry = Sinatra::Application.new!.instance_eval do
  erb :entry, layout: false, locals: {
    title: mail.subject,
    author: mail.smtp_envelope_from, # mail.from.addresses (LIST) OR mail.sender.address OR mail.envelope_from OR mail.smtp_envelope_from OR mail.reply_to (LIST)
    content_type: part.text? ? "text" : "html",
  } do
    part.decoded
  end
end

puts entry
