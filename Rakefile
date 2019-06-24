require "rake/testtask"
require "nokogiri"

task default: :test

Rake::TestTask.new { |t| t.test_files = ["test.rb"] }

desc "Check that feeds are parseable with Nokogiri"
task :check_feeds do
  Dir["public/feeds/*.xml"].each do |feed_path|
    Nokogiri::XML(File.read(feed_path)) { |config| config.strict.noblanks }
  end
end
