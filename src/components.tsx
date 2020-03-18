import React from "react";

export class Layout extends React.Component {
  render() {
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Document</title>
        </head>
        <body>{this.props.children}</body>
      </html>
    );
  }
}
