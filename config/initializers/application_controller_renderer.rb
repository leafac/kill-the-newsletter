# Be sure to restart your server when you modify this file.

ActiveSupport::Reloader.to_prepare do
  ApplicationController.renderer.defaults.merge!(
    http_host: ENV.fetch('KILL_THE_NEWSLETTER_HOST') { 'localhost:3000' },
    https: ENV['KILL_THE_NEWSLETTER_HTTPS'].present?
  )
end
