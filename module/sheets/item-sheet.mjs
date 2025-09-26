const GlobalTextEditor = foundry.applications.ux.TextEditor.implementation;
const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class SystemlessItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
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
      tabs: [
        {id: "description", label: "Description"}
      ]
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Required UI properties
    context.verticalTabs = true;

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.item = context.source;

    context.tabSources = [
      {
        source: () => "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
        data: {
          tab: context.tabs["description"],
          enrichedText: await this.#enrichHTMLField(this.document.system.description),
          rawText: this.document.system.description,
          textSource: "system.description"
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
        rollData: this.item.getRollData(),
        relativeTo: this.item,
      }
    );
  }
}
