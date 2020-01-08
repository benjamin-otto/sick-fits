const nodemailer = require('nodemailer')

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const createEmail = text => `
  <div 
    class="email"
    style="border: 1px solid black; 
      border-radius: 3px; 
      padding: 20px; 
      font-family: sans-serif; 
      line-height: 2; 
      font-size: 20px;"
  >
    <h2>Hello my customer!</h2>
    <p>${text}</p>
    <p>🐯Ben</p>
  </div>
`

exports.transport = transport
exports.createEmail = createEmail