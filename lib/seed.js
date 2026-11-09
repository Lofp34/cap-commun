const CockpitSeed = {
  create: function (today) {
    const base = new Date(String(today) + 'T12:00:00.000Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today)) || Number.isNaN(base.getTime()) || base.toISOString().slice(0, 10) !== today) {
      throw new TypeError('La date de démonstration doit être une date valide au format AAAA-MM-JJ.');
    }
    const date = function (offset) {
      const value = new Date(base.getTime());
      value.setUTCDate(value.getUTCDate() + offset);
      return value.toISOString().slice(0, 10);
    };
    const time = function (offset, hour) { return date(offset) + 'T' + (hour || '09') + ':00:00.000Z'; };
    const task = function (id, title, projectId, deliverableId, ownerId, status, offset, extra) {
      return Object.assign({
        id: id,
        title: title,
        projectId: projectId,
        deliverableId: deliverableId,
        ownerId: ownerId,
        status: status,
        dueDate: offset === null ? null : date(offset),
        priority: 'normal',
        description: '',
        blocker: '',
        blockedById: null,
        dependencyIds: [],
        needsApproval: false,
        reviewerId: null,
        createdAt: time(-7),
        updatedAt: time(status === 'done' ? Math.min(offset, -1) : 0),
        completedAt: status === 'done' ? time(Math.min(offset, -1), '15') : null,
        source: 'demo',
        externalRefs: []
      }, extra || {});
    };
    const projects = [
      {
        id: 'atelier-atlas', name: 'Atelier Atlas', shortName: 'Atelier Atlas', code: 'CO', color: '#16877C', ownerId: 'camille', goalId: 'goal-clients',
        purpose: 'Structurer un accompagnement commercial qui se traduit en habitudes de terrain.',
        outcome: 'Un parcours partagé, des outils concrets et un suivi simple des engagements.',
        priorities: ['Clarifier le cadre de la mission', 'Préparer des séquences ancrées dans le terrain', 'Rendre le suivi facile à utiliser'],
        dueDate: date(21), archived: false, order: 0, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'formation-demo', name: 'Parcours de formation', shortName: 'Parcours de formation', code: 'RP', color: '#96704B', ownerId: 'camille', goalId: 'goal-tools',
        purpose: 'Concevoir un parcours pédagogique qui relie compétences, pratique et évaluation.',
        outcome: 'Des séquences prêtes à animer avec leurs exercices et critères de réussite.',
        priorities: ['Relier les activités aux compétences', 'Donner une place centrale à la pratique', 'Faciliter la préparation des séances'],
        dueDate: date(28), archived: false, order: 1, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'projet-boreal', name: 'Projet Boréal', shortName: 'Projet Boréal', code: 'DE', color: '#517E9B', ownerId: 'camille', goalId: 'goal-tools',
        purpose: 'Articuler formation grands comptes et application de pilotage stratégique.',
        outcome: 'Un parcours cohérent entre les ateliers, les décisions et leur mise en œuvre dans l’application.',
        priorities: ['Valider les parcours prioritaires', 'Simplifier les vues de pilotage', 'Préparer une démonstration utile aux échanges'],
        dueDate: date(14), archived: false, order: 2, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'studio-rivage', name: 'Studio Rivage', shortName: 'Studio Rivage', code: 'SA', color: '#8871B1', ownerId: 'camille', goalId: 'goal-clients',
        purpose: 'Ancrer les pratiques commerciales dans des situations client concrètes.',
        outcome: 'Des ateliers prêts à animer et un suivi lisible de la mise en pratique.',
        priorities: ['Préparer les mises en situation', 'Organiser les retours des participants', 'Consolider les livrables de suivi'],
        dueDate: date(18), archived: false, order: 3, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'maison-horizon', name: 'Maison Horizon', shortName: 'Maison Horizon', code: 'SH', color: '#BC8551', ownerId: 'camille', goalId: 'goal-clients',
        purpose: 'Adapter l’accompagnement commercial aux enjeux des équipes Accueil.',
        outcome: 'Un atelier contextualisé et des repères immédiatement utilisables en entretien.',
        priorities: ['Choisir les situations de travail', 'Contextualiser les exercices', 'Finaliser les repères pour le terrain'],
        dueDate: date(24), archived: false, order: 4, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'assistant-ia', name: 'Assistant-ia', shortName: 'Assistant-ia', code: 'OC', color: '#668A65', ownerId: 'alex', goalId: 'goal-operations',
        purpose: 'Donner à chaque agent IA une mission claire et un cadre de délégation lisible.',
        outcome: 'Des agents identifiés, des consignes exploitables et des validations humaines explicites.',
        priorities: ['Définir les rôles des agents', 'Tester une délégation de bout en bout', 'Rendre visibles les points de validation'],
        dueDate: date(16), archived: false, order: 5, source: 'user', detailsSource: 'demo', externalRefs: []
      },
      {
        id: 'infrastructure', name: 'Serveur et infrastructure', shortName: 'Serveur', code: 'SV', color: '#74869B', ownerId: 'alex', goalId: 'goal-operations',
        purpose: 'Disposer d’un socle technique fiable pour les applications et les automatisations.',
        outcome: 'Un environnement documenté, des sauvegardes vérifiables et des intégrations maîtrisées.',
        priorities: ['Documenter les services utiles', 'Vérifier la restauration des sauvegardes', 'Préparer un suivi technique léger'],
        dueDate: date(12), archived: false, order: 6, source: 'user', detailsSource: 'demo', externalRefs: []
      }
    ];
    const tasks = [
      task('t-occ-cadre', 'Valider le cadre de l’accompagnement', 'atelier-atlas', 'd-occ-parcours', 'camille', 'todo', 0, { priority: 'high', description: 'Relire la finalité, le résultat attendu et les limites du parcours avant de préparer la prochaine séquence.' }),
      task('t-occ-plan', 'Relire la proposition de déroulé', 'atelier-atlas', 'd-occ-parcours', 'camille', 'todo', 0, { needsApproval: true, reviewerId: 'camille', description: 'Une proposition illustrative attend une validation : vérifier le rythme et la place des exercices.' }),
      task('t-occ-ressources', 'Préparer les fiches de mise en pratique', 'atelier-atlas', 'd-occ-parcours', 'agent-training', 'doing', 1, { description: 'Rédiger une fiche courte par situation de travail, avec consigne, exemple et critère de réussite.' }),
      task('t-occ-suivi', 'Esquisser la vue de suivi des engagements', 'atelier-atlas', 'd-occ-suivi', 'alex', 'todo', 3, { description: 'Proposer une vue très simple pour retrouver les engagements et leur prochaine étape.' }),

      task('t-formation-demo-architecture', 'Poser la trame du parcours pédagogique', 'formation-demo', 'd-formation-demo-architecture', 'camille', 'done', -3, { description: 'Illustration d’une trame validée reliant les séquences aux compétences travaillées.' }),
      task('t-formation-demo-sequence', 'Rédiger une première séquence d’entraînement', 'formation-demo', 'd-formation-demo-kit', 'agent-training', 'doing', 1, { description: 'Préparer une séquence avec une situation de départ, une activité et un débrief.' }),
      task('t-formation-demo-exercice', 'Choisir le cas pratique de la prochaine séance', 'formation-demo', 'd-formation-demo-kit', 'camille', 'todo', 0, { description: 'Choisir un cas qui permettra aux apprenants de mobiliser plusieurs compétences ensemble.' }),
      task('t-formation-demo-interactif', 'Préparer le support interactif du cas pratique', 'formation-demo', 'd-formation-demo-kit', 'alex', 'todo', 4, { dependencyIds: ['t-formation-demo-exercice'], description: 'Mettre en forme le cas choisi par Camille dans un support interactif facile à projeter.' }),

      task('t-dem-cap', 'Rassembler les principes du pilotage stratégique', 'projet-boreal', 'd-dem-cap', 'camille', 'done', -2, { description: 'Exemple de synthèse de travail : cap, objectifs, indicateurs utiles et décisions attendues.' }),
      task('t-dem-parcours', 'Affiner la navigation entre les vues du prototype', 'projet-boreal', 'd-dem-prototype', 'alex', 'doing', 0, { description: 'Rendre le passage d’une vue à l’autre plus fluide et vérifier les usages sur mobile.' }),
      task('t-dem-validation', 'Valider le parcours de démonstration', 'projet-boreal', 'd-dem-prototype', 'camille', 'todo', 0, { needsApproval: true, reviewerId: 'camille', priority: 'high', description: 'Vérifier que la démonstration relie clairement un objectif, un chantier et une décision.' }),
      task('t-dem-modele', 'Finaliser le modèle des vues prioritaires', 'projet-boreal', 'd-dem-prototype', 'alex', 'blocked', 1, { blocker: 'Le périmètre des vues attend la validation du parcours par Camille.', blockedById: 'camille', dependencyIds: ['t-dem-validation'], description: 'Reprendre le modèle des vues après validation des usages prioritaires.' }),

      task('t-av-atelier', 'Finaliser la mise en situation commerciale', 'studio-rivage', 'd-av-atelier', 'camille', 'doing', 0, { description: 'Préciser les rôles, la consigne et la grille d’observation pour l’atelier.' }),
      task('t-av-grille', 'Préparer la grille de retour des participants', 'studio-rivage', 'd-av-atelier', 'agent-training', 'todo', 2, { description: 'Proposer quelques questions courtes sur la mise en pratique et les besoins de suivi.' }),
      task('t-av-suivi', 'Construire un export lisible du suivi', 'studio-rivage', 'd-av-suivi', 'alex', 'doing', 3, { description: 'Mettre en forme un export de démonstration sans données personnelles réelles.' }),
      task('t-av-bilan', 'Préparer la trame du bilan de formation', 'studio-rivage', 'd-av-suivi', 'camille', 'todo', 5, { description: 'Définir les rubriques qui relieront les enseignements de l’atelier aux prochaines actions.' }),

      task('t-hosp-questions', 'Choisir les questions de découverte à travailler', 'maison-horizon', 'd-hosp-atelier', 'camille', 'todo', -1, { priority: 'high', description: 'Retenir les questions les plus utiles pour les exercices de découverte client.' }),
      task('t-hosp-cas', 'Contextualiser les scénarios Accueil', 'maison-horizon', 'd-hosp-atelier', 'agent-training', 'doing', 1, { description: 'Adapter les scénarios pédagogiques au contexte Accueil, à partir d’exemples fictifs.' }),
      task('t-hosp-support', 'Assembler le support de l’atelier', 'maison-horizon', 'd-hosp-atelier', 'alex', 'blocked', 3, { blocker: 'Les scénarios contextualisés doivent être remis par l’agent Pédagogie.', blockedById: 'agent-training', dependencyIds: ['t-hosp-cas'], description: 'Intégrer les scénarios et les consignes dans un support homogène.' }),
      task('t-hosp-reperes', 'Préparer la fiche de repères pour le terrain', 'maison-horizon', 'd-hosp-reperes', 'camille', 'done', -4, { description: 'Exemple de livrable terminé : une fiche synthétique des repères à garder en entretien.' }),

      task('t-oc-roles', 'Clarifier le rôle des trois agents de démonstration', 'assistant-ia', 'd-oc-cadre', 'camille', 'todo', 2, { description: 'Définir pour chaque agent sa mission, sa sortie attendue et le moment où demander une validation.' }),
      task('t-oc-consignes', 'Structurer les consignes de délégation', 'assistant-ia', 'd-oc-cadre', 'alex', 'doing', 2, { description: 'Préparer une structure de consigne commune : contexte, objectif, critères et résultat attendu.' }),
      task('t-oc-test', 'Exécuter un scénario de délégation de test', 'assistant-ia', 'd-oc-delegation', 'agent-code', 'doing', 1, { description: 'Simuler la réception d’une action, sa progression et son retour pour validation humaine.' }),
      task('t-oc-observation', 'Définir les informations utiles sur l’état des agents', 'assistant-ia', 'd-oc-delegation', 'alex', 'todo', null, { description: 'Choisir les informations nécessaires pour comprendre ce qui est en cours et ce qui attend une intervention.' }),

      task('t-inf-services', 'Dessiner la carte des services et automatisations', 'infrastructure', 'd-inf-documentation', 'alex', 'done', -2, { description: 'Exemple de cartographie achevée. Aucun identifiant ni accès réel n’est conservé dans le prototype.' }),
      task('t-inf-restauration', 'Tester la restauration d’une sauvegarde de démonstration', 'infrastructure', 'd-inf-fiabilite', 'agent-ops', 'blocked', 1, { blocker: 'Alex doit préciser l’environnement de test à utiliser.', blockedById: 'alex', dependencyIds: ['t-inf-environnement'], description: 'Vérifier la procédure sur des données de test, puis consigner le résultat.' }),
      task('t-inf-environnement', 'Préciser l’environnement du test de restauration', 'infrastructure', 'd-inf-fiabilite', 'alex', 'todo', 0, { priority: 'high', description: 'Documenter le cadre du test pour permettre à l’agent Opérations de poursuivre.' }),
      task('t-inf-routine', 'Esquisser la routine de vérification technique', 'infrastructure', null, 'agent-ops', 'todo', 4, { description: 'Proposer une routine légère pour suivre les services et les automatisations à vérifier.' })
    ];
    const deliverable = function (id, projectId, title, description, ownerId, offset) {
      const related = tasks.filter(function (entry) { return entry.deliverableId === id; });
      const blockers = related.filter(function (entry) { return entry.status === 'blocked'; });
      let status = 'todo';
      if (related.length && related.every(function (entry) { return entry.status === 'done'; })) status = 'done';
      else if (blockers.length) status = 'blocked';
      else if (related.some(function (entry) { return entry.status === 'doing' || entry.status === 'done'; })) status = 'doing';
      return { id: id, projectId: projectId, title: title, description: description, ownerId: ownerId, status: status, dueDate: date(offset), blockingReason: blockers.map(function (entry) { return entry.blocker; }).join(' '), source: 'demo', externalRefs: [] };
    };
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      seededAt: today,
      preferences: { currentUser: 'camille' },
      people: [
        { id: 'camille', name: 'Camille', short: 'LS', kind: 'human', color: 'teal', role: 'Cap, clients & pédagogie' },
        { id: 'alex', name: 'Alex', short: 'LI', kind: 'human', color: 'violet', role: 'Applications & développement' },
        { id: 'agent-code', name: 'Agent Développement', short: 'IA', kind: 'agent', color: 'blue', role: 'Code & vérification · démonstration' },
        { id: 'agent-training', name: 'Agent Pédagogie', short: 'IA', kind: 'agent', color: 'amber', role: 'Supports & activités · démonstration' },
        { id: 'agent-ops', name: 'Agent Opérations', short: 'IA', kind: 'agent', color: 'teal', role: 'Infrastructure & automatisations · démonstration' }
      ],
      objectives: [
        { id: 'goal-clients', title: 'Faire avancer les missions clients', description: 'Transformer les engagements pris en livrables utiles et en pratiques durables.', source: 'demo' },
        { id: 'goal-tools', title: 'Transformer nos méthodes en outils utiles', description: 'Relier notre savoir-faire pédagogique à des supports et applications faciles à utiliser.', source: 'demo' },
        { id: 'goal-operations', title: 'Fiabiliser notre organisation et nos agents', description: 'Déléguer clairement, rendre les passages de relais visibles et stabiliser le socle technique.', source: 'demo' }
      ],
      projects: projects,
      deliverables: [
        deliverable('d-occ-parcours', 'atelier-atlas', 'Parcours d’accompagnement', 'Cadre de la mission, déroulé et fiches de mise en pratique.', 'camille', 7),
        deliverable('d-occ-suivi', 'atelier-atlas', 'Suivi des engagements', 'Une vue simple des engagements et prochaines étapes.', 'alex', 12),
        deliverable('d-formation-demo-architecture', 'formation-demo', 'Architecture pédagogique', 'La trame reliant séquences, compétences et évaluations.', 'camille', -3),
        deliverable('d-formation-demo-kit', 'formation-demo', 'Kit de la prochaine séance', 'Séquence d’entraînement, cas pratique et support interactif.', 'camille', 8),
        deliverable('d-dem-cap', 'projet-boreal', 'Cadre du pilotage stratégique', 'Les principes qui relient cap, objectifs et décisions.', 'camille', -2),
        deliverable('d-dem-prototype', 'projet-boreal', 'Parcours du prototype', 'Navigation et vues prioritaires pour la démonstration.', 'alex', 7),
        deliverable('d-av-atelier', 'studio-rivage', 'Atelier commercial', 'Mise en situation et grille de retour des participants.', 'camille', 6),
        deliverable('d-av-suivi', 'studio-rivage', 'Livrables de suivi', 'Export de suivi et trame du bilan de formation.', 'alex', 10),
        deliverable('d-hosp-atelier', 'maison-horizon', 'Atelier contextualisé', 'Questions de découverte, scénarios et support de séance.', 'camille', 9),
        deliverable('d-hosp-reperes', 'maison-horizon', 'Repères pour le terrain', 'Une fiche synthétique pour les entretiens commerciaux.', 'camille', -4),
        deliverable('d-oc-cadre', 'assistant-ia', 'Cadre de délégation', 'Rôles des agents, consignes et validations attendues.', 'camille', 6),
        deliverable('d-oc-delegation', 'assistant-ia', 'Scénario de délégation', 'Un parcours de test et une vue lisible de l’état des agents.', 'alex', 11),
        deliverable('d-inf-documentation', 'infrastructure', 'Carte des services', 'Une cartographie de démonstration des services et automatisations.', 'alex', -2),
        deliverable('d-inf-fiabilite', 'infrastructure', 'Test de restauration', 'Environnement de test, procédure et vérification du résultat.', 'alex', 5)
      ],
      milestones: [
        { id: 'm-occ-cadre', projectId: 'atelier-atlas', title: 'Valider le parcours d’accompagnement', date: date(4), kind: 'validation', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-occ-livraison', projectId: 'atelier-atlas', title: 'Partager le kit de mise en pratique', date: date(7), kind: 'delivery', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-formation-demo-architecture', projectId: 'formation-demo', title: 'Valider la trame pédagogique', date: date(-3), kind: 'validation', status: 'done', ownerId: 'camille', source: 'demo' },
        { id: 'm-formation-demo-kit', projectId: 'formation-demo', title: 'Livrer le kit de la prochaine séance', date: date(8), kind: 'delivery', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-dem-parcours', projectId: 'projet-boreal', title: 'Revoir le parcours de démonstration', date: date(2), kind: 'validation', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-dem-prototype', projectId: 'projet-boreal', title: 'Présenter le prototype', date: date(7), kind: 'meeting', status: 'upcoming', ownerId: 'alex', source: 'demo' },
        { id: 'm-av-atelier', projectId: 'studio-rivage', title: 'Préparer l’atelier commercial', date: date(6), kind: 'meeting', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-av-suivi', projectId: 'studio-rivage', title: 'Partager les livrables de suivi', date: date(10), kind: 'delivery', status: 'upcoming', ownerId: 'alex', source: 'demo' },
        { id: 'm-hosp-scenarios', projectId: 'maison-horizon', title: 'Valider les scénarios contextualisés', date: date(3), kind: 'validation', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-hosp-atelier', projectId: 'maison-horizon', title: 'Finaliser le support d’atelier', date: date(9), kind: 'delivery', status: 'upcoming', ownerId: 'alex', source: 'demo' },
        { id: 'm-oc-cadre', projectId: 'assistant-ia', title: 'Valider les règles de délégation', date: date(6), kind: 'validation', status: 'upcoming', ownerId: 'camille', source: 'demo' },
        { id: 'm-oc-test', projectId: 'assistant-ia', title: 'Revoir le test de délégation', date: date(11), kind: 'meeting', status: 'upcoming', ownerId: 'alex', source: 'demo' },
        { id: 'm-inf-carte', projectId: 'infrastructure', title: 'Documenter la carte des services', date: date(-2), kind: 'delivery', status: 'done', ownerId: 'alex', source: 'demo' },
        { id: 'm-inf-restauration', projectId: 'infrastructure', title: 'Valider le test de restauration', date: date(5), kind: 'validation', status: 'upcoming', ownerId: 'alex', source: 'demo' }
      ],
      tasks: tasks,
      integrations: [
        { id: 'github', name: 'GitHub', description: 'Relier les actions aux issues, branches et pull requests.', status: 'planned' },
        { id: 'vercel', name: 'Vercel', description: 'Retrouver les déploiements et l’état des applications.', status: 'planned' },
        { id: 'supabase', name: 'Supabase', description: 'Suivre les bases de données et les services associés.', status: 'planned' },
        { id: 'assistant-ia', name: 'Assistant-ia', description: 'Suivre les agents et leurs actions déléguées.', status: 'planned' },
        { id: 'google-calendar', name: 'Google Calendar', description: 'Relier les jalons aux échéances et aux rendez-vous.', status: 'planned' },
        { id: 'gmail', name: 'Gmail', description: 'Rattacher les demandes et échanges clients à leur contexte.', status: 'planned' }
      ]
    };
  }
};


export function emptyData(){const d=CockpitSeed.create(new Date().toISOString().slice(0,10));for(const k of ['objectives','projects','deliverables','tasks','milestones','integrations'])d[k]=[];d.people=d.people.filter(p=>['camille','alex'].includes(p.id));d.people.push({id:'project-manager',name:'Gestionnaire de projet',short:'GP',kind:'agent',role:'Suivi des projets',color:'teal'});return d;}
