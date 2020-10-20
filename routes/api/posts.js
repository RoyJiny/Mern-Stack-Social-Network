const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");

const Post = require("../../models/Post");
const User = require("../../models/User");
const Profile = require("../../models/Profile");

// @route  POST api/posts
// @desc   Create post
// @access Private
router.post(
    "/",
    [auth, [check("text", "Text is required").not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(req.user.id).select("-password");

            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id,
            });

            const post = await newPost.save();

            res.json(post);
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Server error");
        }
    }
);

// @route  GET api/posts
// @desc   Get all posts
// @access Private
router.get("/", auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  GET api/posts/:post_id
// @desc   Get a post by id
// @access Private
router.get("/:post_id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        if (!post) {
            return res.status(404).send({ msg: "Post not found" });
        }

        res.json(post);
    } catch (error) {
        console.error(error.message);

        const valid = mongoose.Types.ObjectId.isValid(req.params.user_id);
        if (!valid) {
            return res.status(404).json({ msg: "No profile found" });
        }

        res.status(500).send("Server error");
    }
});

// @route  DELETE api/posts/:post_id
// @desc   Delete a post by id
// @access Private
router.delete("/:post_id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        if (!post) {
            return res.status(404).json({ msg: "No post found" });
        }

        // Check on the user
        if (post.user.toString() !== req.user.id) {
            return res.status(401).send({ msg: "User not authorized" });
        }

        await post.remove();

        res.json({ msg: "Post removed" });
    } catch (error) {
        console.error(error.message);

        const valid = mongoose.Types.ObjectId.isValid(req.params.user_id);
        if (!valid) {
            return res.status(404).json({ msg: "No post found" });
        }

        res.status(500).send("Server error");
    }
});

// @route  PUT api/posts/like/:post_id
// @desc   Like a post by id
// @access Private
router.put("/like/:post_id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        // check if already liked by the user
        if (
            post.likes.filter((like) => like.user.toString() == req.user.id)
                .length > 0
        ) {
            return res.status(400).json({ msg: "Post already liked" });
        }

        post.likes.unshift({ user: req.user.id });

        await post.save();
        res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  PUT api/posts/unlike/:post_id
// @desc   UnLike a post by id
// @access Private
router.put("/unlike/:post_id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        // check if not liked by the user
        if (
            post.likes.filter((like) => like.user.toString() == req.user.id)
                .length === 0
        ) {
            return res.status(400).json({ msg: "Post not liked yet" });
        }

        const index = post.likes
            .map((like) => like.user.toString())
            .indexOf(req.user.id);
        post.likes.splice(index, 1);

        await post.save();
        res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  POST api/posts/comment/:post_id
// @desc   Comment on a post
// @access Private
router.post(
    "/comment/:post_id",
    [auth, [check("text", "Text is required").not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(req.user.id).select("-password");
            const post = await Post.findById(req.params.post_id);

            const comment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id,
            };

            post.comments.unshift(comment);

            await post.save();

            res.json(post.comments);
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Server error");
        }
    }
);

// @route  DELETE api/posts/comment/:post_id/:comment_id
// @desc   Delete a comment
// @access Private
router.delete("/comment/:post_id/:comment_id", auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);
        if (!post) {
            return res.status(404).json({ msg: "Post not found" });
        }

        const comment = post.comments.find(
            (comment) => comment.id === req.params.comment_id
        );
        if (!comment) {
            return res.status(404).json({ msg: "Comment not found" });
        }

        // Check on user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Iser not authorized" });
        }

        const index = post.comments
            .map((comment) => comment.user.toString())
            .indexOf(req.user.id);
        post.comments.splice(index, 1);

        await post.save();
        res.json(post.comments);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;
