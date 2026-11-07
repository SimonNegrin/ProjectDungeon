import './index.css';
import { experiments } from './manifest';

const root = document.querySelector<HTMLElement>('#experiments');

if (!root) throw new Error('No se encontró #experiments');

if (experiments.length === 0) {
  const empty = document.createElement('p');
  empty.className = 'empty';
  empty.textContent = 'Todavía no hay experimentos. Copia EXP-000 como plantilla.';
  root.append(empty);
}

for (const experiment of experiments) {
  const card = document.createElement('article');
  card.className = 'experiment-card';

  const meta = document.createElement('div');
  meta.className = 'experiment-meta';
  meta.textContent = `${experiment.id} · ${experiment.status}`;

  const title = document.createElement('h2');
  title.textContent = experiment.title;

  const question = document.createElement('p');
  question.className = 'experiment-question';
  question.textContent = experiment.question;

  const description = document.createElement('p');
  description.className = 'experiment-description';
  description.textContent = experiment.description;

  const link = document.createElement('a');
  link.className = 'experiment-link';
  link.href = experiment.path;
  link.textContent = 'Abrir experimento →';

  card.append(meta, title, question, description, link);
  root.append(card);
}
