// const client = require("./bot");
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// const { EmbedBuilder } = require("discord.js");

// images
const multer = require("multer");
const path = require("path");

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
const { render } = require("ejs");
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

// configuration de multer pour upload images :
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: function (req, file, cb) {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Images uniquement !"));
    }
  },
});

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

    // const channel = await client.channels.fetch("1478139386368364746");

    // await channel
    //   .setName(`👶  Membres : ${totalMembers.total}`)
    //   .then((newChannel) =>
    //     console.log(`Channel's new name is ${newChannel.name}`),
    //   )
    //   .catch(console.error);

    // await channel
    //   .send("hello!")
    //   .then((message) => console.log(`Sent message: ${message.content}`))
    //   .catch(console.error);

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
  const id = req.session.userId;

  const pdp = db
    .prepare(
      `
      SELECT pdp FROM members WHERE id = ?
    `,
    )
    .get(id);

  console.log("pdp : ", pdp);
  res.render("dashboard", { posts, pr, id, pdp });
});

app.get("/add", requireAuth, (req, res) => {
  res.render("add");
});
//ajouter un objet
app.post("/add", requireAuth, upload.single("image"), async (req, res) => {
  console.log(req.file);
  const imagePath = "/uploads/" + req.file.filename;

  console.log(imagePath);
  const { titre, desc } = req.body;

  db.prepare(
    `
    INSERT INTO posts (titre, desc, auteur, auteur_prenom, auteur_chambre, image)
    VALUES (?,?,?,?,?,?)
    `,
  ).run(
    titre,
    desc,
    req.session.userId,
    req.session.user,
    req.session.room,
    imagePath,
  );

  const totalAnnonces = db
    .prepare(
      `
      SELECT COUNT(titre) AS total FROM posts
    `,
    )
    .get();

  // const channel = await client.channels.fetch("1478138536841449563");
  // await channel.setName("ANNONCES-", totalAnnonces.total);
  // await channel
  //   .setName(`📦 Annonces: ${totalAnnonces.total}`)
  //   .then((newChannel) =>
  //     console.log(`Channel's new name is ${newChannel.name}`),
  //   )
  //   .catch(console.error);

  // // const channel2 = await client.channels.fetch("1478146644217303052");

  // const embed = new EmbedBuilder()
  //   .setColor(0x3498db)
  //   .setTitle("📦 Nouvelle annonce")
  //   .setDescription(`**${titre}**\n${desc}`)
  //   .addFields(
  //     { name: "👤 Auteur", value: req.session.user, inline: true },
  //     { name: "🏠 Chambre", value: req.session.room.toString(), inline: true },
  //   )
  //   .setTimestamp();

  // await channel2.send({ embeds: [embed] });

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

// supprimer une annonce
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

// app.post("/book/:id", requireAuth, (req, res) => {
//   res.redirect("/book", {});
// });

app.get("/book/:id", requireAuth, (req, res) => {
  console.log(req.params.id);

  const objetId = req.params.id;
  console.log(objetId);

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

  console.log(objet);

  res.render("book", { objet });
});

app.post("/reserve/:id", requireAuth, (req, res) => {
  const post = db
    .prepare(
      `
      SELECT * FROM posts WHERE id = ?
    `,
    )
    .get(req.params.id);

  if (!post) return res.redirect("/dashboard");

  if (post.auteur === req.session.userId)
    return res.send("Tu ne peux pas réserver ton propre objet");

  // Vérifie si conversation existe déjà
  let convo = db
    .prepare(
      `
      SELECT * FROM chats
      WHERE (user1 = ? AND user2 = ?)
         OR (user1 = ? AND user2 = ?)
    `,
    )
    .get(req.session.userId, post.auteur, post.auteur, req.session.userId);

  console.log(convo);
  if (!convo) {
    const result = db
      .prepare(
        `
        INSERT INTO chats (user1, user2)
        VALUES (?, ?)
      `,
      )
      .run(req.session.userId, post.auteur);

    convo = { id: result.lastInsertRowid };
  }
  console.log(convo.id);

  // Message automatique
  db.prepare(
    `
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES (?, ?, ?)
    `,
  ).run(convo.id, req.session.userId, "Est interessé par une de tes annonces.");

  res.redirect(`/messages/${convo.id}`);
});

app.get("/messages/:id", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const conversationId = req.params.id;

  // Récupérer la conversation
  const conversation = db
    .prepare(
      `
    SELECT * FROM chats WHERE id = ?
  `,
    )
    .get(conversationId);

  if (!conversation) {
    return res.redirect("/dashboard");
  }

  // Vérifier que l'utilisateur fait partie de la conversation
  if (conversation.user1 !== userId && conversation.user2 !== userId) {
    return res.status(403).send("Accès interdit");
  }

  // Trouver l'ID de l'interlocuteur
  const otherUserId =
    conversation.user1 === userId ? conversation.user2 : conversation.user1;

  // Récupérer son prénom
  const otherUser = db
    .prepare(
      `
    SELECT prenom, pdp FROM members WHERE id = ?
  `,
    )
    .get(otherUserId);

  // Récupérer les messages
  const messages = db
    .prepare(
      `
    SELECT * FROM messages
    WHERE chat_id = ?
    ORDER BY created_at ASC
  `,
    )
    .all(conversationId);

  // Envoyer tout à la page
  res.render("conversation", {
    messages,
    userId,
    conversationId,
    mecEnFace: otherUser?.prenom,
    teteDuMecEnFace: otherUser?.pdp,
  });
});

app.post("/messages/:id", requireAuth, (req, res) => {
  const { content } = req.body;
  const conversationId = req.params.id;

  if (!content || content.trim() === "") {
    return res.redirect(`/messages/${conversationId}`);
  }

  // Vérifie que l'utilisateur fait partie de la conversation
  const convo = db
    .prepare(
      `
    SELECT * FROM chats
    WHERE id = ?
  `,
    )
    .get(conversationId);

  if (!convo) return res.redirect("/dashboard");

  if (
    convo.user1 !== req.session.userId &&
    convo.user2 !== req.session.userId
  ) {
    return res.status(403).send("Non autorisé");
  }

  db.prepare(
    `
    INSERT INTO messages (chat_id, sender_id, content)
    VALUES (?, ?, ?)
  `,
  ).run(conversationId, req.session.userId, content);

  res.redirect(`/messages/${conversationId}`);
});

app.get("/conversations", requireAuth, (req, res) => {
  const conversations = db
    .prepare(
      `
    SELECT * FROM chats
    WHERE user1 = ? OR user2 = ?
    ORDER BY created_at DESC
  `,
    )
    .all(req.session.userId, req.session.userId);

  const conversationsWithNames = conversations.map((convo) => {
    const idDuMecEnFace =
      convo.user1 === req.session.userId ? convo.user2 : convo.user1;

    const mecEnFace = db
      .prepare(`SELECT prenom FROM members WHERE id = ?`)
      .get(idDuMecEnFace);

    return {
      ...convo,
      other_prenom: mecEnFace?.prenom,
    };
  });

  console.log(conversationsWithNames);
  res.render("conversations", { conversationsWithNames });
});

app.get("/settings", (req, res) => {
  res.render("settings");
});

app.post("/settings", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.send("Aucune image envoyée");
  }

  const imagePath = "/uploads/" + req.file.filename;

  db.prepare(
    `
    UPDATE members
    SET pdp = ?
    WHERE id = ?
  `,
  ).run(imagePath, req.session.userId);

  res.redirect("/dashboard");

  console.log("pdp :", imagePath);
});

app.get("/", (req, res) => {
  const rows = db.prepare("PRAGMA table_info(posts)").all();
  console.log(rows);

  res.redirect("/dashboard");
});

app.listen(3000, () => {
  console.log("Serveur lancé : http://localhost:3000/");
});
