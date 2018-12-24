module.exports = function(app) {
  app.get("/", function(req, res) {
      res.render("index", { scrape: "Scrape!" });
  });

  app.get("/scrape", function(req, res) {
      res.render("index", { scrape: "Scrape Complete!" });
  });
};