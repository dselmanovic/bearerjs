//Authentication setup
var CryptoJS = require('node-cryptojs-aes').CryptoJS;

function matchPath(mask, path){
    mask=mask.toLowerCase();
    path=path.toLowerCase();
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
    //get token value
    settings.app.post(settings.tokenUrl, function (req, res) {
        var token=settings.createToken(req);
        if (token){
            var encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), settings.serverKey);
            var bearer=encrypted.toString();

            var jsonToken={
                access_token:bearer,
                expDate:token.expire
            };

            res.send(jsonToken);
        }else
        {
            res.statusCode=401;
            res.send({});
        }
    });

    //Check if URL should be authenticated and redirect accordingly
    settings.app.use(function (req, res, next) {
        var bearer=req.get('Authorization');
        var token;
        if (bearer){
            bearer=bearer.replace('Bearer ','');
            token=decryptToken({
                bearer:bearer,
                serverKey:settings.serverKey
            });
        }
        var isAuthenticated=false;
        var errorMessage="";
        var routeCheck=checkUrl(req.url,req.method.toLowerCase(),settings.secureRoutes);
        if (routeCheck){
            if (token){
                var tokenValid=settings.validateToken(req,token);
                if (!tokenValid){
                    errorMessage="Token expired";
                }else //Authorized request
                {
                    if (settings.onTokenValid){
                        var canProceed=settings.onTokenValid(token);
                        if (!canProceed){
                            errorMessage="User disabled";
                        }else
                        {
                            if (routeCheck.roles){ //if there is a Role based limit to request
                                errorMessage="User role rejected";
                                isAuthenticated=false;

                                for (var i=0; i<routeCheck.roles.length; i++){
                                    if (settings.userInRole(token, routeCheck.roles[i])){
                                        isAuthenticated=true;
                                        break;
                                    }
                                }
                            }else
                            {
                                isAuthenticated=true;
                            }
                        }
                    }else
                    {
                        if (routeCheck.roles){ //if there is a Role based limit to request
                            errorMessage="User role rejected";
                            isAuthenticated=false;

                            for (var i=0; i<routeCheck.roles.length; i++){
                                if (settings.userInRole(token, routeCheck.roles[i])){
                                    isAuthenticated=true;
                                    break;
                                }
                            }
                        }else
                        {
                            isAuthenticated=true;
                        }
                    }
                }
            }else
            {
                errorMessage="Invalid token";
            }
        }else
        {
            isAuthenticated=true;
        }

        if (isAuthenticated){
            req.authToken=token;
            req.isAuthenticated=true;
            if (settings.onAuthorized){
                settings.onAuthorized(req,token);
            }
            next();
        }else
        {
            res.statusCode=401;
            res.statusText=errorMessage;
            if (settings.onUnauthorized){
                settings.onUnauthorized(req,token);
            }
            res.send({error:errorMessage});
        }
    });
}

module.exports = bearerJS;
