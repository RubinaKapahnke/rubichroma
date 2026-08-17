import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/song-editor/song-editor.component').then(
        ({ SongEditorComponent }) => SongEditorComponent,
      ),
    title: 'RubiChroma · Editor',
  },
  {
    path: 'player',
    loadComponent: () =>
      import('./features/player/player.component').then(({ PlayerComponent }) => PlayerComponent),
    title: 'RubiChroma · Player',
  },
  { path: '**', redirectTo: '' },
];
