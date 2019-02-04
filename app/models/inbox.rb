class Inbox
  include ActiveModel::Model

  attr_accessor :id, :name

  validates :name, presence: true, length: { maximum: 500 }

  def initialize(*args)
    super(*args)
    @id ||= Token.generate
  end
end
