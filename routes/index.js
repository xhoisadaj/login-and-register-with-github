const express = require("express");
const router = express.Router();
const User = require("../models/user");
require("dotenv").config();
const { generateOptions } = require("../utils/utils");
const https = require("https");
const axios = require("axios");
const passport = require("passport");

// Passport Config

router.get("/", (req, res, next) => {
  return res.render("index.ejs");
});

router.post("/", (req, res, next) => {
  let personInfo = req.body;

  if (
    !personInfo.email ||
    !personInfo.username ||
    !personInfo.password ||
    !personInfo.passwordConf
  ) {
    res.send();
  } else {
    if (personInfo.password == personInfo.passwordConf) {
      User.findOne({ email: personInfo.email }, (err, data) => {
        if (!data) {
          let c;
          User.findOne({}, (err, data) => {
            if (data) {
              c = data.unique_id + 1;
            } else {
              c = 1;
            }

            let newPerson = new User({
              unique_id: c,
              email: personInfo.email,
              username: personInfo.username,
              password: personInfo.password,
              passwordConf: personInfo.passwordConf,
            });

            newPerson.save((err, Person) => {
              if (err) console.log(err);
              else console.log("Success");
            });
          })
            .sort({ _id: -1 })
            .limit(1);
          res.send({ Success: "You are registered,You can login now." });
        } else {
          res.send({ Success: "Email is already used." });
        }
      });
    } else {
      res.send({ Success: "password is not matched" });
    }
  }
});

router.get("/login", (req, res, next) => {
  return res.render("login.ejs");
});

router.post("/login", (req, res, next) => {
  User.findOne({ email: req.body.email }, (err, data) => {
    if (data) {
      if (data.password == req.body.password) {
        req.session.userId = data.unique_id;

        res.send({ Success: "Success!" });
      } else {
        res.send({ Success: "Wrong password!" });
      }
    } else {
      res.send({ Success: "This Email Is not registered!" });
    }
  });
});

router.get("/profile", (req, res, next) => {
  User.findOne({ unique_id: req.session.userId }, (err, data) => {
    if (!data) {
      res.redirect("/");
    } else {
      const username = data.username;
      axios({
        method: "get",
        url: `https://api.github.com/users/${username}`,
      })
        .then((user) => {
          return res.render("dashboard", { user: user.data });
        })
        .catch((err) => {
          res.send(err);
        });
    }
  });
});

router.get("/starredrepository", (req, res, next) => {
  User.findOne({ unique_id: req.session.userId }, (err, data) => {
    if (!data) {
      res.redirect("/");
    } else {
      const username = data.username;

      axios({
        method: "get",
        url: `https://api.github.com/users/${username}/starred`,
      })
        .then((response) => {
          const data1 = response.data;
          data1.forEach((x) => console.log(x.id));

          res.render("starredRepository", { user: req.user, data1: data1 });
        })
        .catch((err) => {
          res.send(err);
        });
    }
  });
});

router.get("/myrepository", (req, res, next) => {
  User.findOne({ unique_id: req.session.userId }, (err, data) => {
    if (!data) {
      res.redirect("/");
    } else {
      const username = data.username;

      axios({
        method: "get",
        url: `https://api.github.com/users/${username}/repos`,
      })
        .then((response) => {
          const data = response.data;
          data.forEach((x) => console.log(x.id));

          res.render("myrepository", { user: req.user, data: data });
        })
        .catch((err) => {
          res.send(err);
        });
    }
  });
});

router.get("/logout", (req, res, next) => {
  if (req.session) {
    // delete session object
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      } else {
        return res.redirect("/");
      }
    });
  }
});

router.get("/user/:user", (req, res) => {
  const user = req.user.username;

  const options = generateOptions("/users/" + user);

  https
    .get(options, function (apiResponse) {
      apiResponse.pipe(res);
    })
    .on("error", (e) => {
      console.log(e);
      res.status(500).send(constants.error_message);
    });

  res.render("home", { user: req.user });
});
router.get("/user/:user/starred", (req, res) => {
  const user = req.user.username;

  axios({
    method: "get",
    url: `https://api.github.com/users/${user}/starred`,
  })
    .then((response) => {
      const data1 = response.data;
      data1.forEach((x) => console.log(x.id));

      res.render("starredRepositoryGit", { user: req.user, data1: data1 });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.get("/user/:user/repos", (req, res) => {
  const user = req.user.username;

  axios({
    method: "get",
    url: `https://api.github.com/users/${user}/repos`,
  })
    .then((response) => {
      const data = response.data;
      data.forEach((x) => console.log(x.id));

      res.render("repositoryGit", { user: req.user, data: data });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.get("/starredRepositoryGit", (req, res) => {
  res.redirect(`/user/${req.user.username}/starred`);
});

router.get("/repositoryGit", (req, res) => {
  res.redirect(`/user/${req.user.username}/repos`);
});

router.get("/user", (req, res) => {
  if (req.user) {
    return res.redirect(`/user/${req.user.username}`);
  }
  res.render("login", { user: req.user });
});

router.get("/logout", (req, res) => {
  req.logOut();
  res.redirect("/");
});

//auth
router.get("/auth/github", passport.authenticate("github"));

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect(`/user/${req.user.username}`);
  }
);

module.exports = router;
