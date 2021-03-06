var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  name: String,
  username: String,
  email: String,
  password: String,
  username_insta: String,
  id_insta: String,
  profile_picture: String,
  access_token: String
})

var User = mongoose.model('User', userSchema);

module.exports = User;
