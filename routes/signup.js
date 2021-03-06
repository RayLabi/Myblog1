var express = require('express');
var router = express.Router();
var path = require('path');
var sha1 = require('sha1');
var fs = require('fs');

var UserModel = require('../models/users');
var checkNotLogin = require('../middlewares/check').checkNotLogin;

// GET /signup 注册页
router.get('/', checkNotLogin, function(req, res, next) {
  res.render('signup');
});

// POST /signup 用户注册
router.post('/', checkNotLogin, function(req, res, next) {
  var name = req.fields.name;
  var gender = req.fields.gender;
  var bio = req.fields.bio;
  var avatar = req.files.avatar.path.split(path.sep).pop();
  var password = req.fields.password;
  var repassword = req.fields.repassword;

  // 校验参数
  try {
    if ( ! (name.length >= 1 && name.length <= 10)) {
      throw new Error('名字请限制在1到10个字符');
    } else if (['m', 'f', 'x'].indexOf(gender) === -1) {
      throw new Error('性别只能是m,f,x');
    } else if ( ! (bio.length >= 1 && bio.length <= 30)) {
      throw new Error('简介请限制在1到30个字符');
    } else if ( ! req.files.avatar.name) {
      throw new Error('请上传头像');
    } else if (password.length < 6) {
      throw new Error('密码至少需要6个字符');
    } else if (password != repassword) {
      throw new Error('再冷输入密码不一致');
    } else {
      // 加密密码
      password = sha1(password);

      // 待写入数据库的用户信息
      var user = {
        name: name,
        password: password,
        bio: bio,
        gender: gender,
        avatar: avatar,
      };
      UserModel.create(user)
        .then(function(result) {
          console.log("新建用户，插入数据库成功")
          console.log(result);

          // user 即取得插入 db 后的值，包含 _id
          user = result.ops[0];
          delete user.password;
          
          // 将用户信息写入会话
          req.session.user = user;
          // 写入 flash
          req.flash('success', '注册成功');

          // 跳转到首页
          res.redirect('/posts');
        })
        .catch(function (e) {
          console.error('写入数据库出错\n' + e + "..............");

          // 注册失败，异步删除上传的头像
          fs.unlink(req.files.avatar.path);
          // 用户名被占用则跳回注册页，而不是错误页
          if (e.message.match('E11000 duplicate key')) {
            req.flash('error', '用户名已被占用');
            return res.redirect('/signup');
          }
          next(e);
        });
          
    }
  } catch (error) {
    // 注册失败，异步删除上传的头像
    fs.unlink(req.files.avatar.path);
    
    req.flash('error', error.message);
    return res.redirect('signup');
  }
  
});

module.exports = router;