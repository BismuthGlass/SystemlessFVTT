const GlobalTextEditor = foundry.applications.ux.TextEditor.implementation;
const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Sheet for Token actors.
 * @extends {ActorSheetV2}
 */
export class SystemlessTokenSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    form: {
      submitOnChange: true
    },
    classes: ['systemless', 'sheet', 'item'],
    position: {width: 520, height: 480},
    window: {
      resizable: true
    }
  }

  static PARTS = {
    sheet: {
      template: 'systems/crow-systemless/templates/generic/document-sheet.hbs',
      templates: [
        "templates/generic/tab-navigation.hbs",
        "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
      ],
    },
  }


  static TABS = {
    sheet: {
      initial: "description",
      labelPrefix: "STEMLESS.tabs",
      tabs: [
        {id: "description"},
        {id: "notes"}
      ]
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Required UI properties
    context.verticalTabs = true;

    context.tabSources = [
      {
        source: () => "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
        data: {
          tab: context.tabs["description"],
          enrichedText: await this.#enrichHTMLField(this.document.system.description),
          rawText: this.document.system.description,
          textSource: "system.description"
        }
      },
      {
        source: () => "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
        data: {
          tab: context.tabs["notes"],
          enrichedText: await this.#enrichHTMLField(this.document.system.notes),
          rawText: this.document.system.notes,
          textSource: "system.notes"
        }
      }
    ];

    return context;
  }

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in partContext.tabs)
      partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  async #enrichHTMLField(data) {
    return await GlobalTextEditor.enrichHTML(
      data,
      {
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      }
    );
  }
}
