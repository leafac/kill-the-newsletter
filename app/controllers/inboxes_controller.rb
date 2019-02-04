class InboxesController < ApplicationController
  def new
    @inbox = Inbox.new
  end

  def create
    @inbox = Inbox.new params.require(:inbox).permit(:name)
    render :new and return unless @inbox.valid?
    File.write(
      Rails.root.join('public', 'feeds', "#{@inbox.id}.xml"),
      ApplicationController.renderer.new.render('inboxes/feed', assigns: { inbox: @inbox })
    )
  end
end
