const express = require("express");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const axios = require("axios");
const cheerio = require("cheerio");

// Require all models
const db = require("./models");

const PORT = 3000;

// Initialize Express
const app = express();

// Configure middleware

// Use handlebars to display html
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("./public"));

// Connect to the Mongo DB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
//const resultArray = [];

app.get("/scrape", function (req, res) {
  axios.get("http://editorial.rottentomatoes.com/news/").then(function (response) {
    const $ = cheerio.load(response.data);
    $("div.newsItem").each(function (i, element) {
      const result = {};
      const title = $(this)
        .children("a.articleLink")
        .children("div.bannerCaption")
        .children("div.panel-body")
        .children("p.title")
        .text();
      const link = $(this)
        .children("a.articleLink")
        .attr("href");
      axios.get(link).then(function (response) {
        const summary = cheerio.load(response.data)("div.articleContentBody").children().first().text();
        result.title = title;
        result.link = link;
          if (summary === "") {
            result.summary = "No Summary Available."
          } else {
            result.summary = summary;
          }
        console.log(result);
        db.Article.create(result)
          .then(function (dbArticle) {
            console.log(dbArticle);
          })
          .catch(function (err) {
            console.log(err);
          });
      });
    });
    res.send("Scrape Complete");
  });
});

//Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
