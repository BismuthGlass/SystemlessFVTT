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
    header: {template: 'systems/crow-systemless/templates/item/item-sheet-header.hbs'},
    tabs: {template: 'templates/generic/tab-navigation.hbs'},
    description: {template: 'systems/crow-systemless/templates/item/item-sheet-description.hbs'}
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

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);

    // Enrich description info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await GlobalTextEditor.enrichHTML(
      this.item.system.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.item.getRollData(),
        // Relative UUID resolution
        relativeTo: this.item,
      }
    );

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.item = context.source;

    // Adding a pointer to CONFIG.SYSTEMLESS
    context.config = CONFIG.SYSTEMLESS;

    return context;
  }

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in partContext.tabs)
      partContext.tab = partContext.tabs[partId];
    return partContext;
  }
}
