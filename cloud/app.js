
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var app = express();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body

// Subscribe Hooks
app.get('/subscribe', function(req, res) {
  publisher = req.query.publisher;
  res.render('subscribe', { publisher: publisher});
});

app.post('/subscribe', function(req, res) {
  console.log("Info: " + req.body.phone + " " + req.body.publisher);
  Parse.Cloud.run('subscribe', { phone: req.body.phone, publisher: req.body.publisher } )
});

// Attach the Express app to Cloud Code.
app.listen();
