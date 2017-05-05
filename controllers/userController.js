var User = require("../models/user");
require('dotenv').config();

var passwordHash = require('password-hash');
var jwt = require('jsonwebtoken');
var axios = require('axios');
var jwt_helper = require('../helpers/jwt');

var InstagramAPI = require('instagram-api');
var instagramAPI = new InstagramAPI(process.env.ACCESS_TOKEN);

exports.signup = (req, res, next) => {
  var newUser = User({
    name: req.body.name,
    username: req.body.username,
    email: req.body.email,
    password: passwordHash.generate(req.body.password),
    username_insta: req.body.address,
    access_token: req.body.zipcode
  })

  console.log(newUser);

  console.log("passwordHash test: ", passwordHash.verify(req.body.password, newUser.password));

  newUser.save( (err, user) => {
    if(err) res.send(err);

    res.send(user)
  })

}

exports.signin_passport = (req, res, next) => {
  // authentication is handled by passport
  let user = req.user;
  console.log(user);

  var token = jwt.sign(
    { username: user.username, email: user.username, access_token: user.access_token},
    process.env.TOKEN_SECRET,
    { expiresIn: '1h' }
  );
  res.send(token);
}

exports.instagram_login = (req, res, next) => {
/*
https://api.instagram.com/oauth/authorize/?client_id=ecac160cc15b4bce8ead50131549992d&redirect_uri=http://localhost:3000/users/instagram&scope=public_content&response_type=code
*/
  let url = `https://api.instagram.com/oauth/authorize/?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=public_content&response_type=code`

  res.redirect(url)
}

// this only gets access token
exports.get_access_token = (req, res, next) => {
  console.log(`req.query.code = ${req.query.code}`);

  let code = req.query.code

  console.log(process.env.INSTAGRAM_CLIENT_ID)
  var querystring = require('querystring');
  axios.post('https://api.instagram.com/oauth/access_token', querystring.stringify({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
    code: code
  }))
  .then(function (response) {
    console.log(response);
    res.send(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
}


// this one gets access token and create user
exports.get_access_token_and_create_user = (req, res, next) => {
  console.log(`req.query.code = ${req.query.code}`);

  let code = req.query.code

  // querystring will format data json similar to postman's POST body
  var querystring = require('querystring');

  axios.post('https://api.instagram.com/oauth/access_token', querystring.stringify({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
    code: code
  }))
  .then(function (response) {
    let insta_data = response.data;
    console.log('insta_data', insta_data);
    console.log(insta_data.user.username);

    // find or create user
    User.findOne({username: insta_data.user.username}, (err, user) => {
      if(err) res.send(err);

      // if user is not found, create user
      if(!user){
        var newUser = User({
          name: insta_data.user.full_name,
          username: insta_data.user.username,
          username_insta: insta_data.user.username,
          id_insta: insta_data.user.id,
          profile_picture: insta_data.user.profile_picture,
          access_token: insta_data.access_token
        })

        newUser.save( (err, user) => {
          if(err) res.send(err);

          //create token
          var token = jwt.sign(
            { username: user.username, id_insta: user.id_insta, access_token: user.access_token},
            process.env.TOKEN_SECRET,
            { expiresIn: '1h' }
          );
          res.send(token);

        })
      }
      // user is already existed, just create token
      else {
        var token = jwt.sign(
          { username: user.username, id_insta: user.id_insta, access_token: user.access_token},
          process.env.TOKEN_SECRET,
          { expiresIn: '1h' }
        );
        res.send(token);
      }

    })

    // create token

    // res.send(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
}


exports.get_media_recent = (req, res, next) => {
  // instagramAPI.userMedia("nerdijoe")
  // .then ( result => {
  //   console.log(result.data);
  //   res.send(result);
  // }, err => {
  //   console.log(err)
  // })

  // var userid = "187611459"
  // // var userid = "493881988"
  //
  // var url = `https://api.instagram.com/v1/users/${userid}/media/recent/?access_token=${process.env.ACCESS_TOKEN}`
  //
  // axios.get(url)
  // .then(function (response) {
  //   console.log(response);
  //   res.send(response.data);
  // })
  // .catch(function (error) {
  //   console.log(error);
  // });
  //

  jwt.verify(req.headers.token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(decoded) {
      console.log(`decoded data is: `, decoded);
      console.log(typeof decoded);
      console.log(decoded.id_insta);
      var userid = decoded.id_insta;
      var access_token = decoded.access_token;

      var url = `https://api.instagram.com/v1/users/${userid}/media/recent/?access_token=${access_token}`

      axios.get(url)
      .then(function (response) {
        console.log(response);
        res.send(response.data);
      })
      .catch(function (error) {
        console.log(error);
      });
      // end of axios.get

    } // end of if(decoded)
    else {
      res.send(err);
    }
  }) // end of jwt.verify


}

exports.get_media_recent_by_tag = (req, res, next) => {
  var tag = req.params.tag;
  console.log(`search by tag: '${tag}'`);

  // decode token to get the instagram_id
  jwt.verify(req.headers.token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(decoded) {
      console.log(`decoded data is: `, decoded);
      console.log(typeof decoded);
      console.log(decoded.id_insta);
      var userid = decoded.id_insta;
      var access_token = decoded.access_token;

      var url = `https://api.instagram.com/v1/users/${userid}/media/recent/?access_token=${access_token}`

      axios.get(url)
      .then(function (response) {
        // console.log(response);
        let media = response.data.data;

        console.log(media);

        let result = []
        media.map( m => {
          if (m.tags.includes(tag))
            result.push(m);
        })
        res.send(result);

      })
      .catch(function (error) {
        console.log(error);
      });
      // end of axios.get


    } // end of if(decoded)
    else {
      res.send(err);
    }
  }) // end of jwt.verify



}