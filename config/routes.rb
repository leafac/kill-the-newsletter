Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root 'inboxes#new'
  resources :inboxes, only: [:new, :create], path: '/', path_names: { new: '/' }
end
