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
                // This if statement ignores them.
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
    // TODO: Finish the route so it grabs all of the articles
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
    // TODO
    // ====
    // Finish the route so it finds one article using the req.params.id,
    // and run the populate method with "note",
    // then responds with the article with the note included
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
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { note: dbNote._id }}, { new: true });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});
app.get("/deleteAll", function (req, res) {
    db.Article.remove({}, function (error, deleted) {
        if (error) {
            console.log(error)
        } else {
            res.redirect("/");
        }
    })
})

app.get("/note/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.findByIdAndRemove({ _id: req.params.id })
        .then(function (dbNote) {

            return db.Article.findOneAndUpdate({ note: req.params.id }, { $pullAll: [{ note: req.params.id }]});
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.redirect("/saved");
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
})

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});