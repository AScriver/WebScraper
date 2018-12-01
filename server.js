var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();

// Configure middleware


// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({
    defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true
});

// Routes
// Get all articles that have not yet been saved
app.get("/", function (req, res) {
    db.Article.find({
            "saved": false
        })
        .then(function (dbArticle) {
            res.render("index", {
                article: dbArticle
            })
        })
});

// ROute to get all saved articles
app.get('/saved', function (req, res) {
    db.Article.find({
            "saved": true
        })
        .populate("note")
        .exec(
            function (error, found) {
                if (error) {
                    console.log(error);
                } else {
                    res.render("saved", {
                        article: found
                    })
                }
            }
        )
});

// Route to save an individual article.
app.post('/saved/:id', function (req, res) {
    db.Article.findOneAndUpdate({
            "_id": mongoose.Types.ObjectId(req.params.id)
        }, {
            $set: {
                "saved": true
            }
        })
        .then(function (error, found) {
            if (error) {
                console.log(error);
            } else {
                res.json(found)
            }
        })
})

//Route for "unsaving" an article
app.post('/unsaved/:id', function (req, res) {
    db.Article.findOneAndUpdate({
            "_id": mongoose.Types.ObjectId(req.params.id)
        }, {
            $set: {
                "saved": false
            }
        })
        .then(function (error, found) {
            if (error) {
                console.log(error);
            } else {
                res.json(found)
            }
        })
})

// Route to scrape the AZCentral website.
app.get("/scrape", function (req, res) {
    axios.get("https://www.azcentral.com/local/")
        .then(function (response) {

            var $ = cheerio.load(response.data);

            $(".flm-asset").each(function (i, element) {

                var result = {};

                result.title = $(this)
                    .find("h1")
                    .text();
                result.link = $(this)
                    .children("a")
                    .attr("href");
                result.summary = $(this)
                    .find("p.flm-summary")
                    .text();

                // Because of the way AZCentral is formatted, some data
                // can't be retrieved in the same format as above.
                // This "if" statement ignores them.
                if (result.title && result.link && result.summary) {
                    db.Article.create(result)
                        .then(function (dbArticle) {
                            console.log(dbArticle);
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
            });
            res.redirect("/")
        });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    db.Article.find({
        "saved": false
    }, function (error, found) {
        if (error) {
            console.log(error)
        } else {
            res.json(found);
        }
    })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    db.Article.findById(req.params.id)
        .populate("note")
        .exec(function (error, found) {
            if (error) {
                console.log(error);
            } else {
                console.log(found);
                res.json(found);
            }
        })
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { note: dbNote._id }}, { new: true });
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Route for deleting all articles
app.get("/deleteAll", function (req, res) {
    db.Article.remove({}, function (error, deleted) {
        if (error) {
            console.log(error)
        } else {
            res.redirect("/");
        }
    })
})

// Route for deleting a single note.
app.get("/note/:id", function (req, res) {
    db.Note.findByIdAndRemove({ _id: req.params.id })
        .then(function (dbNote) {

            return db.Article.findOneAndUpdate({ note: req.params.id }, { $pullAll: [{ note: req.params.id }]});
        })
        .then(function (dbArticle) {
            res.redirect("/saved");
        })
        .catch(function (err) {
            res.json(err);
        });
})

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});