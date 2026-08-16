import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SongEditorComponent } from './features/song-editor/song-editor.component';

@Component({
  selector: 'app-root',
  imports: [SongEditorComponent],
  template: '<app-song-editor />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
