const CockpitStore = (() => {
  const key = 'camille-alex-cockpit-v1';
  const MAX_CHARS = 5 * 1024 * 1024;
  const limits = {
    people: 100,
    objectives: 500,
    projects: 500,
    deliverables: 5000,
    milestones: 5000,
    tasks: 10000,
    integrations: 50
  };
  const statuses = ['todo', 'doing', 'blocked', 'done'];
  let protectedCorruptData = false;

  const plain = value => {
    if (value === null || typeof value !== 'object') return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  };

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= monthDays[month - 1];
  }

  function validate(data) {
    const errors = [];
    const fail = message => { if (errors.length < 24) errors.push(message); };
    if (!plain(data)) return { ok: false, errors: ['Le fichier doit contenir un objet JSON de sauvegarde.'] };

    // Inspection itérative : pas de prototypes exotiques, fonctions, références
    // circulaires ou arborescences démesurées, même avant la sérialisation.
    const seen = new WeakSet();
    const pending = [{ value: data, depth: 0 }];
    let visited = 0;
    while (pending.length) {
      const { value, depth } = pending.pop();
      if (++visited > 450000 || depth > 24) {
        fail('La sauvegarde est trop volumineuse ou trop profondément imbriquée.');
        break;
      }
      if (value == null || typeof value === 'boolean') continue;
      if (typeof value === 'string') {
        if (value.length > 20000) fail('Un champ de texte dépasse la taille autorisée.');
        continue;
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) fail('Une valeur numérique est invalide.');
        continue;
      }
      if (typeof value !== 'object') {
        fail('La sauvegarde contient une valeur qui ne peut pas être conservée en JSON.');
        break;
      }
      if (!Array.isArray(value) && !plain(value)) {
        fail('La sauvegarde contient un type de données non pris en charge.');
        break;
      }
      if (seen.has(value)) {
        fail('La sauvegarde contient des objets partagés ou une référence circulaire.');
        break;
      }
      seen.add(value);
      for (const name of Object.keys(value)) {
        if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
          fail('La sauvegarde contient une propriété réservée.');
          break;
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, name);
        if (!descriptor || descriptor.get || descriptor.set) {
          fail('La sauvegarde contient une propriété non prise en charge.');
          break;
        }
        // Les propriétés optionnelles `undefined` sont omises par JSON.stringify.
        if (descriptor.value === undefined && !Array.isArray(value)) continue;
        pending.push({ value: descriptor.value, depth: depth + 1 });
      }
      if (errors.length) break;
    }
    if (errors.length) return { ok: false, errors };

    try {
      if (JSON.stringify(data).length > MAX_CHARS) fail('La sauvegarde dépasse la limite de 5 Mo.');
    } catch (_) {
      fail('La sauvegarde ne peut pas être convertie en JSON.');
    }
    if (data.schemaVersion !== 1) fail('Cette sauvegarde utilise une version de données non prise en charge par le prototype V1.');

    const collections = {};
    const indexes = {};
    const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
    for (const [name, limit] of Object.entries(limits)) {
      const collection = data[name];
      if (!Array.isArray(collection)) {
        fail('La collection « ' + name + ' » est absente ou invalide.');
        collections[name] = [];
        indexes[name] = new Map();
        continue;
      }
      if (collection.length > limit) fail('La collection « ' + name + ' » contient trop d’éléments.');
      collections[name] = collection.slice(0, limit);
      const index = new Map();
      indexes[name] = index;
      for (const row of collections[name]) {
        if (!plain(row)) {
          fail('Un élément de « ' + name + ' » est invalide.');
          continue;
        }
        if (!validId(row.id)) {
          fail('Un identifiant de « ' + name + ' » est vide ou invalide.');
          continue;
        }
        if (index.has(row.id)) fail('L’identifiant « ' + row.id + ' » apparaît plusieurs fois dans « ' + name + ' ».');
        index.set(row.id, row);
      }
    }
    if (errors.length) return { ok: false, errors };

    function textField(value, label, max = 6000, required = false) {
      if (value == null && !required) return;
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
        fail(label + ' doit être un texte ' + (required ? 'non vide ' : '') + 'de ' + max + ' caractères maximum.');
      }
    }
    function enumField(value, allowed, label, required = true) {
      if (value == null && !required) return;
      if (!allowed.includes(value)) fail(label + ' contient une valeur non reconnue.');
    }
    function dateField(value, label, required = false) {
      if ((value == null || value === '') && !required) return;
      if (!validDate(value)) fail(label + ' doit être une date réelle au format AAAA-MM-JJ.');
    }
    function timeField(value, label) {
      if (value == null || value === '') return;
      if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
        fail(label + ' contient un horodatage invalide.');
      }
    }
    function reference(value, collection, label, optional = false) {
      if ((value == null || value === '') && optional) return;
      if (!validId(value) || !indexes[collection].has(value)) fail(label + ' fait référence à un élément introuvable.');
    }
    function sourceFields(row, label) {
      enumField(row.source, ['demo', 'user', 'verified'], label + ' : origine', false);
      if (row.externalRefs != null && (!Array.isArray(row.externalRefs) || row.externalRefs.length > 100)) {
        fail(label + ' : les références externes doivent être une liste de 100 éléments maximum.');
      }
    }
    function commonWorkFields(row, label) {
      textField(row.title, label + ' : titre', 180, true);
      textField(row.description, label + ' : description');
      reference(row.ownerId, 'people', label + ' : responsable');
      enumField(row.status, statuses, label + ' : statut');
      dateField(row.dueDate, label + ' : échéance');
      sourceFields(row, label);
    }

    if (!collections.people.length) fail('La sauvegarde doit contenir au moins une personne.');
    for (const person of collections.people) {
      const label = 'Personne « ' + person.id + ' »';
      textField(person.name, label + ' : nom', 100, true);
      textField(person.short, label + ' : initiales', 8);
      textField(person.role, label + ' : rôle', 240);
      enumField(person.kind, ['human', 'agent'], label + ' : type');
      enumField(person.color, ['teal', 'violet', 'blue', 'amber'], label + ' : couleur', false);
    }
    if (!plain(data.preferences)) {
      fail('Les préférences de la sauvegarde sont absentes ou invalides.');
    } else {
      reference(data.preferences.currentUser, 'people', 'Le profil actif');
      const current = indexes.people.get(data.preferences.currentUser);
      if (current && current.kind !== 'human') fail('Le profil actif doit être Camille ou Alex.');
    }
    for (const objective of collections.objectives) {
      const label = 'Objectif « ' + objective.id + ' »';
      textField(objective.title, label + ' : titre', 180, true);
      textField(objective.description, label + ' : description');
      sourceFields(objective, label);
    }
    for (const project of collections.projects) {
      const label = 'Projet « ' + project.id + ' »';
      textField(project.name, label + ' : nom', 180, true);
      textField(project.shortName, label + ' : nom court', 100);
      textField(project.code, label + ' : code', 12);
      textField(project.purpose, label + ' : finalité');
      textField(project.outcome, label + ' : résultat attendu');
      reference(project.ownerId, 'people', label + ' : responsable');
      reference(project.goalId, 'objectives', label + ' : objectif', true);
      dateField(project.dueDate, label + ' : échéance');
      if (typeof project.archived !== 'boolean') fail(label + ' : l’archivage doit être vrai ou faux.');
      if (project.order != null && (!Number.isFinite(project.order) || Math.abs(project.order) > 1000000)) fail(label + ' : l’ordre est invalide.');
      if (project.color != null && (typeof project.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(project.color))) fail(label + ' : la couleur est invalide.');
      if (project.priorities != null) {
        if (!Array.isArray(project.priorities) || project.priorities.length > 30) fail(label + ' : les priorités doivent être une liste de 30 textes maximum.');
        else project.priorities.forEach(priority => textField(priority, label + ' : priorité', 500, true));
      }
      enumField(project.detailsSource, ['demo', 'user', 'verified'], label + ' : origine des détails', false);
      sourceFields(project, label);
    }
    for (const deliverable of collections.deliverables) {
      const label = 'Livrable « ' + deliverable.id + ' »';
      commonWorkFields(deliverable, label);
      reference(deliverable.projectId, 'projects', label + ' : projet');
      textField(deliverable.blockingReason, label + ' : blocage');
    }
    for (const milestone of collections.milestones) {
      const label = 'Jalon « ' + milestone.id + ' »';
      textField(milestone.title, label + ' : titre', 180, true);
      reference(milestone.projectId, 'projects', label + ' : projet');
      reference(milestone.ownerId, 'people', label + ' : responsable', true);
      enumField(milestone.kind, ['delivery', 'validation', 'meeting'], label + ' : type');
      enumField(milestone.status, ['upcoming', 'done'], label + ' : statut');
      dateField(milestone.date, label + ' : date', true);
      sourceFields(milestone, label);
    }

    const indegree = new Map();
    const dependents = new Map();
    for (const task of collections.tasks) {
      indegree.set(task.id, 0);
      dependents.set(task.id, []);
    }
    for (const task of collections.tasks) {
      const label = 'Action « ' + task.id + ' »';
      commonWorkFields(task, label);
      reference(task.projectId, 'projects', label + ' : projet');
      reference(task.deliverableId, 'deliverables', label + ' : livrable', true);
      const deliverable = indexes.deliverables.get(task.deliverableId);
      if (deliverable && deliverable.projectId !== task.projectId) fail(label + ' : le livrable appartient à un autre projet.');
      reference(task.goalId, 'objectives', label + ' : objectif', true);
      reference(task.blockedById, 'people', label + ' : intervenant attendu', true);
      reference(task.reviewerId, 'people', label + ' : validation attendue', true);
      enumField(task.priority, ['normal', 'high'], label + ' : priorité', false);
      textField(task.blocker, label + ' : motif du blocage');
      if (task.needsApproval != null && typeof task.needsApproval !== 'boolean') fail(label + ' : la demande de validation doit être vraie ou fausse.');
      timeField(task.createdAt, label + ' : création');
      timeField(task.updatedAt, label + ' : modification');
      timeField(task.completedAt, label + ' : réalisation');
      if (task.dependencyIds != null) {
        if (!Array.isArray(task.dependencyIds) || task.dependencyIds.length > 500) {
          fail(label + ' : les dépendances doivent être une liste de 500 actions maximum.');
          continue;
        }
        const unique = new Set();
        for (const dependencyId of task.dependencyIds) {
          reference(dependencyId, 'tasks', label + ' : dépendance');
          if (dependencyId === task.id) fail(label + ' ne peut pas dépendre d’elle-même.');
          if (unique.has(dependencyId)) fail(label + ' contient deux fois la même dépendance.');
          unique.add(dependencyId);
          if (dependents.has(dependencyId)) {
            dependents.get(dependencyId).push(task.id);
            indegree.set(task.id, indegree.get(task.id) + 1);
          }
        }
      }
    }
    // Tri topologique itératif : un cycle peut parcourir plusieurs projets.
    const ready = [];
    for (const [id, degree] of indegree) if (!degree) ready.push(id);
    let resolved = 0;
    for (let cursor = 0; cursor < ready.length; cursor++) {
      const id = ready[cursor];
      resolved++;
      for (const next of dependents.get(id)) {
        indegree.set(next, indegree.get(next) - 1);
        if (!indegree.get(next)) ready.push(next);
      }
    }
    if (resolved !== collections.tasks.length) fail('Les dépendances contiennent une boucle : une action attend indirectement sa propre réalisation.');

    for (const integration of collections.integrations) {
      const label = 'Intégration « ' + integration.id + ' »';
      textField(integration.name, label + ' : nom', 100, true);
      textField(integration.description, label + ' : description', 2000);
      enumField(integration.status, ['planned'], label + ' : état');
    }
    timeField(data.savedAt, 'La date de sauvegarde');
    dateField(data.seededAt, 'La date de création de la démonstration');
    return { ok: errors.length === 0, errors };
  }

  function save(data) {
    if (protectedCorruptData) {
      return { ok: false, error: 'La sauvegarde précédente est protégée car elle est illisible. Réinitialisez les données avant de la remplacer.' };
    }
    const validation = validate(data);
    if (!validation.ok) return { ok: false, error: validation.errors[0] || 'Les données sont invalides.' };
    const savedAt = new Date().toISOString();
    try {
      const payload = JSON.stringify({ ...data, savedAt });
      if (payload.length > MAX_CHARS) return { ok: false, error: 'Les données dépassent la limite de sauvegarde de 5 Mo. Exportez-les avant de poursuivre.' };
      localStorage.setItem(key, payload);
      data.savedAt = savedAt;
      return { ok: true, error: null };
    } catch (_) {
      return { ok: false, error: 'Le navigateur refuse la sauvegarde locale ou manque d’espace. Vos modifications restent dans cet onglet : exportez-les pour les conserver.' };
    }
  }

  function load(seedFactory) {
    let stored;
    protectedCorruptData = false;
    try {
      stored = localStorage.getItem(key);
    } catch (_) {
      return { data: seedFactory(), mode: 'memory', error: 'La sauvegarde locale est indisponible dans ce navigateur. Exportez vos données avant de fermer cet onglet.' };
    }
    if (stored !== null) {
      try {
        if (stored.length > MAX_CHARS) throw new Error('Le fichier enregistré est trop volumineux.');
        const data = JSON.parse(stored);
        const validation = validate(data);
        if (!validation.ok) throw new Error(validation.errors[0]);
        return { data, mode: 'local', error: null };
      } catch (_) {
        protectedCorruptData = true;
        return {
          data: seedFactory(),
          mode: 'corrupt',
          error: 'La sauvegarde précédente est illisible et a été conservée intacte. Cette démonstration fonctionne temporairement sans sauvegarde. Vous pouvez exporter vos essais, puis réinitialiser les données.'
        };
      }
    }
    const data = seedFactory();
    const result = save(data);
    return { data, mode: result.ok ? 'local' : 'memory', error: result.error };
  }

  function clear() {
    try {
      localStorage.removeItem(key);
      protectedCorruptData = false;
      return { ok: true, error: null };
    } catch (_) {
      return { ok: false, error: 'Le navigateur ne permet pas de réinitialiser la sauvegarde locale.' };
    }
  }

  return Object.freeze({ key, load, save, validate, clear });
})();


export const validate = CockpitStore.validate;
