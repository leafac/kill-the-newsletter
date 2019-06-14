require "minitest/autorun"
require "rack/test"
require "nokogiri"
require "open3"
require "./server"

class TestKillTheNewsletter < Minitest::Test
  include Rack::Test::Methods

  def app() Sinatra::Application end

  def test_create_inbox
    skip
    post "/", name: "My Favorite Newsletter"
    @token = last_response.body[/(.{20})@kill-the-newsletter.com/, 1]
    refute_nil @token
    assert File.exist?(feed_path)
    assert_feed_valid_xml
    assert feed.include?("Created")
    previous_feed_length = feed.length
    send_email
    assert_feed_valid_xml
    assert feed.length > previous_feed_length
    200.times do
      send_email
      assert feed.length < 500_000
    end
    assert_feed_valid_xml
    refute feed.include?("Created")
  end

  def test_create_inbox_without_name
    post "/"
    assert_equal 400, last_response.status
  end

  def test_create_inbox_with_blank_name
    post "/", name: "    "
    assert_equal 400, last_response.status
  end

  def test_create_inbox_with_long_name
    post "/", name: "a" * 501
    assert_equal 400, last_response.status
  end

  def test_receive_email_for_nonexistent_inbox
    skip
    @token = "NONEXISTENT-INBOX"
    send_email
  end

  private

  def feed_path() "public/feeds/#{@token}.xml" end
  def feed() File.read(feed_path) end
  def assert_feed_valid_xml() Nokogiri::XML(feed) { |config| config.strict } end
  def send_email() Open3.capture2("bundle exec ruby email_handler.rb", stdin_data: <<-EMAIL) end
From sender@example.com Fri Jun 14 19:48:19 2019
Return-path: <sender@example.com>
Envelope-to: #{@token}@kill-the-newsletter.com
Delivery-date: Fri, 14 Jun 2019 19:48:19 -0400
Received: from [127.0.0.1] (helo=original-email.txt)
	by leafac-laptop.local with esmtp (Exim 4.92)
	(envelope-from <sender@example.com>)
	id PT44SJ-001ONB-IH
	for #{@token}@kill-the-newsletter.com; Fri, 14 Jun 2019 19:48:19 -0400
From: Publisher <publisher@example.com>
To: Subscriber <subscriber@example.com>
Subject: A Newsletter Entry
Date: Fri, 14 Jun 2019 14:57:16

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque in ante lacus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vulputate, risus et mattis viverra, mauris arcu interdum leo, ac sodales lacus quam id mi. Duis volutpat tincidunt orci, sed venenatis nunc. Sed erat sem, aliquam eget enim posuere, blandit placerat dui. Etiam cursus feugiat quam in malesuada. Integer consectetur tempor metus vel laoreet. Duis arcu eros, euismod nec urna ac, tristique semper risus.

Donec commodo eleifend lectus, non maximus nisl. Ut luctus tellus risus, malesuada lobortis velit tempor a. Nullam nec placerat velit. Sed in purus est. Suspendisse quis ante ante. Sed nunc ipsum, dictum a lacinia quis, facilisis sed ex. Maecenas finibus enim vel tortor imperdiet tincidunt. Donec vehicula ligula nec augue sollicitudin, nec sagittis massa volutpat. Phasellus posuere sollicitudin neque, in finibus ipsum viverra in.

Vestibulum et massa purus. Nam sit amet erat interdum, commodo mauris nec, convallis arcu. Quisque nibh libero, elementum ac sapien ut, accumsan sollicitudin massa. Cras ornare suscipit semper. Etiam id dui tincidunt, pretium elit ac, elementum neque. Mauris id lorem tincidunt, venenatis mi ac, tincidunt elit. Nunc ullamcorper venenatis ipsum, eu sollicitudin orci condimentum nec. Suspendisse fringilla velit est, eu facilisis ante mattis at. Nulla convallis efficitur orci et euismod.

Fusce eget sapien ac mauris lobortis condimentum vitae non dui. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum mi quam, dignissim ut lorem id, lacinia accumsan nisi. Pellentesque luctus orci at tellus mollis, quis cursus mi tristique. Duis feugiat libero sed metus volutpat lobortis. Aenean eget tortor nec tortor euismod fermentum. Cras lobortis purus magna, eu rutrum magna commodo nec.

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Morbi finibus sed sem et faucibus. Aenean gravida sem eget nibh gravida, ut ornare nisi iaculis. Proin eleifend risus vitae tristique commodo. Nam quis urna neque. Nullam et lacus a tellus egestas hendrerit id id erat. Vestibulum at interdum leo, non rutrum libero. Praesent ultrices facilisis justo, vitae tempor mi vehicula quis. Quisque et erat tempor, ornare est interdum, convallis arcu. Nullam ut semper nibh. Ut mauris ex, hendrerit posuere lobortis vel, gravida a massa. Quisque eu rutrum nibh. Phasellus a condimentum nisl. Curabitur sit amet vestibulum nisi. Fusce nec accumsan ex, non semper eros.
EMAIL
end
