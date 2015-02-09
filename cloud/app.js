
// These two lines are required to initialize Express in Cloud Code.
var express = require('express')
var app = express()

// Global app configuration section
app.set('views', 'cloud/views')  // Specify the folder to find templates
app.set('view engine', 'ejs')    // Set the template engine
app.use(express.bodyParser())    // Middleware for reading request body

// Home Hook
app.get('/', function(req, res) {
  res.render('index', { layout: 'home' })
})

app.get('/privacy', function(req, res) {
  res.render('index', { layout: 'privacy' })
})

app.get('/terms', function(req, res) {
  res.render('index', { layout: 'terms' })
})

app.get('/demo/:publisher', function(req, res) {
  res.render('index', { layout: 'demo', publisher: req.params.publisher })
})

// Subscribe Hooks
app.get('/subscribe', function(req, res) {
  publisher = req.query.publisher
  res.render('subscribe', { publisher: publisher})
})

app.post('/subscribe', function(req, res) {
  Parse.Cloud.run('subscribe', { phone: req.body.phone, publisher: req.body.publisher } )
  res.render('subscribe', {publisher: req.body.publisher})
})

// Publish Hooks
app.get('/publish', function(req, res) {
  publisher = req.query.publisher
  res.render('publish', { publisher: publisher })
})

app.post('/publish', function(req, res) {
  Parse.Cloud.run('publish', { publisher: req.body.publisher, headline: req.body.headline, url: req.body.url })
})
 
// Attach the Express app to Cloud Code.
app.listen()
