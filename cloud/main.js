require('cloud/app.js');
var twilioClient = require('twilio')('ACb960362a91333ccc2a9865236929b3d6', '0ded54e15eda4b6f9afcdd22d7eb6aac');
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
function makeVerificationNumber() {
  var possible = "0123456789";
  var firstPossible = "123456789";
  var text = firstPossible.charAt(Math.floor(Math.random() * firstPossible.length));
 
  for( var i = 0; i < 5; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

Parse.Cloud.define("sendSMS", function(request, response) {
  twilioClient.sendSms({
      to: request.params.phone,
      from: "+15208348084",
      body: "Hi, Your validation code is " + request.params.verificationNumber
    }, function(err, responseData) { 
      if (err) {
        console.log(err);
      } else { 
        console.log(responseData.from); 
        console.log(responseData.body);
      }
    }
  );
 
  response.success("SendingSMS to " + request.params.phone);
});

Parse.Cloud.define("subscribe", function(request, response) {
  console.log("Info: " + request.params.phone + " " + request.params.publisher);
  userPhoneNumber = request.params.phone
  publisherName = request.params.publisher

  // Get user
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", userPhoneNumber)
  query.first({
    success: function(user) {
      // Check if user Exists
      if (user) {
        console.log("user exists")
        subscribeToPublisher(user, publisherName)
      } else {
        // Sign up user
        console.log("user does not exist")
        user = createUser(userPhoneNumber, publisherName)
      }

      
    },
    error: function(error) {
      console.log("error")
    }
  })
});


function createUser(userPhoneNumber, publisherName) {
  // Generate Verification Number
  var verificationNumber = makeVerificationNumber();

  // Set up user with phone as username and generated verification number as password
  var user = new Parse.User();
  user.set('username', userPhoneNumber);
  user.set('password', verificationNumber);
  user.set('verificationNumber', verificationNumber);
  user.set('verified', false);

  // Sign up user
  user.signUp(null).then(function(user) {
    var query = new Parse.Query(Parse.Role);
    query.equalTo('name', 'User');
    return query.first()
  }).then(function (role) {
    role.getUsers().add(user);
    role.save();
    subscribeToPublisher(user, publisherName)
    Parse.Cloud.run("sendSMS", {
      phone: userPhoneNumber,
      verificationNumber: verificationNumber
    })
  });
}

function subscribeToPublisher(user, publisherName) {
  var query = new Parse.Query(Parse.User)
  query.equalTo("username", publisherName)
  query.first({
    success: function(publisher) {
      Parse.Cloud.useMasterKey();
      var subscription = user.relation("subscription")
      subscription.add(publisher)
      user.save()
    },
    error: function() {

    }
  })
}