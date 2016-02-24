//Authentication setup
var CryptoJS = require('node-cryptojs-aes').CryptoJS;

function matchPath(mask, path){
    mask=mask.toLowerCase();
    path=path.toLowerCase();
    if (path.indexOf("?")>0)
        path=path.substring(0, path.indexOf("?"));    
    var maskArray=mask.split("/");
    var pathArray=path.split("/");
    if (maskArray.length!=pathArray.length) return false;
    for (var i= 0; i<maskArray.length; i++){
        if ((maskArray[i]!="*") && (pathArray[i]!=maskArray[i])) return false;
    }
    return true;
}

//Check if route should be authorized and return route setting
function checkUrl(url, method, routes){
    method=method.toLowerCase();
    for (var i=0; i<routes.length; i++){
        var route=routes[i];
        if ((matchPath(route.url,url)) && (method==route.method)) return route;
    }
    return false;
}

function decryptToken(settings){
    var decrypted = CryptoJS.AES.decrypt(settings.bearer, settings.serverKey);
    var token;
    try{
        token=JSON.parse(CryptoJS.enc.Utf8.stringify(decrypted));
    }catch(e){
    }
    return token;
}

function bearerJS(settings) {
    //Check if URL should be authenticated and redirect accordingly
    settings.app.use(function (req, res, next) {
        //var bearer=req.get('Authorization');

        var bearer = req.get('Authorization') || req.cookies['' + settings.cookieName + ''];
        
        var token;
        if (bearer){
            bearer=bearer.replace('Bearer ','');
            token=decryptToken({
                bearer:bearer,
                serverKey:settings.serverKey
            });
        }

        var proceed=function(){
            req.authToken=token;
            req.isAuthenticated=true;
            if (settings.onAuthorized){
                settings.onAuthorized(req, token, res);
            }
            next();
        };

        var cancel=function(statusCode, errorMessage){
            res.statusCode=(statusCode || 401);
            res.statusText=errorMessage;
            if (settings.onUnauthorized){
                settings.onUnauthorized(req, token, res, errorMessage);
            }else{
                res.send({error:errorMessage});
            }
        };

        var isAuthenticated=false;
        var routeCheck=checkUrl(req.url,req.method.toLowerCase(),settings.secureRoutes);
        if (routeCheck){
            if (token){
                var tokenValid=settings.validateToken(req,token);
                if (!tokenValid){
                    cancel(401, "Token expired");
                }else //Authorized request
                {
                    if (settings.onTokenValid){
                        settings.onTokenValid(token, function(){
                            if (routeCheck.roles){ //if there is a Role based limit to request
                                settings.userInRole(token, routeCheck.roles, function(){proceed()}, function(){cancel(401,"User role rejected")});
                            }else
                            {
                                proceed();
                            }
                        }, function(){cancel(401, "User disabled")});
                    }else
                    {
                        if (routeCheck.roles){ //if there is a Role based limit to request
                            settings.userInRole(token, routeCheck.roles, function(){proceed()}, function(){cancel(401,"User role rejected")});
                        }else
                        {
                            proceed();
                        }
                    }
                }
            }else
            {
                cancel(401,"Invalid token");
            }
        }else
        {
            proceed();
        }
    });

    //Extend existing token without validating password again
    settings.app.post(settings.extendTokenUrl, function (req, res) {
        var proceed=function(token){
            var encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), settings.serverKey);
            var bearer=encrypted.toString();

            var jsonToken={
                access_token:bearer,
                expDate:token.expire
            };

            res.send(jsonToken);
        }

        var cancel=function(){
            res.statusCode=401;
            res.send({error:"Token not provided"});
        };

        settings.extendToken(req, function(token){proceed(token);}, function () {cancel()});
    });

    //get token value
    settings.app.post(settings.tokenUrl, function (req, res) {
        var proceed=function(token){
            var encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), settings.serverKey);
            var bearer=encrypted.toString();

            var jsonToken={
                access_token:bearer,
                expDate:token.expire
            };

            res.send(jsonToken);
        }

        var cancel=function(data){
            res.statusCode=401;
            res.send({
                error:"Login failed",
                data:data
            });
        };
        settings.createToken(req,function(token){proceed(token);},function(data){cancel(data)});
    });
}

module.exports = bearerJS;
