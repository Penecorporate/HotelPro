# CaisseBi — Présentation du système et guide d'architecture

> Document de référence pour comprendre ce que fait l'application, comment le code est organisé, et **comment ajouter une nouvelle fonctionnalité** en respectant les conventions existantes.

---

## 1. Ce que fait le système

**CaisseBi** est une caisse enregistreuse / point de vente (POS) en ligne, installable comme application (PWA), destinée aux restaurants, boutiques et petits commerces. Interface en **français** (arabe disponible par compte), monnaie par défaut **FCFA**.

### Fonctionnalités actuelles

| Domaine | Ce que ça permet | Pages (`pages/(admin)/…` sauf mention) |
|---|---|---|
| **POS** | Encaisser : grille produits, panier, remises, paiement multiple, ticket imprimable | `pages/(pos)/pos.vue` |
| **Caisse** | Ouvrir/fermer une session de caisse (fond de caisse, comptage, écart), journal | `caisse/` (ouverture, fermeture, journal) |
| **Produits / Catégories** | Catalogue vendable (prix, stock, seuil d'alerte, image, code-barres) | `produits/`, `categories/` |
| **Stock** | Vue d'ensemble, mouvements (entrée/sortie/ajustement), inventaire (brouillon → validé) | `stock/` |
| **Articles** | Stock d'**ingrédients/fournitures** (quantités décimales, unités kg/L/pièce), distinct des produits vendus ; mouvements en documents multi-lignes | `articles/` |
| **Ventes** | Historique, détail, annulation | `ventes/` |
| **Dépenses** | Saisie et rapport de dépenses | `depenses/` |
| **Rapports / Comptabilité** | Ventes, caisse, stock, journalier, comptable | `rapports/`, `comptabilite/` |
| **Magasins** | Multi-magasins indépendants sous une même entreprise (Direction uniquement) | `magasins/` |
| **Utilisateurs / Rôles** | Comptes, PIN, matrice de permissions par rôle | `utilisateurs/`, `utilisateurs/roles.vue` |
| **Paramètres** | Infos entreprise, format de ticket, horaires d'ouverture | `parametres/` |
| **Licence** | Le site est bloqué (hors Direction) sans licence active | `page-license-required`, `server/api/license/` |
| **Notifications push** | Vente, stock faible, écart de caisse, licence qui expire (Firebase FCM) | `server/utils/push.ts` |

> Le cahier des charges fonctionnel d'origine (indépendant de toute technologie) est dans [`docs/cahier_des_charges_POS_fonctionnel_sans_technologie.md`](docs/cahier_des_charges_POS_fonctionnel_sans_technologie.md).

### Rôles

| Rôle | Portée | Résumé |
|---|---|---|
| `OWNER` (« Direction ») | Toute l'entreprise, tous magasins | Accès total, jamais bloqué par la licence, gère licence/rôles/magasins. `storeId = null`. |
| `MANAGER` | Un seul magasin | Navigue partout ; l'accès aux modules est contrôlé côté API. |
| `GERANT` | Un seul magasin | Comme manager pour remises, dépenses, comptabilité. |
| `CASHIER` | Un seul magasin | Limité à `/pos`, `/caisse`, `/documentation` + modules explicitement accordés par la Direction. |

---

## 2. Stack technique

- **Nuxt 3** (Vue 3, TypeScript, SSR + API Nitro dans le même projet)
- **Prisma 7** + **MySQL/MariaDB** (adapter `@prisma/adapter-mariadb`), client généré dans `generated/prisma/` (gitignoré)
- **nuxt-auth-utils** : session par cookie scellé (`NUXT_SESSION_PASSWORD`)
- **zod** : validation des corps de requête
- **@nuxtjs/i18n** (fr / ar, stratégie `no_prefix`), **@vite-pwa/nuxt** (PWA, API jamais mises en cache)
- **Tailwind CSS 3** + template admin (CSS dans `assets/css/`), DataTables, vue-multiselect, ApexCharts/Chart.js
- **Firebase** (client `lib/firebase-client.ts`, admin `server/utils/firebase-admin.ts`) pour les push
- **nodemailer** : emails (réinitialisation de mot de passe)
- Hébergement cible : **o2switch** (cPanel Node.js), déploiement par `git push` (voir `deploy/README.md`)

> ⚠️ Le dépôt est basé sur un template admin ("NexaDash") : de nombreux dossiers (`pages/(app)`, `(cms)`, `(chart)`, `(form)`, `(ui-elements)`, `pages/aikit`, `pages/profile`, `pages/account`, `components/*` génériques…) sont des **pages de démonstration du template**, non reliées au métier. Le code métier est décrit ci-dessous.

---

## 3. Arborescence (partie métier)

```
app.vue                      Racine Nuxt
nuxt.config.ts               Modules, i18n, PWA, runtimeConfig
prisma/
  schema.prisma              Modèle de données (source de vérité)
  migrations/                Migrations SQL (nommées AAAAMMJJHHMMSS_nom)
  seed.ts                    Données initiales
server/
  api/<ressource>/…          Endpoints REST (un fichier = une route + méthode)
  middleware/license.ts      Bloque /api/** sans licence active (hors OWNER)
  middleware/no-cache-pages.ts
  routes/uploads/…           Service des images uploadées
  utils/                     Briques serveur réutilisables (voir §5)
pages/
  (admin)/…                  Écrans de gestion (layout `home`)
  (pos)/pos.vue              Écran de caisse (layout `pos`)
  (auth)/…                   Login, PIN, licence, reset, erreurs (layout `auth`)
  index.vue                  Tableau de bord
layouts/                     home (header+sidebar), pos, auth, nosidebar, utility
middleware/auth.global.ts    Garde de routes côté client/SSR
components/
  pos/…                      Composants du POS (grille, panier, paiement, ticket)
  articles/MovementForm.vue  Formulaire de mouvement d'articles
  Sidebar.vue, Header2.vue, CommonNav.vue …
composables/                 useToast, useConfirm, useLicenseStatus, useMyModuleAccess…
lib/                         Code partagé client+serveur : menu.ts, permissionModules.ts, format.ts, units.ts
i18n/locales/{fr,ar}.json    Traductions
plugins/                     idle-lock (verrouillage PIN), locale, push, toasts
scripts/                     Scripts ponctuels (licence, import produits, PIN, comptes…)
deploy/                      Scripts de déploiement o2switch
docs/                        Cahier des charges
types/auth.d.ts              Type `User` de la session
```

---

## 4. Modèle de données (`prisma/schema.prisma`)

### Hiérarchie multi-tenant

```
Company ──< Store ──< (Category, Product, Article, ArticleMovement,
                       CashRegister, Sale, Expense, InventorySession)
Company ──< User  (User.storeId = null seulement pour OWNER)
```

- **Toute donnée métier porte `companyId`** ; les données par magasin portent aussi **`storeId`**. Les magasins sont totalement indépendants (catalogue, stock, ventes, caisses propres).
- Le `number` d'un document (`Sale.number`, `ArticleMovement.number`) est séquentiel par entreprise.

### Entités principales

| Modèle | Rôle |
|---|---|
| `Company` | Entreprise : nom, devise, format/entête/pied de ticket, horaires `openTime`/`closeTime` |
| `Store` | Magasin / succursale |
| `User` | Compte : `role`, `username`, `password`, `pinCode` (4 chiffres), `locale`, `storeId` |
| `Category` (hiérarchique), `Product` | Catalogue vendable ; `Product.quantity` = stock courant, `stockable`, `alertThreshold` |
| `StockMovement` (`IN`/`OUT`/`ADJUSTMENT`) | Journal de stock des **produits** |
| `InventorySession` / `InventoryLine` | Inventaire (`DRAFT` → `VALIDATED`), théorique / réel / écart |
| `Article` | Ingrédient (quantité `Decimal(12,3)`, `unit` en texte libre) |
| `ArticleMovement` + `ArticleMovementLine` | Document d'entrée/sortie d'ingrédients (multi-lignes) |
| `CashRegister` → `CashSession` | Caisse et ses sessions (`OPEN`/`CLOSED`, fond, comptage, écart, `cashIn`/`cashOut`) |
| `Sale` → `SaleLine`, `Payment` | Vente (`COMPLETED`/`CANCELLED`), lignes (libellé/prix figés), paiements `CASH`/`CARD`/`WAVE`/`ORANGE_MONEY` |
| `Expense` | Dépense |
| `License` | Licence `CAISSEBI-XXXX-…`, activation/expiration |
| `RolePermission` | Ligne présente = le rôle a accès au module (unique par `companyId, role, module`) |
| `AuditLog` | Trace : `action`, `entity`, `entityId`, `oldValue`, `newValue` |
| `PushSubscription`, `PasswordResetToken` | Notifications push, reset mot de passe |

### Conventions du schéma
- Montants : `Decimal(12,2)` ; quantités fractionnaires : `Decimal(12,3)` ; entiers pour le stock des produits.
- Index sur `companyId` et `storeId` pour chaque table concernée.
- Évolution **uniquement par migration** (`npm run db:migrate`), jamais en modifiant la base à la main.

---

## 5. Architecture serveur

### 5.1 Convention des routes API (`server/api/`)

Nuxt/Nitro mappe les fichiers aux routes :

| Fichier | Route |
|---|---|
| `articles/index.get.ts` | `GET /api/articles` |
| `articles/index.post.ts` | `POST /api/articles` |
| `articles/[id].patch.ts` | `PATCH /api/articles/:id` |
| `articles/[id].delete.ts` | `DELETE /api/articles/:id` |
| `articles/movements/[id].get.ts` | `GET /api/articles/movements/:id` |

Ressources existantes : `articles`, `auth`, `cash-registers`, `cash-sessions`, `categories`, `company`, `dashboard`, `expenses`, `license`, `products`, `push`, `reports`, `role-permissions`, `sales`, `stock`, `stores`, `uploads`, `users`.

### 5.2 Anatomie standard d'un endpoint

```ts
import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { resolveWriteStoreId } from "~/server/utils/storeScope";

const bodySchema = z.object({ designation: z.string().min(1), unit: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "stock");          // 1. authentification + autorisation
  const data = await readValidatedBody(event, bodySchema.parse);   // 2. validation zod

  return prisma.article.create({                                   // 3. accès base, TOUJOURS filtré
    data: { ...data, companyId: user.companyId, storeId: await resolveWriteStoreId(user) },
  });
});
```

Pour une **lecture** : `where: { companyId: user.companyId, ...resolveStoreScope(user) }`.
Pour une opération **atomique multi-tables** (vente, mouvement de stock) : `prisma.$transaction(async (tx) => { … })` (voir `server/api/sales/index.post.ts`).
Erreurs : `throw createError({ statusCode, statusMessage })` (messages en français).

### 5.3 Utilitaires serveur (`server/utils/`)

| Fichier | Rôle |
|---|---|
| `prisma.ts` | Singleton `prisma` (adapter MariaDB) |
| `authz.ts` | `requireUser(event)`, `requireRole(event, [roles])` → 401/403 |
| `permissions.ts` | `requireModuleAccess(event, module)`, `hasModuleAccess` (OWNER passe toujours) |
| `storeScope.ts` | `resolveStoreScope(user)` (lecture), `resolveWriteStoreId(user)` (écriture) — **ne jamais faire confiance au `storeId` envoyé par le client** |
| `audit.ts` | `logAudit({ companyId, userId, action, entity, entityId, oldValue, newValue })` |
| `businessDay.ts` | `getBusinessDayRange(date, company)` : « journée commerciale » pouvant dépasser minuit |
| `license.ts` | Génération de clé, `getActiveLicense(companyId)` |
| `push.ts` | `sendPushToUsers`, `getOwnerUserIds`, `getSupervisorUserIds` (best-effort, ne lève jamais) |
| `pinRateLimit.ts` | Anti-bruteforce PIN |
| `mailer.ts`, `firebase-admin.ts` | Emails, FCM |

### 5.4 Sécurité : les 4 couches

1. **Authentification** — `requireUser` / `requireRole` / `requireModuleAccess` dans chaque endpoint (sauf `/api/auth/*`).
2. **Rôle** — `requireRole(event, ["OWNER","MANAGER"])` pour les actions sensibles (ex. fermer une caisse).
3. **Module** — `requireModuleAccess` s'appuie sur `RolePermission`. Modules actuels (`lib/permissionModules.ts`) : `produits`, `stock`, `ventes`, `rapports`, `depenses`.
4. **Portée magasin / entreprise** — toute requête filtre par `companyId` et `storeId` (voir 5.3).

Plus : `server/middleware/license.ts` renvoie `403 LICENSE_REQUIRED` sur `/api/**` pour tout non-OWNER sans licence active (exceptions : `/api/auth`, `/api/_auth`, `/api/license`).

### 5.5 Session (`types/auth.d.ts`)

`session.user = { id, name, email, role, companyId, storeId, activeStoreId?, locale }`.
`activeStoreId` : magasin « courant » de la Direction (`POST /api/stores/switch`) ; `null` = vue agrégée tous magasins.

---

## 6. Architecture front

### 6.1 Pages, layouts, routage
- Routage par fichiers ; les dossiers entre parenthèses `(admin)`, `(pos)`, `(auth)` sont des **groupes** (n'apparaissent pas dans l'URL) : `pages/(admin)/articles/index.vue` → `/articles`.
- Chaque page choisit son layout : `definePageMeta({ layout: "home" })` (`home` = header + sidebar ; `pos` = plein écran ; `auth` = connexion).
- Données : `const { data, refresh } = await useFetch("/api/...")`. Mutations : `$fetch(url, { method, body })` puis `refresh()`.
- Retours utilisateur : `useToast()`, confirmations `useConfirm().confirmDanger(...)`.
- Page type de référence : `pages/(admin)/articles/index.vue` (liste DataTables + modale création/édition) et `pages/(admin)/articles/mouvement/` (document multi-lignes : liste / nouveau / détail / édition).

### 6.2 Garde de routes — `middleware/auth.global.ts`
Ordre : chemins ouverts → pages publiques (login…) → non connecté ⇒ `/login` → non-OWNER sans licence ⇒ `/page-license-required` → `CASHIER` limité à `/pos`, `/caisse`, `/documentation` **ou** modules accordés (`MODULE_ROUTE_PREFIXES`) sinon retour `/pos`.

### 6.3 Menu — `lib/menu.ts` + `components/Sidebar.vue`
- `lib/menu.ts` : source unique des routes (`lable`, `link`, `roles?`, `childer?`). Le champ `roles` restreint l'affichage par rôle (**affichage uniquement**, pas de sécurité).
- `Sidebar.vue` associe un libellé français → icône (`ICONS`) et → clé i18n (`I18N_KEYS`). Ne pas renommer un `lable` sans mettre à jour ces tables.

### 6.4 i18n
`i18n/locales/fr.json` et `ar.json`, clés `nav.*`, `common.*`… La langue est stockée par utilisateur (`User.locale`, `POST /api/auth/locale`). Beaucoup d'écrans métier sont encore en français « en dur » ; le menu est traduit.

### 6.5 Autres mécanismes transverses
- **Verrouillage par inactivité / PIN** : `plugins/idle-lock.client.ts`, pages `page-lock-screen` / `page-pin-lock`, endpoints `auth/unlock*`.
- **PWA** : `nuxt.config.ts` (`/api/**` en `NetworkOnly` : jamais de données financières périmées).
- **Uploads** d'images produits : `server/api/uploads/product-image.post.ts` → `storage/uploads/` (hors `public/` pour survivre aux builds), servi par `server/routes/uploads/…`.
- **Format** : `lib/format.ts` (`formatAmount`), `lib/units.ts` (unités restaurant).

---

## 7. Flux métier clés

### Vente (`POST /api/sales`)
1. `requireUser` → valider `{ cashSessionId, lines[], payments[] }`.
2. Vérifier qu'une **session de caisse OUVERTE** existe dans le périmètre du magasin ; un `CASHIER` ne vend que sur **sa** session ; la remise est refusée aux caissiers.
3. Recalculer le total **côté serveur** depuis `Product.salePrice` (le prix client n'est jamais cru) ; refuser si stock insuffisant ; vérifier `somme(paiements) == total`.
4. Transaction : créer `Sale` + `SaleLine` + `Payment`, décrémenter `Product.quantity`, écrire un `StockMovement OUT`.
5. Push : « Nouvelle vente » (Direction) et « Stock faible » (superviseurs).

### Session de caisse
`open` (fond de caisse) → ventes → `close` (Owner/Manager) : `théorique = fond + espèces + cashIn − cashOut`, `écart = compté − théorique`, audit + push si écart.

### Stock produits vs Articles
- **Produits** : stock décrémenté automatiquement par les ventes ; ajusté via `stock/movements` et `stock/inventory`.
- **Articles** (ingrédients) : stock **séparé**, alimenté uniquement par des `ArticleMovement` (documents entrée/sortie). Aucun lien automatique avec les ventes (pas de recettes).

### Journée commerciale
Les rapports/dashboard utilisent `getBusinessDayRange` : si l'entreprise ferme après minuit (ex. 07:00 → 02:00), une vente à 01:00 appartient à la journée précédente.

---

## 8. Guide : ajouter une nouvelle fonctionnalité

Exemple fil rouge : **« Fournisseurs »** (module de gestion). Suivre l'ordre :

### Étape 1 — Modèle de données
1. Ajouter le(s) modèle(s) dans `prisma/schema.prisma` avec `companyId` (+ `storeId` si propre à un magasin), les relations inverses sur `Company`/`Store`, et les `@@index`.
2. `npm run db:migrate` (donner un nom explicite) → un dossier est créé dans `prisma/migrations/`. **Commiter la migration** : le déploiement l'applique automatiquement.
3. Si une donnée existante doit être rétro-remplie, l'écrire dans le SQL de la migration (voir `…_add_stores`).

### Étape 2 — API (`server/api/fournisseurs/`)
Créer `index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts` en copiant l'anatomie du §5.2 :
- choisir la garde : `requireUser` (tout connecté), `requireRole` (rôles précis) ou `requireModuleAccess` (module configurable) ;
- **filtrer toujours** par `companyId` (+ `resolveStoreScope`) en lecture, et utiliser `resolveWriteStoreId` en création ;
- valider avec **zod** ; préférer la désactivation (`active: false`) à la suppression si l'entité est référencée ;
- appeler `logAudit(...)` pour les changements sensibles ; `$transaction` si plusieurs tables ;
- `sendPushToUsers` si l'événement mérite une notification.

### Étape 3 — Contrôle d'accès
- **Réutiliser un module existant** (le plus simple) : ex. `requireModuleAccess(event, "stock")`.
- **Créer un nouveau module configurable** : ajouter son nom dans `GATEABLE_MODULES` et ses préfixes dans `MODULE_ROUTE_PREFIXES` (`lib/permissionModules.ts`), puis vérifier que `pages/(admin)/utilisateurs/roles.vue` l'affiche (la Direction l'accorde par rôle ; aucune migration nécessaire, `module` est une chaîne).
- Un module réservé à certains rôles uniquement → `requireRole`.

### Étape 4 — Pages
Créer `pages/(admin)/fournisseurs/index.vue` (`definePageMeta({ layout: "home" })`, `useFetch`, `$fetch`, `useToast`, `useConfirm`). S'inspirer de `articles/index.vue`. Pour un document multi-lignes : `articles/mouvement/*` + `components/articles/MovementForm.vue`.

### Étape 5 — Navigation
1. Ajouter l'entrée dans `lib/menu.ts` (`{ lable: "Fournisseurs", link: "/fournisseurs", roles?: [...] }`).
2. Dans `components/Sidebar.vue` : ajouter l'icône dans `ICONS` et la clé dans `I18N_KEYS`.
3. Ajouter `nav.fournisseurs` dans `i18n/locales/fr.json` **et** `ar.json`.

### Étape 6 — Rapports / Dashboard (si pertinent)
Ajouter un endpoint dans `server/api/reports/` ou étendre `dashboard/summary.get.ts` ; utiliser `getBusinessDayRange` pour tout calcul « par jour ».

### Étape 7 — Vérifications avant livraison
- [ ] Chaque requête Prisma filtre par `companyId` (et `storeId` via `storeScope`).
- [ ] Chaque endpoint a sa garde d'accès (aucune route sans `require*`, hors `/api/auth`).
- [ ] Les montants/prix sont recalculés côté serveur.
- [ ] Migration créée et commitée ; `generated/` jamais commité.
- [ ] Testé avec **plusieurs rôles** (OWNER, MANAGER, CASHIER) et avec **2 magasins** (isolation des données).
- [ ] Testé avec licence expirée (un non-OWNER doit être bloqué).
- [ ] Entrée de menu + traductions fr/ar.

### Pièges connus
- **Ne pas se fier au `storeId` du client** — toujours `storeScope`.
- **OWNER sans magasin actif** : `resolveWriteStoreId` lève une erreur s'il y a plusieurs magasins et aucun n'est sélectionné ; l'UI doit gérer ce cas.
- Les `lable` de `lib/menu.ts` servent de clés (icônes, i18n) : les renommer casse la sidebar.
- `roles` dans `menu.ts` ne protège **pas** l'API — la sécurité vit côté `server/api`.
- DataTables rend côté client uniquement (`*.client.vue`) : attention au SSR.
- Les `Decimal` Prisma sont sérialisés en chaînes JSON : utiliser `Number(...)` côté client/serveur pour calculer.

---

## 9. Environnement, scripts et déploiement

### Variables d'environnement (`.env.example`)
`DATABASE_URL` (MySQL), `NUXT_SESSION_PASSWORD` (≥ 32 caractères), `NUXT_PUBLIC_SITE_URL`, `SMTP_*`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, `NUXT_PUBLIC_FIREBASE_VAPID_KEY`.

### Commandes
```bash
npm install            # installe + nuxt prepare
npm run dev            # serveur de développement
npm run build          # build de production (.output/)
npm run db:migrate     # nouvelle migration (dev)
npm run db:seed        # données initiales
npm run db:studio      # explorateur Prisma
```

### Scripts utilitaires (`scripts/`, lancés avec `tsx`)
`generate-license.ts` (génère une clé de licence — la génération est hors application), `import-products.ts`, `set-admin-pin.ts`, `create-staff-users.ts`, `update-company-info.ts`, `gen-pwa-icons.mjs`.

### Déploiement
`git push` vers le dépôt distant o2switch → hook : installation, `prisma generate` **sur le serveur**, migrations, `nuxt build`, redémarrage. Détails dans [`deploy/README.md`](deploy/README.md). Le même code peut alimenter un second site indépendant (voir l'historique git : « Support deploying a second independent site »).

---

## 10. Glossaire

| Terme | Sens |
|---|---|
| Direction | Rôle `OWNER` |
| Gérant | Rôle `GERANT` |
| Caisse / Session de caisse | `CashRegister` / `CashSession` (ouverture → fermeture avec écart) |
| Article | Ingrédient/fourniture (≠ Produit vendu) |
| Module | Unité de permission configurable (`GATEABLE_MODULES`) |
| Journée commerciale | Plage horaire d'ouverture pouvant chevaucher minuit |
