//Authentication setup
var CryptoJS = require('node-cryptojs-aes').CryptoJS;

function checkUrl(url, method, routes){
    for (var i=0; i<routes.length; i++){
        var route=routes[i];
        if ((url==route.url) && (method==route.method)){
            return true;
        }
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
        if (checkUrl(req.url,req.method.toLowerCase(),settings.secureRoutes)){
            if (token){
                var tokenValid=settings.validateToken(req,token);
                if (!tokenValid){
                    res.statusCode=401;
                    res.statusText="Token expired";
                    res.send();
                }else //Authorized request
                {
                    if (settings.afterAuthorized){
                        var canProceed=settings.afterAuthorized(token);
                        if (!canProceed){
                            res.statusCode=401;
                            res.statusText="User disabled";
                            res.send();
                        }else
                        {
                            req.authInfo=token;
                            req.isAuthenticated=true;
                            next();
                        }
                    }else
                    {
                        req.authInfo=token;
                        req.isAuthenticated=true;
                        next();
                    }
                }
            }else
            {
                res.statusCode=401;
                res.statusText="Invalid token";
                res.send();
            }
        }else
        {
            req.authInfo=token;
            req.isAuthenticated=true;
            next();
        }
    });
}

module.exports = bearerJS;
