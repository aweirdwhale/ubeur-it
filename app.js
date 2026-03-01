const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./database");

const app = express();

// setup du serveur
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.use(
  session({
    secret: "key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
    },
  }),
);

app.set("view engine", "ejs");

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  next();
}

// affiche la page d'inscription
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { prenom, chambre, mdp } = req.body;

  // assertions de sécurité
  if (!/^[0-9]{1,4}/.test(chambre))
    return res.send("Numéro de chambre invalide");
  if (mdp.length < 8) return res.send("Mot de passe trop court");

  const hash = await bcrypt.hash(mdp, 12);

  // ajouter le bonhomme à la db
  try {
    db.prepare(
      `
      INSERT INTO members (chambre, prenom, password)
      VALUES (?, ?)
      `,
    ).run(chambre, prenom, password);

    // inscrit, maintenant faut se connecter
    res.redirect("/login");
  } catch {
    res.send("Problème lors de l'inscription.");
  }
});

// page de connection
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { prenom, mdp } = req.body;

  const user = db.prepare(`SELECT * FROM members WHERE prenom = ?`).get(prenom);
  if (!user) return res.send("Utilisateur introuvable :(");

  const valid = bcrypt.compare(mdp, user.password);

  if (!valid) return res.send("Mot de passe incorrect :(");

  req.session.userId = user.id;
  res.redirect("/dashboard");
});

// dashboard
app.get("/dashboard", requireAuth, (req, res) => {
  // pour le moment rangé par du plus récent au plus vieux, on changera ça plus tard
  const objects = db
    .prepare(
      `
    SELECT * FROM objects ORDER BY created_at DESC
    `,
    )
    .all();

  res.render("dashboard", { objects });
});

//ajouter un objet
app.post("/add", requireAuth, (req, res) => {
  const { titre, description } = req.body;

  db.prepare(
    `
    INSERT INTO objects (titre, description, auteur)
    VALUES (?,?,?)
    `,
  ).run(titre, description, req.session.userId);

  res.redirect("/dashboard");
});

//logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.listen(3000, () => {
  console.log("Serveur lancé : http://localhost:3000/");
});
