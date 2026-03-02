<img src="https://github.com/aweirdwhale/ubeur-it/blob/master/banner.png" style="width: 100%"/>
<br/>
![](https://img.shields.io/badge/Awesome%20CG-EC3750?style=for-the-badge&logo=&logoColor=white)![](https://img.shields.io/badge/Sqlite-003B57?style=for-the-badge&logo=sqlite&logoColor=white) ![](https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white) ![](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)
---
Besoin d'un oignon mais c'est dimanche et tout est fermé ? Besoin d'une grosse casserole ? Un balais ? Un ouvre boîte ? Pas de galère : Ubeur It !

Ubeur It est une plate-forme de partage destiné à l'internat CPGE de Camille Guérin. Si vous êtes intéressés pour adapter le projet à votre lycée, ou pour y contribuer, je vous invite à cliquer ici.

## À l'attention des résidents de CG :
Pour utiliser Ubeur It, il suffit de créer un compte avec votre numéro de chambre sur le site (bientôt disponible), de vous connecter et de parcourir les annonces, de faire une requête ou d'en poster une.

> En cas de soucis, merci d'ouvrir une issue directement sur github ou un ticket sur le discord.

## À l'attention des développeurs :
> Ce projet est soumis à une licence MIT. vous pouvez le réutiliser comme vous voulez, je vous demande simplement de faire un fork, laisser une étoile et créditer cette repo.

Ubeur It utilise un stack **node-express-SQLite**.
### liste des dépendances:
Installation rapide :`
```bash
npm i express sqlite3 bcrypt ejs express-session better-sqlite3
npm i nodemon --save-dev
```

| Dépendances     | Intérêt                                       | Version dans le projet                                  |
| --------------- | --------------------------------------------- | ------------------------------------------------------- |
| Express         | Pour mettre en place un serveur               | [5.2.1](https://www.npmjs.com/package/@types/express)   |
| Express-session | Pour gérer les sessions -> simplifie le login | [1.19.0](https://www.npmjs.com/package/express-session) |
| sqlite3         | Gestion de la base de données                 | 5.1.7                                                   |
| bcrypt          | Cryptographie                                 | [6.0.0](https://www.npmjs.com/package/bcryptnodemon)    |
| ejs             | Implementation du html dans le js             | [4.0.1](https://www.npmjs.com/package/@types/ejs)       |
| Nodemon         | Seulement en dev pour avoir le hot reload     | 3.1.14                                                  |

### Structure du projet :
```
ubeur-it/                      root
├── .gitignore
├── app.js                     serveur
├── data.db                    stocke la base de données
├── database.js                crée la base de données
├── package-lock.json
├── package.json
└── views/                     pages du site
    ├── book.ejs
    ├── dashboard.ejs
    ├── login.ejs
    ├── mesObjets
    ├── register.ejs
    └── upload.ejs

```
### Base de données :

La base de données comporte deux tables : **members** et **posts**
##### members

| Clefs      | Valeurs                                           |
| ---------- | ------------------------------------------------- |
| Id         | Clef primaire : entier qui s'incremente tout seul |
| Chambre    | Entier                                            |
| Prenom     | Char*                                             |
| Password   | Char* (hash)                                      |
| Created_at | Timestamp (auto)                                  |
##### posts
| Clefs      | Valeurs                                |
| ---------- | -------------------------------------- |
| id         | Id du post (comme la table précédente) |
| titre      | char*                                  |
| desc       | char*                                  |
| auteur     | clef étrangère : int , id de members   |
| created_at | Timestamp (auto)                       |
