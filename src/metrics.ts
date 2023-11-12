import { Events, EventRef } from 'obsidian';

export interface VaultMetrics {
  files: number;
  notes: number;
  attachments: number;
  size: number;
  links: number;
  words: number;
  noteWords: number;//单篇笔记的字数
  createdAt: string;
  updatedAt: string;
}

export class VaultMetrics extends Events implements VaultMetrics {

  files: number = 0;
  notes: number = 0;
  attachments: number = 0;
  size: number = 0;
  links: number = 0;
  words: number = 0;
  createdAt: string = '';
  updatedAt: string = '';
  noteWords: number = 0;

  public reset() {
    this.files = 0;
    this.notes = 0;
    this.attachments = 0;
    this.size = 0;
    this.links = 0;
    this.words = 0;
    this.noteWords = 0;
    this.createdAt = '';
    this.updatedAt = '';
  }

  public dec(metrics: VaultMetrics) {
    this.files -= metrics?.files || 0;
    this.notes -= metrics?.notes || 0;
    this.attachments -= metrics?.attachments || 0;
    this.size -= metrics?.size || 0;
    this.links -= metrics?.links || 0;
    this.words -= metrics?.words || 0;
    this.trigger("updated");
  }

  public inc(metrics: VaultMetrics) {
    this.files += metrics?.files || 0;
    this.notes += metrics?.notes || 0;
    this.attachments += metrics?.attachments || 0;
    this.size += metrics?.size || 0;
    this.links += metrics?.links || 0;
    this.words += metrics?.words || 0;
    this.trigger("updated");
  }

  public on(name: "updated", callback: (vaultMetrics: VaultMetrics) => any, ctx?: any): EventRef {
    return super.on("updated", callback, ctx);
  }

}
