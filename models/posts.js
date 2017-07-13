var marked = require('marked');

var Post = require('../lib/mongo.js').Post;
var CommentModel = require('./comments');

// 将 post 的 content 从 markdown 转化成 html
Post.plugin('contentToHtml', {
    afterFind: function (posts) {
        return posts.map(function(post) {
            post.content = marked(post.content);
            return post;
        });
    },
    afterFindOne: function (post) {
        if (post) {
            post.content = marked(post.content);
        }
        return post;
    }
});

/**
 *  给 post 添加留言数 commentsCount
 */
Post.plugin('addCommentsCount', {
  afterFind: function (posts) {
    return Promise.all(posts.map(function (post) {
      return CommentModel.getCommentsCount(post._id).then(function (commentsCount) {
        post.commentsCount = commentsCount;
        return post;
      });
    }));
  },
  afterFindOne: function (post) {
    if (post) {
      return CommentModel.getCommentsCount(post._id).then(function (count) {
        post.commentsCount = count;
        return post;
      });
    }
    return post;
  }
});

module.exports = {
    /**
     *  创建一篇文章
     */ 
    create: function create(post) {
        return Post.create(post).exec();
    },

    /**
     *  根据 id 查询文章
     */
    getPostById: function getPostById(postId) {
        return Post
            .findOne({_id: postId})
            .populate({ path: 'author', model: 'User' })
            .addCreatedAt()
            .addCommentsCount()
            .contentToHtml()
            .exec();
    },

    /**
     *  通过文章 id 获取一篇原生文章（编辑文章）
     */
    getRawPostById: function getRawPostById(postId) {
        return Post.findOne({_id: postId})
            .getCommentsCount()
            .populate({path: 'author', model: 'User'})
            .exec();
    },

    /**
     * 按创建时间降序获取用户所有文章或者某个特定用户的所有文章
     */
    getPosts: function getPosts(author) {
        var query = {};
        if (author) {
            query.author = author;
        }

        return Post
            .find(query)
            .populate({ path: 'author', model: 'User' })
            .sort({_id: -1})
            .addCreatedAt()
            .addCommentsCount()
            .contentToHtml()
            .exec();
    },

    /**
     *  根据用户 id 和文章 id 修改文章内容
     */
    updatePostById: function updatePostById(postId, author, data) {
        return Post.update({author: author, _id: postId}, {$set: data}).exec();
    },

    /**
     *  根据用户 id 和文章 id 删除文章
     *  同时删除该文章下所有评论
     */
    delPostById: function delPostById(postId, author) {
        return Post.remove({author: author, _id: postId}).exec()
            .then(function (result) {
                // 文章删除后，再删除该文章下的所有留言
                if (res.result.ok && res.result.n > 0) {
                    CommentModel.delCommentsByPostId(postId);
                }
            });
    },

    /**
     *  通过文章 id 给 pv 加1
     */
    incPv: function incPv(postId) {
        return Post
            .update({_id: postId}, {$inc: {pv: 1} })
            .exec();
    }
}
