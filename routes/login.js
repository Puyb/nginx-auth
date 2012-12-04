var fs = require('fs')
  , crypto = require('crypto')
  , nodemailer = require("nodemailer")
  , jade = require('jade')
  , utils = require('connect').utils;

var smtpOptions = {
    host: "mail.unimatrix.fr",
    port: 10025,
    auth: {
        user: "puyb@puyb.net",
        pass: "nahitoss"
    }
};

var users = JSON.parse(fs.readFileSync('users.json'));

exports.login = function(req, res) {
    if(req.route.method == 'post') {
        var shasum = crypto.createHash('sha512');
        shasum.update(req.body.password || '');
        if(users[req.body.user] && 
                shasum.digest('hex') == users[req.body.user].password &&
                !users[req.body.user].activation_token) {
            crypto.randomBytes(48, function(ex, buf) {
                var token = buf.toString('hex');
                res.cookie('AUTH_COOKIE', token);
                fs.writeFileSync(
                    '/var/lib/nginx/cookies/' + token,
                    JSON.stringify({
                        user: req.body.user,
                        login : new Date()
                    })
                );
                res.redirect(req.query.redirect || '/');
            });
            return;
        }
    }
    res.render('login', {})
};

exports.register = function(req, res) {
    if(req.route.method == 'post') {
        if(/^[a-z0-9\.\-_+]+@[a-z0-9\.\-_]+\.[a-z]{2,}$/.test(req.body.mail) &&
                   /^.+$/.test(req.body.user) &&
                   /^.+$/.test(req.body.name) &&
                   /^.{6,}$/.test(req.body.password) &&
                   req.body.password == req.body.password2 &&
                   !users[req.body.user]) {
            
            var shasum = crypto.createHash('sha512');
            shasum.update(req.body.password || '');
            users[req.body.user] = {
                name: req.body.name,
                mail: req.body.mail,
                password: shasum.digest('hex'),
                date: new Date()
            };
            crypto.randomBytes(48, function(ex, buf) {
                users[req.body.user].activation_token = buf.toString('hex');

                fs.writeFileSync('users.json', JSON.stringify(users));

                var smtpTransport = nodemailer.createTransport("SMTP", smtpOptions);

                var mailOptions = {
                    from: "Plonk",
                    to: "puyb@puyb.net",
                    subject: "New plonk user",
                    html: jade.compile(fs.readFileSync('views/mails/new_account.jade'))(utils.merge(utils.merge({ user: req.body.user }, req.app.locals), users[req.body.user]))
                }

                // send mail with defined transport object
                smtpTransport.sendMail(mailOptions, function(error, response){
                    smtpTransport.close();
                    res.render('registered', req.body)
                });
            });
            return;
        }
                
    }
    res.render('register', utils.merge({}, req.body))
}

exports.activate = function(req, res) {
    console.log(req.query);
    if( req.query.user && 
        users[req.query.user] &&
        users[req.query.user].activation_token == req.query.token) {
        delete users[req.query.user].activation_token;
        
        fs.writeFileSync('users.json', JSON.stringify(users));

        var smtpTransport = nodemailer.createTransport("SMTP", smtpOptions);

        var mailOptions = {
            from: "Plonk",
            to: users[req.query.user].mail,
            subject: "Your account is activated",
            html: jade.compile(fs.readFileSync('views/mails/activated.jade'))(utils.merge(utils.merge({ user: req.query.user }, req.app.locals), users[req.query.user]))
        }

        // send mail with defined transport object
        smtpTransport.sendMail(mailOptions, function(error, response){
            smtpTransport.close();
            res.render('activated', req.query)
        });
        return;
    }
    res.render('error', { status: 403, message: 'Permission denied' });
};
