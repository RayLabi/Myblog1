var express = require('express');
require('connect-flash');

require('express-formidable');


var router = express.Router();

var checkLogin = require('../middlewares/check').checkLogin;

var PostModel = require('../models/posts');
var CommentModel = require('../models/comments');


// GET /posts 所有用户的文章页
// eg: GET /post?author=xxx

router.get('/', function(req, res, next) {
  var author = req.query.author;
  PostModel.getPosts(author)
    .then(function (posts) {
      res.render('posts', {
        posts: posts
      });
    })
    .catch(next);
});

// POST /posts 发表一篇文章
router.post('/', checkLogin, function(req, res, next) {
  var title = req.fields.title;
  var content = req.fields.content;
  var author = req.session.user._id;

  // 校验参数
  try {
    if ( ! title.length) {
      throw new Error('请填写标题');
    } else if ( ! content.length) {
      throw new Error('请编辑内容');
    } else {
      var post = {
        title: title,
        content: content,
        author: author,
        pv: 0
      }

      PostModel.create(post).then(result => {
        post = result.ops[0];
        req.flash('success', "发表文章成功");
        return res.redirect('/posts/$(post._id)');
      })
      .catch(next);

    }
  } catch (error) {
    req.flash('error', error.message);
    return res.redirect('back');
  }
});


// GET /posts/create 发表文章页
router.get('/create', checkLogin, function(req, res, next) {
  res.render('create');
});

// GET /posts/:postId 单独一篇的文章页
router.get('/:postId', function(req, res, next) {
  var postId = req.params.postId;

  Promise.all([
    PostModel.getPostById(postId),// 获取文章信息
    CommentModel.getComments(postId),// 获取该文章所有留言
    PostModel.incPv(postId)// pv 加 1
  ])
  .then(function (result) {
    var post = result[0];
    var comments = result[1];
    if (!post) {
      throw new Error('该文章不存在');
    } else {
      res.render('post', {
        post: post,
        comments: comments
      });
    }
  })
  .catch(function (e) {
    req.flash('error', e.message);
    return res.redirect('back');
  });
});

// GET /posts/:postId/edit 更新文章页
router.get('/:postId/edit', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session.user._id;

  PostModel.getRawPostById(postId)
    .then(function (post) {
      if ( ! post) {
        throw new Error('该文章不存在');
      } else if (post.author._id.toString() !== author.toString()) {
        throw new Error('权限不足');
      } else {
        res.render('edit', {
          post: post,
        });
      }
    })
    .catch(function (e) {
      console.error(__filename + ": ====>\n" + e.message);
      req.flash('error', e.message);
      return res.redirect('back');
    });
});

// POST /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session._id;
  var title = req.fields.title;
  var content = req.fields.content;

  PostModel.updatePostById(postId, author, {title: title, content: content})
    .then(function (result) {
      console.log("更新文章成功");

      req.flash('success', '编辑文章成功');
      // 编辑成功后跳转到上一页
      res.redirect(`/posts/${postId}`);
    })
    .catch(function (e) {
      req.flash('error', e.message);
      return res.redirect('back');
    });
});

// GET /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove', checkLogin, function(req, res, next) {
  var postId = req.params.postId;
  var author = req.session.user._id;

  PostModel.delPostById(postId, author)
    .then(function () {
      req.flash('success', '删除文章成功');
      // 删除成功后跳转到主页
      res.redirect('/posts');
    })
    .catch(next);
});

// POST /posts/:postId/comment 创建一条留言
router.post('/:postId/comment', checkLogin, function(req, res, next) {
  var author = req.session.user._id;
  var postId = req.params.postId;
  var content = req.fields.content;
  var comment = {
    author: author,
    postId: postId,
    content: content
  };
  
  CommentModel.create(comment)
    .then(function (result) {
      req.flash('success', '留言成功');
      // 留言成功后跳转到上一页
      res.redirect('back');
    }).catch(function (e) {
      console.error('留言失败' + e.message);
      req.flash('error', "留言失败");
      return res.redirect('back');
    });
});

// GET localhost:3000/posts   /123456/comment/0001/remove 删除一条留言
router.get('/:postId/comment/:commentId/remove', checkLogin, function(req, res, next) {
  var commentId = req.params.commentId;

  CommentModel.delCommentById(commentId, req.session.user._id)
    .then(function () {
      req.flash('success', "删除成功");
      return res.redirect('back');
    })
    .catch(function (e) {
      console.error('删除留言失败 ===>' + e.message);
      req.flash('error', "删除失败");
      return res.redirect('back');
    });
});

module.exports = router;