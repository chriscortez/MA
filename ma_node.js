#!/usr/bin/env node

var GroupMe = require('groupme');
var API = GroupMe.Stateless;
var upcomingShows = {
  1387347472318: 'Beat Kitchen',
  1388296800000: 'Quenchers',
  1389592800000: 'Township',
  1390284000000: 'Burlington'
};

var months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

var BOT_LISTENS_FOR = "hey ma";
var GET_UPCOMING_SHOWS = "upcoming shows";

/************************************************************************
 * Read the access token from the command line.
 ***********************************************************************/

// No command line arguments, we blow out. We need an access token.

if (process.argv.length < 3) {
    console.log("Usage: node HelloBot.js ACCESS_TOKEN [user_id] [botname]");
    console.log("  Passing only ACCESS_TOKEN - returns user and group info");
    console.log("  Passing ACCESS_TOKEN, USER_ID, GROUP_ID, BOT_NAME - creates a new group");
    console.log("  Passing ACCESS_TOKEN, USER_ID, BOT_NAME - starts up the bot");
    process.exit(1);
} 
var ACCESS_TOKEN = process.argv[2];


/************************************************************************
 * Getting the bot configured and set up:
 ***********************************************************************/

if (process.argv.length == 3) {
    
    // Step 1: Only an access token, we request the user id

    API.Users.me(ACCESS_TOKEN, function(err,ret) {
      if (!err) {
        console.log("Your user id is", ret.id, "and your name is", ret.name);        
      } else {
        console.log("ERROR!", err)
      }
    });  

    API.Bots.index(ACCESS_TOKEN, function(err,ret) {
      if (!err) {
        console.log("Your bots are:")
        console.log(ret);
      } else {
        console.log("ERROR!", err)
      }
    });

    API.Groups.index(ACCESS_TOKEN, function(err,ret) {
      if (!err) {
        var names = [];
        for (var i = 0; i < ret.length; i++) {
          names.push({"name":ret[i].name, "id":ret[i].id});
        }
        console.log("Your groups are:")
        console.log(names); 
      } else {
        console.log("ERROR!", err)
      }
    });

} else if (process.argv.length == 6) {

    // Step 2: Create a bot with the given name 

    var USER_ID  = process.argv[3];
    var GROUP_ID = process.argv[4];
    var BOT_NAME = process.argv[5];

    API.Bots.create(ACCESS_TOKEN, BOT_NAME, GROUP_ID, {}, function(err,ret) {
        if (!err) {
            console.log(ret);
        } else {
            console.log("Error creating bot!")
        }
    });

} else {

    // Step 3: Now we have a bot registered and we can start up.

    var USER_ID  = process.argv[3];
    var BOT_NAME = process.argv[4];

    /************************************************************************
     * Set up the message-based IncomingStream and the HTTP push
     ***********************************************************************/

    var bot_id = null;

    var retryCount = 3;

    // Constructs the IncomingStream, identified by the access token and 
    var incoming = new GroupMe.IncomingStream(ACCESS_TOKEN, USER_ID, null);

    /*
    // This logs the status of the IncomingStream
    incoming.on('status', function() {
        var args = Array.prototype.slice.call(arguments);
        var str = args.shift();
        console.log("[IncomingStream 'status']", str, args);
    });
    */

    // This waits for the IncomingStream to complete its handshake and start listening.
    // We then get the bot id of a specific bot.
    incoming.on('connected', function() {
        console.log("[IncomingStream 'connected']");

        API.Bots.index(ACCESS_TOKEN, function(err,ret) {
            if (!err) {
                var botdeets;
                for (var i = 0; i < ret.length; i++) {
                    if (ret[i].name == BOT_NAME) {
                        bot_id = ret[i].bot_id;
                    }
                }
                console.log("[API.Bots.index return] Firing up bot!", bot_id);
            }
        });

    });

    // This waits for messages coming in from the IncomingStream
    // If the message contains @BOT, we parrot the message back.
    incoming.on('message', function(msg) {
        console.log("[IncomingStream 'message'] Message Received");

        var message = "";
        if (msg["data"] 
            && msg["data"]["subject"] 
            && msg["data"]["subject"]["text"]) {
            message = msg["data"]["subject"]["text"].toLowerCase();
            if (message.indexOf(BOT_LISTENS_FOR) >= 0) {
              if (bot_id && msg["data"]["subject"]["name"] != "BOT") {

                var reply = "";
                if (message.indexOf(GET_UPCOMING_SHOWS) >= 0) {
                  var day, month, dateObj;
                  var location;
                  for (var timestamp in upcomingShows) {
                    if (upcomingShows.hasOwnProperty(timestamp)) {
                      location = upcomingShows[timestamp];

                      dateObj = new Date(parseInt(timestamp));
                      month = months[dateObj.getUTCMonth()];
                      day = dateObj.getUTCDate();

                      reply += month + " " + day + " at " + location + "\n";
                    }
                  }
                } else {
                  reply = "Yes, my child?";
                }

                API.Bots.post(
                    ACCESS_TOKEN, // Identify the access token
                    bot_id, // Identify the bot that is sending the message
                    reply, // Construct the message
                    {}, // No pictures related to this post
                    function(err,res) {
                        if (err) {
                            console.log("[API.Bots.post] Reply Message Error!");
                        } else {
                            console.log("[API.Bots.post] Reply Message Sent!");
                        }
                    });
              }
            }
        }

    });

    // This listens for the bot to disconnect
    incoming.on('disconnected', function() {
        console.log("[IncomingStream 'disconnect']");
        if (retryCount > 3) {
            retryCount = retryCount - 1;
            incoming.connect();    
        }
    })

    // This listens for an error to occur on the Websockets IncomingStream.
    incoming.on('error', function() {
        var args = Array.prototype.slice.call(arguments);
        console.log("[IncomingStream 'error']", args);
        if (retryCount > 3) {
            retryCount = retryCount - 1;
            incoming.connect();    
        }
    })


    // This starts the connection process for the IncomingStream
    incoming.connect();

}
