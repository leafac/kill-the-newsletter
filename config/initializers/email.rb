# Be sure to restart your server when you modify this file.

Rails.application.config.email_host = ENV.fetch('KILL_THE_NEWSLETTER_EMAIL_HOST') { 'localhost' }
