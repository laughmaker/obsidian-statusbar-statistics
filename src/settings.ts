import { App, PluginSettingTab, Setting } from "obsidian";

import StatisticsPlugin from "./main";

export interface StatisticsPluginSettings {
  displayIndividualItems: boolean,
  showNotes: boolean,
  showAttachments: boolean,
  showFiles: boolean,
  showLinks: boolean,
  showWords: boolean,
  showNoteWords: boolean,
  showSize: boolean,
  showCreatedAt: boolean,
  showUpdatedAt: boolean,
}

export class StatisticsPluginSettingTab extends PluginSettingTab {
  plugin: StatisticsPlugin;

  constructor(app: App, plugin: StatisticsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("显示独立统计")
      .setDesc("是否一次显示多个统计？")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.displayIndividualItems)
          .onChange(async (value) => {
            this.plugin.settings.displayIndividualItems = value;
            this.display();
            await this.plugin.saveSettings();
          });
      });

    if (!this.plugin.settings.displayIndividualItems) {
      return;
    }

    new Setting(containerEl)
      .setName("显示单条笔记字数")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showNoteWords)
          .onChange(async (value) => {
            this.plugin.settings.showNoteWords = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示文件创建日期")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showCreatedAt)
          .onChange(async (value) => {
            this.plugin.settings.showCreatedAt = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示文件更新日期")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showUpdatedAt)
          .onChange(async (value) => {
            this.plugin.settings.showUpdatedAt = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库笔记统计")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showNotes)
          .onChange(async (value) => {
            this.plugin.settings.showNotes = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库附件统计")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showAttachments)
          .onChange(async (value) => {
            this.plugin.settings.showAttachments = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库文件统计")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showFiles)
          .onChange(async (value) => {
            this.plugin.settings.showFiles = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库链接统计")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showLinks)
          .onChange(async (value) => {
            this.plugin.settings.showLinks = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库字数统计")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showWords)
          .onChange(async (value) => {
            this.plugin.settings.showWords = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("显示仓库大小")
      .addToggle((value) => {
        value
          .setValue(this.plugin.settings.showSize)
          .onChange(async (value) => {
            this.plugin.settings.showSize = value;
            await this.plugin.saveSettings();
          });
      });


  }
}
