require "sinatra"
require "sinatra/reloader" if development?

get "/" do
  erb :index
end

__END__

@@ index

<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title></title>
  </head>
  <body>
    With Puma and inline templates
  </body>
</html>
