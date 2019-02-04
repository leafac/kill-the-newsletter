class Entry
  include ActiveModel::Model

  attr_accessor :id, :title, :author, :content, :content_type, :created_at

  def initialize(*args)
    super(*args)
    @id ||= Token.generate
    @created_at ||= Time.now
  end
end
