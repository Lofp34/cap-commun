# Ressources et pilotage — contrat API v1, évolution additive du 7 novembre 2026

Les fichiers restent dans Drive et les échanges dans Gmail. L’application ne charge aucun document ni aperçu externe ; elle affiche uniquement des liens HTTPS, ouverts dans un nouvel onglet sans accès à la fenêtre d’origine ni transmission du référent.

## Références

Sur `projects`, `deliverables` et `tasks`, utiliser `externalRefs` :

```json
[{"id":"notice-projet-1","label":"Notice du projet","url":"https://example.com/notice","type":"document","visibility":"private"}]
```

- Identifiant stable et unique dans la fiche, 180 caractères maximum ; libellé non vide, 180 caractères ; URL HTTPS de 2 048 caractères maximum, sans identifiants intégrés ni caractères de contrôle. Types facultatifs : `drive`, `gmail`, `document`, `website`, `other`. Maximum 100 références.
- Visibilité par défaut : `private`. Seul Camille peut choisir `project`. Cette sélection rend le libellé et l’URL visibles aux membres déjà autorisés sur le projet actif. Elle ne donne aucun accès Google et ne partage aucun document.
- L’agent crée et actualise des références privées ; il conserve les références choisies par Camille et demande un arbitrage pour leur modification ou leur visibilité. La protection existante des corrections humaines reste applicable.
- `driveId` / `driveUrl` restent le rattachement existant au dossier du projet, privé par défaut. Ils sont affichés sans migration. Un dossier également présent dans `externalRefs` est dédupliqué à l’affichage, y compris les variantes du lien contenant des paramètres Google.
- Les anciens formats sont préservés sans réécriture. Les chaînes HTTPS et objets comportant `url` ou `href` peuvent être consultés. Une ancienne valeur non exploitable est conservée mais n’est pas exécutée ; Camille peut la remplacer par une référence structurée. Les modifications sans rapport ne la suppriment pas.
- Les libellés sont du texte échappé, jamais du HTML. Aucune récupération serveur des URL ni interprétation du contenu distant.

## Pilotage

Champ facultatif `steering`, identique sur projet, chantier et action :

```json
{
  "state":"La notice est préparée ; elle attend une relecture.",
  "asOf":"2026-11-07",
  "nextStep":"Relire la notice et proposer un créneau.",
  "nextOwnerId":"camille",
  "nextTaskId":null,
  "questions":["Quel créneau retenir ?"],
  "visibility":"private"
}
```

`expectedResult` peut compléter le résultat déjà porté par `outcome` (projet) ou `description` (chantier/action). `state`, `nextStep`, `expectedResult` : 6 000 caractères maximum chacun. `asOf` doit être une date valide ; obligatoire si l’état est renseigné. Les questions sont limitées à 30 textes de 2 000 caractères chacun. Le responsable doit exister.

Sans `nextTaskId`, la prochaine étape est une **proposition**, et le responsable est proposé. Un `nextTaskId` doit désigner une action existante du même projet : son titre, son statut et son responsable actuels sont alors affichés comme prochaine action attribuée. Aucun champ ne crée automatiquement une tâche, un rendez-vous, un envoi ou une validation. Les champs historiques `missingInformation` et `proposals` restent lisibles par Camille sans exposer le journal brut.

Le pilotage est privé par défaut. Sa visibilité aux membres nécessite un choix de Camille. Les écritures de l’agent ne peuvent pas publier de nouvelles informations dans un bloc déjà partagé ; il prépare un arbitrage avec Camille. Les résumés partagés doivent contenir uniquement des informations sélectionnées pour le projet.

## Lecture, modifications et concurrence

`GET /api/v1/state` conserve son contrat `{revision,data,actor}`. Les membres ne reçoivent ni les références privées, ni les anciens liens Drive privés, ni les preuves, propositions ou questions historiques privées. Un projet non partagé reste absent.

Les agents continuent d’utiliser `POST /api/v1/changes` : relire la version courante, conserver tous les champs existants et fournir les sources datées déjà exigées. Ne pas envoyer uniquement un fragment d’entité à cette route. Les nouveaux champs sont facultatifs ; aucune migration D1 ni modification du schéma SQLite.

Nouvelle opération **réservée à Camille** : `POST /api/v1/entities/details`, avec l’en-tête `Idempotency-Key` et le corps :

```json
{"collection":"projects","id":"projet-1","revision":75,"entityRevision":4,"patch":{"externalRefs":[]}}
```

Collections : `projects`, `deliverables`, `tasks`. Champs modifiables dans `patch` : `externalRefs`, `driveUrl`, `driveId`, `steering` uniquement. Le serveur fusionne avec la fiche courante, contrôle la version globale **et** celle de l’entité, applique les permissions et protections, puis renvoie `{revision,data}` filtré pour l’identité authentifiée. La même clé est réutilisée pour la répétition de la même requête, jamais pour une saisie différente. Les champs métier, validations et sources sont conservés. Les versions incompatibles renvoient 409 ; pas de fusion silencieuse ni de réessai forcé.

L’interface affiche la réponse serveur après succès. En cas d’erreur, elle conserve le formulaire et montre le refus réel. Pour un conflit, copier la saisie, annuler puis recharger avant de réappliquer après comparaison. Les autres commandes de l’application gardent leur fonctionnement existant.

## Vérifications et exploitation

Une sauvegarde complète préalable a été conservée sur le serveur Assistant-ia dans `.assistant-ia/backups/cap-before-references-20261107T113149Z.json` (révision 75). Aucune écriture de données de démonstration en production. Le retour à la version précédente de l’application reste possible, les champs nouveaux étant additifs.

Les tests API couvrent l’ajout et la relecture des références, la conservation des champs, l’idempotence, les conflits, les URL interdites, les liens privés et sélectionnés, les refus d’accès, les anciens formats et la protection des corrections humaines. Les contrôles navigateur utilisent une base SQLite en mémoire et des données fictives : consultation projet/chantier/action, texte long, ajout depuis l’interface puis lecture API, erreur 503 conservant la saisie, clavier et largeurs mobiles 320/390/430 px.

Limites : les droits d’ouverture et la disponibilité d’un document restent gérés par Google ; un lien visible ne prouve pas l’accès au contenu. Les anciennes URL écrites dans les descriptions ne sont pas extraites automatiquement. Aucun partage Google, document ou dossier externe n’est modifié par ce correctif.
