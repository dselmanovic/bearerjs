BearerJS
========

NodeJS/ExpressJS module for Bearer/Token authentication.
Often used for RESTful API, Smartphones etc to authenticate users without active session

Usage
=====

You can find fully functional demo at:
```
https://github.com/dselmanovic/BearerJSDemo.git
```

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
    createToken:function(req){
        //If your user is not valid just return "underfined" from this method.
        //Your token will be added to req object and you can use it from any method later
        var username=req.body.username;
        var userValid=true; //You are aware that this is where you check username/password in your DB, right!?
        if (userValid) return({
            expire: moment(Date.now()).add('days', 1).format('YYYY-MM-DD HH:mm:ss'),
            username: username,
            contentType: req.get('Content-Type'),
            ip: req.ip,
            userAgent: req.header('user-agent'),
            custom_id: '55555',
            another: 'Some data you need in your token',
            moreData: 'Some more data you need'
        });
        return undefined;
    },
    validateToken:function(req, token){
        //you could also check if request came from same IP using req.ip==token.ip for example
        if (token){
            return moment(token.expire)>moment(new Date());
        }
        return false;
    },
    onTokenValid:function(token){
        //This is in case you would like to check user account status in DB each time he attempts to do something.
        //Doing this will affect your performance but its your choice if you really need it
        //Returning false from this method will reject user even if his token is OK
        return true;
    },
    onAuthorized: function(req, token){
        console.log("this will be executed if request is OK");
    },
    onUnauthorized: function(req, token){
        console.log("this will be executed if request fails authentication");
    },
    secureRoutes:[
        {url:'/secure', method:'get'},
        {url:'/secure/*', method:'get'}
    ]
});
```

Settings passed to BearerJS:
* app: Your expressJS app object. We will add one route (default /token) and middleware for processing requests to it
* serverKey: This is token encryption key. PLEASE PLEASE chnage it in your application
* tokenURL: We will add this route for POST method as end point for user authentication to generate token
* createToken: Use this function to generate any token content you might need. Token will be encrypted and sent back as response from tokenURL request
* validateToken: This method will provide you with decrypted token from request. Use it wisely to verify that it is ok
* onTokenValid: Sometimes you will not want to rely only on token validation. Once request is validated using token, you do additional check (perhaps check status in db etc.)
* onAuthorized: In case you want to do something when request is authenticated (ex. log something)
* onUnauthorized: In case that you want to do something when request is not authenticated
* secureRoutes: Just add routes you want to have secured. You can use "*" to define pattern

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

You can use it in subsequential requests as part of your HTTP Header (dont forget the "Bearer " prefix)

```
Authorization=Bearer U2FsdGVkX1+xSwd3f8WPCmM4WDOuZB1jblNArZEP/iKUu/ZF3+i9RZxGZuR5wnaMxw2wUjf4KbNQMjLderxDSTro2W9r7dbadltV+W1PbX3KTm5hbz4XYCdS7E4rlEALaKIBNyFyaBF9j8R+OpHEnddehW6pOAMfRmPPMqpfe20iIqdm3og+KZEU75qPXKZN04+XZGJFKpv557km0iF2KIBsYl4BrdeinJE4fU5wjvZMdv/C8u/hfRfFZZAGv9RC9TfEdD1HDvEynvtzwESuxdiqCOu6KPM4QoFTLHEo8Aj40WyoYEMFYPJOMI2fycej9SR5CcR/RJJFU6Q+IfKJ6cZIijpPnF6oYDqI/XbQYBV2fCEO3oTJeNxhaYpZaVBbRqV+AKasIGMonBK3rSeiHlPu9wLkfa6vZbDPqhKmZrAE6JrO8oaJJqogbu4TXu37Jw2qRLd0Z9IdZQT9EjjJPUJTfSljbM5YS3mLTfn+pjQ=
```


