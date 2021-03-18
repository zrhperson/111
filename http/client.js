const net = require("net");

class Request {
  constructor(options) {
    this.method = options.method || "GET";
    this.path = options.path || "/";
    this.host = options.host;
    this.port = options.port || 80;
    this.headers = options.headers || {};
    this.body = options.body || {};
    if (!this.headers["Content-Type"]) {
      this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    if ((this.headers["Content-Type"] = "application/json")) {
      this.bodyText = JSON.stringify(this.body);
    } else if (
      (this.headers["Content-Type"] = "application/x-www-form-urlencoded")
    ) {
      this.bodyText = Object.keys(this.body)
        .map((key) => `${key}=${encodeURIComponent(this.body[key])}`)
        .join("&");
    }
    this.headers["Content-Length"] = this.bodyText.length;
  }

  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map((key) => `${key}: ${this.headers[key]}`).join("\r\n")}
\r
${this.bodyText}`;
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      let parser = new ResponseParser();
      if (connection) {
        connection.write(this.toString());
      } else {
        connection = net.createConnection(
          {
            host: this.host,
            port: this.port,
          },
          () => {
            connection.write(this.toString());
          }
        );
      }
      connection.on("data", (data) => {
        parser.receive(data.toString());
        console.log('parser=====>');
        console.log(parser.statusLine);
        console.log(parser.header);
        connection.end();
      });
      connection.on("error", (err) => {
        reject(err)
        connection.end()
        console.log("server close");
      });
    });
  }
}

class Response {

}

class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;
    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;
    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;
    this.WAITING_HEADER_BLOCK_END = 6;
    this.WAITING_BODY = 7;
    
    this.current = this.WAITING_STATUS_LINE

    this.statusLine = '';
    this.header = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }
  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i));
    }
  }
  receiveChar(char) {
    if (this.current == this.WAITING_STATUS_LINE) {
      if (char == '\r') {
        this.current = this.WAITING_STATUS_LINE_END
      } else if (char == '\n') {
        this.current = this.WAITING_HEADER_NAME
      } else {
        this.statusLine += char;
      }
    } else if (this.current == this.WAITING_STATUS_LINE_END) {
      if (char == '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current == this.WAITING_HEADER_NAME) {
      if (char == ':') {
        this.current = this.WAITING_HEADER_SPACE
      } else if (char == '\r') {
        this.current = this.WAITING_HEADER_BLOCK_END
        if(this.header['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new TrunkedBodyParser()
        }
      } else {
        this.headerName += char;
      }
    } else if (this.current == this.WAITING_HEADER_SPACE) {
      if (char == ' ') {
        this.current = this.WAITING_HEADER_VALUE
      }
    } else if (this.current == this.WAITING_HEADER_VALUE) {
      if (char == '\r') {
        this.current = this.WAITING_HEADER_LINE_END
        this.header[this.headerName] = this.headerValue;
        this.headerName = '';
        this.headerValue = '';
      } else {
        this.headerValue += char;
      }
    } else if (this.current == this.WAITING_HEADER_LINE_END) {
      if (char == '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current == this.WAITING_HEADER_BLOCK_END) {
      if (char == '\n') {
        this.current = this.WAITING_BODY
      }
    } else if (this.current == this.WAITING_BODY) {
      this.bodyParser.receive(char);
    }


  }
}

class TrunkedBodyParser {
  constructor() {

  }
  receive(str){
    console.log(str);
  }
}

void async function () {
  let request = new Request({
    method: "POST",
    host: "127.0.0.1",
    path: "/",
    port: 8088,
    headers: {
      ["name"]: "zhourh",
    },
    body: {
      name: "zhourh",
    },
  });

  let response = await request.send();
}()

// const client = net.createConnection({
//     host: '127.0.0.1',
//     port: 8088,
// }, () => {
//   // 'connect' 监听器
//   console.log('已连接到服务器');
//   let request = new Request({
//       method: 'POST',
//       host: '127.0.0.1',
//       path: '/',
//       port: 8088,
//       headers: {
//           ['name']: 'zhourh',
//       },
//       body: {
//           name: 'zhourh',
//       }

//   })
//   client.write(request.toString());
// });
// client.on('data', (data) => {
//   console.log(data.toString());
//   client.end();
// });
// client.on('end', () => {
//   console.log('已从服务器断开');
// });
