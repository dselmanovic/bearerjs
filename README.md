BearerJS
========

NodeJS/ExpressJS module for Bearer/Token authentication.
Often used for RESTful API, Smartphones etc to authenticate users without active session

Backward compatibility remark for version 0.0.19
=====
`onUnauthorized` function does not automatically send the response. You will need to handle it (see example below)

Usage
=====

You can find fully functional demo at:
```
https://github.com/dselmanovic/BearerJSDemo
```

Or more advanced demo with database connection at:
```
https://github.com/dselmanovic/RestApiStack
```
Thanks to [Brian Carlson](https://github.com/brianc) for help with connection to PostgreSQL

In your NodeJS app
------------------
In your ExpressJS application init script, add the following before setting any other route. You will notice that you are free to create token content as you like.

```javascript
var bearer = require('bearer');
var app = express();
//Setup authentication
//This should be done before all routes are configured to assure that authorization will be first to execute
bearer({
    //Make sure to pass in the app (express) object so we can set routes
    app:app,
    //Please change server key for your own safety!
    serverKey:"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678",
    tokenUrl:'/token', //Call this URL to get your token. Accepts only POST method
    extendTokenUrl:'/extendtoken', //Call this URL to get your token. Accepts only POST method
    cookieName:'x-auth', //default name for getting token from cookie when not found in Authorization header
    createToken:function(req, next, cancel){
        //If your user is not valid just return "underfined" from this method.
        //Your token will be added to req object and you can use it from any method later
        var username=req.body.username;
        //var password=req.body.password;
        //You get the idea how to use next and cancel callbacks, right?
        if (true){
            next({
                expire: moment(Date.now()).add('days', 1).format('YYYY-MM-DD HH:mm:ss'),
                username: username,
                contentType: req.get('Content-Type'),
                ip: req.ip,
                userAgent: req.header('user-agent'),
                custom_id: '55555',
                another: 'Some data you need in your token',
                moreData: 'Some more data you need'
            });
        }else{
            cancel({code:1000, message: 'I do not like you'});
        }
    },
    extendToken:function(req, next, cancel){
        var token=req.authToken;
        if (token){
            next({
                expire: moment(Date.now()).add('days', 1).format('YYYY-MM-DD HH:mm:ss'),
                username: token.username,
                contentType: req.get('Content-Type'),
                ip: req.ip,
                userAgent: req.header('user-agent'),
                custom_id: '55555',
                another: 'Some data you need in your token',
                moreData: 'Some more data you need'
            });
        }else{
            cancel();
        }
    },
    validateToken:function(req, token){
        //you could also check if request came from same IP using req.ip==token.ip for example
        if (token){
            return moment(token.expire)>moment(new Date());
        }
        return false;
    },
    onTokenValid:function(token, next, cancel){
        //This is in case you would like to check user account status in DB each time he attempts to do something.
        //Doing this will affect your performance but its your choice if you really need it
        //Returning false from this method will reject user even if his token is OK
        var username=token.username;
        if (true){
            next()
        }else{
            cancel();
        }
    },
    userInRole:function(token, roles, next, cancel){
        //Provide role level access restrictions on url
        //You can use onTokenValid for this also, but I find this easier to read later
        //If you specified "roles" property for any secureRoute below, you must implement this method
        var username=token.username;
        if (true){
            next();
        }else
        {
            cancel();
        }
    },
    onAuthorized: function(req, token, res){
        //console.log("this will be executed if request is OK");
    },
    onUnauthorized: function(req, token, res, errorMessage){
        //console.log(req.path, "this will be executed if request fails authentication");
        //res.send({error:errorMessage});
    },
    secureRoutes:[
        {url:'/secure', method:'get'},
        {url:'/secure', method:'post', roles:["admin"]},
        {url:'/secure/*', method:'get'} //any action under /secure route but NOT default "/secure" route
    ]
});
```

Settings passed to BearerJS:
* app: Your expressJS app object. We will add one route (default /token) and middleware for processing requests to it
* serverKey: This is token encryption key. PLEASE PLEASE chnage it in your application
* tokenURL: We will add this route for POST method as end point for user authentication to generate token
* extendToken: No need to store password in your client to be able to get new token. Just POST here with Authorize header and get new token
* createToken: Use this function to generate any token content you might need. Token will be encrypted and sent back as response from tokenURL request
* validateToken: This method will provide you with decrypted token from request. Use it wisely to verify that it is ok
* onTokenValid: Sometimes you will not want to rely only on token validation. Once request is validated using token, you do additional check (perhaps check status in db etc.)
* userInRole: Use this method to provide information if user is in a role that is required for accessing some url (check secureRoutes configuration)
* onAuthorized: In case you want to do something when request is authenticated (ex. log something)
* onUnauthorized: In case that you want to do something when request is not authenticated
* secureRoutes: Just add routes you want to have secured. You can use "*" to define pattern. Add "roles" array to specify allowed roles. If no roles are defined access will be granted to any authorized user

Your TOKEN will be added to request and you can access it in any other action later. For example:

```javascript
router.get('/someroute', function(req, res) {
  console.log(req.authToken);
  res.send('Respond with a resource');
});
```

In your Client app
------------------
You need to get your token first. Probably during application startup or login

POST http://yoururl/token

Use whatever x-www-form-urlencoded parameters that your "createToken" function will use to validate user credentials and create token.

When you get back response containing token similar to:
```javascript
{
    "access_token": "U2FsdGVkX1+xSwd3f8WPCmM4WDOuZB1jblNArZEP/iKUu/ZF3+i9RZxGZuR5wnaMxw2wUjf4KbNQMjLderxDSTro2W9r7dbadltV+W1PbX3KTm5hbz4XYCdS7E4rlEALaKIBNyFyaBF9j8R+OpHEnddehW6pOAMfRmPPMqpfe20iIqdm3og+KZEU75qPXKZN04+XZGJFKpv557km0iF2KIBsYl4BrdeinJE4fU5wjvZMdv/C8u/hfRfFZZAGv9RC9TfEdD1HDvEynvtzwESuxdiqCOu6KPM4QoFTLHEo8Aj40WyoYEMFYPJOMI2fycej9SR5CcR/RJJFU6Q+IfKJ6cZIijpPnF6oYDqI/XbQYBV2fCEO3oTJeNxhaYpZaVBbRqV+AKasIGMonBK3rSeiHlPu9wLkfa6vZbDPqhKmZrAE6JrO8oaJJqogbu4TXu37Jw2qRLd0Z9IdZQT9EjjJPUJTfSljbM5YS3mLTfn+pjQ=",
    "expDate": "2014-06-18 22:52:23"
}
```

You can use it in subsequent requests as part of your HTTP Header (don't forget the "Bearer " prefix)

```
Authorization=Bearer U2FsdGVkX1+xSwd3f8WPCmM4WDOuZB1jblNArZEP/iKUu/ZF3+i9RZxGZuR5wnaMxw2wUjf4KbNQMjLderxDSTro2W9r7dbadltV+W1PbX3KTm5hbz4XYCdS7E4rlEALaKIBNyFyaBF9j8R+OpHEnddehW6pOAMfRmPPMqpfe20iIqdm3og+KZEU75qPXKZN04+XZGJFKpv557km0iF2KIBsYl4BrdeinJE4fU5wjvZMdv/C8u/hfRfFZZAGv9RC9TfEdD1HDvEynvtzwESuxdiqCOu6KPM4QoFTLHEo8Aj40WyoYEMFYPJOMI2fycej9SR5CcR/RJJFU6Q+IfKJ6cZIijpPnF6oYDqI/XbQYBV2fCEO3oTJeNxhaYpZaVBbRqV+AKasIGMonBK3rSeiHlPu9wLkfa6vZbDPqhKmZrAE6JrO8oaJJqogbu4TXu37Jw2qRLd0Z9IdZQT9EjjJPUJTfSljbM5YS3mLTfn+pjQ=
```


