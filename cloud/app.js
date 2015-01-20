
// These two lines are required to initialize Express in Cloud Code.
var express = require('express')
var app = express()

// Global app configuration section
app.set('views', 'cloud/views')  // Specify the folder to find templates
app.set('view engine', 'ejs')    // Set the template engine
app.use(express.bodyParser())    // Middleware for reading request body

// Subscribe Hooks
app.get('/subscribe', function(req, res) {
  publisher = req.query.publisher
  res.render('subscribe', { publisher: publisher})
})

app.post('/subscribe', function(req, res) {
  Parse.Cloud.run('subscribe', { phone: req.body.phone, publisher: req.body.publisher } )
})

// Publish Hooks
app.get('/publish', function(req, res) {
  publisher = req.query.publisher
  res.render('publish', { publisher: publisher })
})

app.post('/publish', function(req, res) {
  Parse.Cloud.run('publish', { publisher: req.body.publisher, headline: req.body.headline, url: req.body.url })
})

// Support
app.get('/support', function(req, res) {
  res.send("<a href='mailto:alvaro@getpaperboy.com'>Contact Us</a>")
})
 
// Attach the Express app to Cloud Code.
app.listen()
