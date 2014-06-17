BearerJS
========

NodeJS/ExpressJS module for Bearer/Token authentication.

Usage
=====
In your ExpressJS application init script, add the following before setting any other route:

var bearer = require('bearer');
var app = express();
bearer({
    //Make sure to pass in the app (express) object so we can set routes
    app:app,
    //Please change server key for your own safety!
    serverKey:"12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678",
    tokenUrl:'/token', //Call this URL to get your token. Accepts only POST method
    createToken:function(req){
        //If your user is not valid just return "underfined" from this method.
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
    afterAuthorized:function(token){
        //This is in case you would like to check user account status in DB each time he attempts to do something.
        //Doing this will affect your performance but its your choice if you really need it
        //Returning false from this method will reject user even if his token is OK
        return true;
    },
    secureRoutes:[
        {url:'/users', method:'get'}
    ]
});
