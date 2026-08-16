import Dexie, { Table } from 'dexie';
import { SongDocument } from '../../domain/song-document';

export interface StoredSong {
  id: 'current';
  document: SongDocument;
  revision: number;
  updatedAt: string;
}

export interface StoredMeta {
  key: string;
  value: string;
}

export class KalimbaDatabase extends Dexie {
  songs!: Table<StoredSong, 'current'>;
  meta!: Table<StoredMeta, string>;

  constructor(name = 'kalimba-angular-v1') {
    super(name);
    this.version(1).stores({
      songs: 'id',
      meta: 'key',
    });
  }
}
