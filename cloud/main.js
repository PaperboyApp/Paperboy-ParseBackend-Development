require('cloud/app.js')
var twilioClient = require('twilio')('ACb960362a91333ccc2a9865236929b3d6', '0ded54e15eda4b6f9afcdd22d7eb6aac')
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
function makeVerificationNumber() {
  var possible = "0123456789"
  var firstPossible = "123456789"
  var text = firstPossible.charAt(Math.floor(Math.random() * firstPossible.length))
 
  for( var i = 0; i < 5; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length))

  return text
}

// Send SMS to phone and body in params
Parse.Cloud.define("sendSMS", function(request, response) {
  twilioClient.sendSms({
      to: request.params.phone,
      from: "+15208348084",
      body: request.params.body
    }, function(err, responseData) {
      if (err) {
        console.log(err)
      } else { 
        response.success()
      }
    }
  )
})

// Subscribe a user
Parse.Cloud.define("subscribe", function(request, response) {
  userPhoneNumber = request.params.phone
  publisherName = request.params.publisher

  // Get user
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", userPhoneNumber)
  query.first({
    success: function(user) {
      if (user) {
        // If exists
        if (publisherName) {
          // Subscribe to publisher
          subscribeToPublisher(user, publisherName)
        } else {
          if (user.get("verified")) {
            response.success(user.get("verificationNumber"))
          }
        }
      } else {
        // If not exists create
        user = createUser(userPhoneNumber)
        if (publisherName) {
          // Subscribe to publisher send download link
          subscribeToPublisher(user, publisherName)
          Parse.Cloud.run("sendSMS", {
            phone: userPhoneNumber,
            body: "Download link"
          })
        } else {
          // Send verification number
          Parse.Cloud.run("sendSMS", {
            phone: userPhoneNumber,
            body: "Your code: " + user.get('verificationNumber')
          })
        }
      }
      response.success()
    },
    error: function(error) {

    }
  })
})

// Get verification number
Parse.Cloud.define("getVerificationNumber", function(request, response) {
  Parse.Cloud.useMasterKey()
  phone = request.params.phone

  // Look for user
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", phone)

  query.first({
    success: function(user) {
      if (!user) {
        user = createUser(phone)
      }
      Parse.Cloud.run("sendSMS", {
        phone: phone,
        body: "Your code: " + user.get('verificationNumber')
      })
      response.success()
    },
    error: function(error) {
      response.error(error)
    }
  })
})

Parse.Cloud.define("publish", function(request, response) {
  // Retrieve parameters
  headlineText = request.params.headline
  url = request.params.url
  publisherName = request.params.publisher

  var query = new Parse.Query(Parse.User)
  query.equalTo("username", publisherName)

  query.first().then(function (publisher) {
    Parse.Cloud.useMasterKey()

    // Send Push
    Parse.Push.send({
      channels: [publisher.get("username")],
      data: {
        alert: publisher.get("username") + " - " + headlineText,
        u: url
      }
    }, {
      success: function() {
        console.log("pushes sent")
        response.success()
      },
      error: function(error) {
        response.error(error)
      }
    })

    // Create and save headline
    var Headline = Parse.Object.extend("headline")
    var headline = new Headline()
    headline.set("publisher", publisher.get("username"))
    headline.set("headlineText", headlineText)
    headline.set("url", url)
    headline.save().then(function () {
      // Save headline to publisher
      var relation = publisher.relation("headlines")
      relation.add(headline)
      publisher.save()
    })
  })
})

// Create user
function createUser(userPhoneNumber) {
  // Generate Verification Number
  var verificationNumber = makeVerificationNumber()

  // Set up user with phone as username and generated verification number as password
  var user = new Parse.User()
  user.set('username', userPhoneNumber)
  user.set('password', verificationNumber)
  user.set('verificationNumber', verificationNumber)
  user.set('verified', false)

  // Sign up user
  user.signUp(null).then(function(user) {
    // Get user inside User role
    var query = new Parse.Query(Parse.Role)
    query.equalTo('name', 'User')
    return query.first()
  }).then(function (role) {
    Parse.Cloud.useMasterKey()
    role.getUsers().add(user)
    role.save()
  })

  return user
}

function subscribeToPublisher(user, publisherName) {
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", publisherName)
  query.first({
    success: function(publisher) {
      Parse.Cloud.useMasterKey()
      var subscription = user.relation("subscription")
      subscription.add(publisher)
      user.save()
    },
    error: function() {

    }
  })
}