const client = require("./bot");

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./database");

const app = express();

// setup du serveur
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

//layouts
const expressLayouts = require("express-ejs-layouts");
app.use(expressLayouts);

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
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const { chambre, prenom, password } = req.body;

  console.log(prenom, chambre, password);

  // assertions de sécurité
  if (!/^[0-9]{1,4}/.test(chambre)) {
    console.log("num invalide");
    return res.send("Numéro de chambre invalide");
  }
  if (password.length < 8) return res.send("Mot de passe trop court");

  // Vérifier si un utilisateur avec le même numéro de chambre existe déjà
  const existingUser = db
    .prepare(`SELECT * FROM members WHERE chambre = ?`)
    .get(chambre);
  if (existingUser) {
    return res.send("Un utilisateur avec ce numéro de chambre existe déjà.");
  }

  const hash = await bcrypt.hash(password, 12);

  // ajouter le bonhomme à la db
  try {
    db.prepare(
      `
      INSERT INTO members (chambre, prenom, password)
      VALUES (?, ?,?)
      `,
    ).run(chambre, prenom, hash);

    const totalMembers = db
      .prepare(
        `
        SELECT COUNT(prenom) AS total FROM members
      `,
      )
      .get();

    const channel = await client.channels.fetch("1478139386368364746");

    await channel
      .setName(`👶  Membres : ${totalMembers.total}`)
      .then((newChannel) =>
        console.log(`Channel's new name is ${newChannel.name}`),
      )
      .catch(console.error);

    await channel
      .send("hello!")
      .then((message) => console.log(`Sent message: ${message.content}`))
      .catch(console.error);

    console.log("Salon renommé !", totalMembers.total);

    // inscrit, maintenant faut se connecter
    res.redirect("/login");
  } catch {
    console.log("problème d'inscription");
    res.send("Problème lors de l'inscription.");
  }
});

// page de connection
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { chambre, password } = req.body;

  const user = db
    .prepare(`SELECT * FROM members WHERE chambre = ?`)
    .get(chambre);
  if (!user) return res.send("Utilisateur introuvable :(");

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.send("Mot de passe incorrect :(");

  req.session.userId = user.id;
  req.session.user = user.prenom;
  req.session.room = user.chambre;
  console.log(req.session.room);

  res.redirect("/dashboard");
});

// dashboard
app.get("/dashboard", requireAuth, (req, res) => {
  // pour le moment rangé par du plus récent au plus vieux, on changera ça plus tard
  const posts = db
    .prepare(
      `
    SELECT * FROM posts ORDER BY created_at DESC
    `,
    )
    .all();

  const pr = req.session.user;
  res.render("dashboard", { posts, pr });
});

app.get("/add", requireAuth, (req, res) => {
  res.render("add");
});
//ajouter un objet
app.post("/add", requireAuth, async (req, res) => {
  console.log(req.body);
  const { titre, desc } = req.body;

  db.prepare(
    `
    INSERT INTO posts (titre, desc, auteur, auteur_prenom, auteur_chambre)
    VALUES (?,?,?,?,?)
    `,
  ).run(titre, desc, req.session.userId, req.session.user, req.session.room);

  const totalAnnonces = db
    .prepare(
      `
      SELECT COUNT(titre) AS total FROM posts
    `,
    )
    .get();

  const channel = await client.channels.fetch("1478138536841449563");
  // await channel.setName("ANNONCES-", totalAnnonces.total);
  await channel
    .setName(`📦 Annonces: ${totalAnnonces.total}`)
    .then((newChannel) =>
      console.log(`Channel's new name is ${newChannel.name}`),
    )
    .catch(console.error);

  await channel
    .send("hello!")
    .then((message) => console.log(`Sent message: ${message.content}`))
    .catch(console.error);

  console.log("Salon renommé !", totalAnnonces.total);

  console.log("/add : ", req.session.room);
  res.redirect("/dashboard");
});

app.get("/mes-annonces", requireAuth, (req, res) => {
  const mesPosts = {
    posts: db
      .prepare(
        `
        SELECT * FROM posts WHERE auteur = ? ORDER BY created_at DESC
        `,
      )
      .all(req.session.userId),
  };

  console.log(mesPosts);
  const uid = req.session.userId;
  res.render("mesObjets", { mesPosts, uid });
});

//logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.post("/delete/:id", requireAuth, (req, res) => {
  const objetId = req.params.id;

  const objet = db
    .prepare(
      `
        SELECT * FROM posts WHERE id = ?
    `,
    )
    .get(objetId);

  if (!objet) {
    return res.redirect("/dashboard");
  }

  // 🔐 Vérifie que l'objet appartient bien à l'utilisateur
  if (objet.auteur !== req.session.userId) {
    return res.status(403).send("Action non autorisée");
  }

  db.prepare(
    `
        DELETE FROM posts WHERE id = ?
    `,
  ).run(objetId);

  res.redirect("/mes-annonces");
});

app.get("/", (req, res) => {
  const rows = db.prepare("PRAGMA table_info(posts)").all();
  console.log(rows);

  res.redirect("/dashboard");
});

app.listen(3000, () => {
  console.log("Serveur lancé : http://localhost:3000/");
});
