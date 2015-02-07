require('cloud/app.js')
var twilioClient = require('twilio')('ACb46ab11abd0573c4304d638fa641e301', '21588f510e17d38180c4329d3ebe9252')

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
      from: "+18122024619",
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
        if (publisherName) {
          console.log("Create and subscribe")
          user = createAndSubscribeUser(userPhoneNumber, publisherName)
          // Subscribe to publisher send download link
          Parse.Cloud.run("sendSMS", {
            phone: userPhoneNumber,
            body: "Click on the link below to get the latest " + publisherName + " headlines via the Paperboy app. \n" + "http://bit.ly/getpaperboy"
          })
        } else {
          user = createAndSubscribeUser(userPhoneNumber)
          // Send verification number
          Parse.Cloud.run("sendSMS", {
            phone: userPhoneNumber,
            body: "Your code: " + user.get('verificationNumber')
          })
        }
      }
    },
    error: function(error) {
      console.log(error)
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

  query.first().then(function (user) {
    if (!user) {
      user = createAndSubscribeUser(phone)
    }
    Parse.Cloud.run("sendSMS", {
      phone: phone,
      body: "Your code: " + user.get('verificationNumber')
    })

    return user
  })

})

Parse.Cloud.define("publish", function(request, response) {
  // Retrieve parameters
  Parse.Cloud.useMasterKey()
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
function createAndSubscribeUser(userPhoneNumber, publisherName) {
  Parse.Cloud.useMasterKey()
  // Generate Verification Number
  var verificationNumber = makeVerificationNumber()

  // Set up user with phone as username and generated verification number as password
  var user = new Parse.User()
  user.set('username', userPhoneNumber)
  user.set('password', verificationNumber)
  user.set('verificationNumber', verificationNumber)
  user.set('verified', false)
  console.log('before sign up')
  // Sign up user
  user.signUp(null).then(function (user) {
    console.log('after signup')
    Parse.Cloud.useMasterKey()
    user.setACL(new Parse.ACL(user))
    if (publisherName) {
      subscribeToPublisher(user, publisherName)
    } else {
      user.save()
    }
    var roleQuery = new Parse.Query(Parse.Role)
    console.log("role query")
    roleQuery.equalTo("name", "User")
    roleQuery.first().then(function (role) {
      console.log("saving to role " + role)
      role.getUsers().add(user)
      role.save()
    })
  })

  return user
}

function subscribeToPublisher(user, publisherName) {
  Parse.Cloud.useMasterKey()
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", publisherName)
  query.first().then(function (publisher) {
    Parse.Cloud.useMasterKey()
    var subscription = user.relation("subscription")
    subscription.add(publisher)
    user.save()
  })
}