import { Component, Vault, TFile, Plugin, debounce, MetadataCache, CachedMetadata, TFolder } from 'obsidian';
import { BytesFormatter, DateFormatter, DecimalUnitFormatter } from './format';
import { Metrics } from './metrics';
import { MetricsCollector, NoteMetricsCollector } from './collect';
import { StatisticsPluginSettings, StatisticsPluginSettingTab } from './settings';

const DEFAULT_SETTINGS: Partial<StatisticsPluginSettings> = {
  displayIndividualItems: false,
  showNotes: false,
  showAttachments: false,
  showFiles: false,
  showLinks: false,
  showWords: false,
  showSize: false,
};

export default class StatisticsPlugin extends Plugin {

  private statusBarItem: StatisticsStatusBarItem = null;

  public vaultMetricsCollector: MetricsCollector;
  public metrics: Metrics;

  settings: StatisticsPluginSettings;

  async onload() {
    console.log('Loading vault-statistics Plugin');

    await this.loadSettings();

    this.metrics = new Metrics();

    this.vaultMetricsCollector = new MetricsCollector(this).
      setApp(this.app).
      setVault(this.app.vault).
      setMetadataCache(this.app.metadataCache).
      setMetrics(this.metrics).
      start();

    this.statusBarItem = new StatisticsStatusBarItem(this, this.addStatusBarItem()).
      setVaultMetrics(this.metrics);

    this.addSettingTab(new StatisticsPluginSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on("file-open", (file: TFile) => { this.onfileopen(file) }));
    this.registerEvent(this.app.metadataCache.on("changed", (file: TFile) => { this.onfilechanged(file) }));

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.statusBarItem.refresh();
  }

  // 打开文件时的回调
  private async onfileopen(file: TFile) {
    // console.log(`onfileopen: ${file.name}`)
    if (file == null) {
      return;
    }

    this.metrics.createdAt = this.dateToLocalString(file.stat.ctime)
    this.metrics.updatedAt = this.dateToLocalString(file.stat.mtime)

    this.updatenoteWords(file);

    this.statusBarItem.refresh();
  }

  // 笔记变化时的回调；
  private async onfilechanged(file: TFile) {
    this.metrics.updatedAt = this.dateToLocalString(file.stat.mtime);
    this.updatenoteWords(file);
  }


  // 更新笔记中的字数
  private async updatenoteWords(file: TFile) {
    this.metrics.noteWords = await this.app.vault.cachedRead(file).then((content: string) => {
      return this.app.metadataCache.getFileCache(file).sections?.map(section => {
        const sectionType = section.type;
        const startOffset = section.position?.start?.offset;
        const endOffset = section.position?.end?.offset;
        const tokenizer = NoteMetricsCollector.TOKENIZERS.get(sectionType);
        if (!tokenizer) {
          console.log(`${file.path}: no tokenizer, section.type=${section.type}`);
          return 0;
        } else {
          const tokens = tokenizer.tokenize(content.substring(startOffset, endOffset));
          return tokens.length;
        }
      }).reduce((a, b) => a + b, 0);
    }).catch((e) => {
      console.log(`${file.path} ${e}`);
      return 0;
    });
  }

  // 将时间戳转换为本地格式时间
  private dateToLocalString(timestamp: number): string {
    const date = new Date(timestamp);
    const df = new Intl.DateTimeFormat('zh-cn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);

    return df.replace(/(\d{4})[^\d]*(\d{2})[^\d]*(\d{2})[^\d]*(\d{2})[^\d]*(\d{2})[^\d]*(\d{2})/, '$1-$2-$3 $4:$5:$6');
  }

}

/**
 * {@link StatisticView} is responsible for maintaining the DOM representation
 * of a given statistic.
 */
class StatisticView {

  /** Root node for the {@link StatisticView}. */
  private containerEl: HTMLElement;

  /** Formatter that extracts and formats a value from a {@link Statistics} instance. */
  private formatter: (s: Metrics) => string;

  /**
   * Constructor.
   *
   * @param containerEl The parent element for the view.
   */
  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl.createSpan({ cls: ["obsidian-vault-statistics--item"] });
    this.setActive(false);
  }

  /**
   * Sets the name of the statistic.
   */
  setStatisticName(name: string): StatisticView {
    this.containerEl.addClass(`obsidian-vault-statistics--item-${name}`);
    return this;
  }

  /**
   * Sets the formatter to use to produce the content of the view.
   */
  setFormatter(formatter: (s: Metrics) => string): StatisticView {
    this.formatter = formatter;
    return this;
  }

