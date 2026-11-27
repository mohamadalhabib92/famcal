type Focus = () => void;

const searches: Focus[] = [];
let pending = false;

/** Enregistre le champ de recherche de l’écran au premier plan. Cmd+F l’appelle. */
export function registerSearch(focus: Focus): () => void {
  searches.push(focus);
  if (pending) {
    pending = false;
    focus();
  }
  return () => {
    const index = searches.indexOf(focus);
    if (index >= 0) searches.splice(index, 1);
  };
}

export function hasSearch(): boolean {
  return searches.length > 0;
}

/** Focalise le champ visible. Sinon, mémorise la demande pour le prochain écran. */
export function focusSearch(): boolean {
  const focus = searches[searches.length - 1];
  if (!focus) {
    pending = true;
    return false;
  }
  focus();
  return true;
}

export function resetSearch() {
  searches.length = 0;
  pending = false;
}
