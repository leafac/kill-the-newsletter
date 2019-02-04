module Token
  def self.generate
    SecureRandom.alphanumeric(20).downcase
  end

  def self.token? token
    token =~ /[a-z0-9]{20}/
  end
end