  /**
   * Updates the view with the desired active status.
   *
   * Active views have the CSS class `obsidian-vault-statistics--item-active`
   * applied, inactive views have the CSS class
   * `obsidian-vault-statistics--item-inactive` applied. These classes are
   * mutually exclusive.
   */
  setActive(isActive: boolean): StatisticView {
    this.containerEl.removeClass("obsidian-vault-statistics--item--active");
    this.containerEl.removeClass("obsidian-vault-statistics--item--inactive");

    if (isActive) {
      this.containerEl.addClass("obsidian-vault-statistics--item--active");
    } else {
      this.containerEl.addClass("obsidian-vault-statistics--item--inactive");
    }

    return this;
  }

  /**
   * Refreshes the content of the view with content from the passed {@link
   * Statistics}.
   */
  refresh(s: Metrics) {
    this.containerEl.setText(this.formatter(s));
  }

  /**
   * Returns the text content of the view.
   */
  getText(): string {
    return this.containerEl.getText();
  }
}

class StatisticsStatusBarItem {

  private owner: StatisticsPlugin;

  // handle of the status bar item to draw into.
  private statusBarItem: HTMLElement;

  // raw stats
  private metrics: Metrics;

  // index of the currently displayed stat.
  private displayedStatisticIndex = 0;

  private statisticViews: Array<StatisticView> = [];

  constructor(owner: StatisticsPlugin, statusBarItem: HTMLElement) {
    this.owner = owner;
    this.statusBarItem = statusBarItem;
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("noteWords").
      setFormatter((s: Metrics) => { return new DecimalUnitFormatter("字").format(s.noteWords) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("createdAt").
      setFormatter((s: Metrics) => { return new DateFormatter("创建于").format(s.createdAt) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("updatedAt").
      setFormatter((s: Metrics) => { return new DateFormatter("更新于").format(s.updatedAt) }));

    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("notes").
      setFormatter((s: Metrics) => { return '共' + new DecimalUnitFormatter("篇笔记").format(s.notes) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("attachments").
      setFormatter((s: Metrics) => { return '共' + new DecimalUnitFormatter("个附件").format(s.attachments) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("files").
      setFormatter((s: Metrics) => { return '共' + new DecimalUnitFormatter("个文件").format(s.files) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("links").
      setFormatter((s: Metrics) => { return '共' + new DecimalUnitFormatter("个链接").format(s.links) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("words").
      setFormatter((s: Metrics) => { return '共' + new DecimalUnitFormatter("字").format(s.words) }));
    this.statisticViews.push(new StatisticView(this.statusBarItem).
      setStatisticName("sizes").
      setFormatter((s: Metrics) => { return '共' + new BytesFormatter().format(s.size) }));

    this.statusBarItem.onClickEvent(() => { this.onclick() });
  }

  public setVaultMetrics(vaultMetrics: Metrics) {
    this.metrics = vaultMetrics;
    this.owner.registerEvent(this.metrics?.on("updated", this.refreshSoon));
    this.refreshSoon();
    return this;
  }

  private refreshSoon = debounce(() => { this.refresh(); }, 2000, false);

  public refresh() {
    if (this.owner.settings.displayIndividualItems) {
      this.statisticViews[0].setActive(this.owner.settings.showNoteWords).refresh(this.metrics);
      this.statisticViews[1].setActive(this.owner.settings.showCreatedAt).refresh(this.metrics);
      this.statisticViews[2].setActive(this.owner.settings.showUpdatedAt).refresh(this.metrics);
      this.statisticViews[3].setActive(this.owner.settings.showNotes).refresh(this.metrics);
      this.statisticViews[4].setActive(this.owner.settings.showAttachments).refresh(this.metrics);
      this.statisticViews[5].setActive(this.owner.settings.showFiles).refresh(this.metrics);
      this.statisticViews[6].setActive(this.owner.settings.showLinks).refresh(this.metrics);
      this.statisticViews[7].setActive(this.owner.settings.showWords).refresh(this.metrics);
      this.statisticViews[8].setActive(this.owner.settings.showSize).refresh(this.metrics);
    } else {
      this.statisticViews.forEach((view, i) => {
        view.setActive(this.displayedStatisticIndex == i).refresh(this.metrics);
      });
    }

    this.statusBarItem.title = this.statisticViews.map(view => view.getText()).join("\n");
  }

  private onclick() {
    if (!this.owner.settings.displayIndividualItems) {
      this.displayedStatisticIndex = (this.displayedStatisticIndex + 1) % this.statisticViews.length;
    }
    this.refresh();
  }
}
