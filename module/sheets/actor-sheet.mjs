const GlobalTextEditor = foundry.applications.ux.TextEditor.implementation;
const { ActorSheetV2 } = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;


/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class SystemlessActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    form: {
      submitOnChange: true
    },
    classes: ['systemless', 'sheet', 'actor'],
    position: {width: 600, height: 600},
    window: {
      resizable: true
    }
  }

  static PARTS = {
    header: {template: 'systems/crow-systemless/templates/actor/actor-sheet-header.hbs'},
    tabs: {template: "templates/generic/tab-navigation.hbs"},
    biography: {template: 'systems/crow-systemless/templates/actor/actor-sheet-biography.hbs'},
    items: {template: 'systems/crow-systemless/templates/actor/actor-sheet-items.hbs'},
  }

  static TABS = {
    sheet: {
      initial: "biography",
      labelPrefix: "STEMLESS.tabs",
      tabs: [
        {id: "biography"},
        {id: "items"}
      ],
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.isOwner = this.actor.isOwner;
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.actor = context.source;

    // Adding a pointer to CONFIG.SYSTEMLESS
    context.config = CONFIG.SYSTEMLESS;

    // Prepare character data and items.
    if (actorData.type == 'actor') {
      this.#prepareItems(context);
      this.#prepareActorData(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await GlobalTextEditor.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    context.enrichedPage2 = await GlobalTextEditor.enrichHTML(
      this.actor.system.page2,
      {
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      }
    );

    return context;
  }

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in partContext.tabs)
      partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Render the item sheet for viewing/editing prior to the editable check.
    this.element.querySelectorAll('.item-edit').forEach((e) => {
        e.addEventListener('click', (ev) => {
          const li = $(ev.currentTarget).parents('.item');
          const item = this.actor.items.get(li.data('itemId'));
          item.sheet.render(true);
        });
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    this.element.querySelector('.item-create').addEventListener('click', this.#onItemCreate.bind(this));

    // Delete Inventory Item
    this.element.querySelectorAll('.item-delete').forEach((e) => {
      e.addEventListener('click', (ev) => {
        const li = $(ev.currentTarget).parents('.item');
        const item = this.actor.items.get(li.data('itemId'));
        item.delete();
        li.slideUp(200, () => this.render(false));
      });
    });

    // Active Effect management (currently disabled)
    // this.element.querySelector('.effect-control').addEventListener('click', (ev) => {
    //   const row = ev.currentTarget.closest('li');
    //   const document =
    //     row.dataset.parentId === this.actor.id
    //       ? this.actor
    //       : this.actor.items.get(row.dataset.parentId);
    //   onManageActiveEffect(ev, document);
    // });
  }

  /* -------------------------------------------- */

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  #prepareActorData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  #prepareItems(context) {
    // Initialize containers.
    const gear = [];

    // Iterate through items, allocating to containers
    for (let i of context.document.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
    }
    gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Assign and return
    context.gear = gear;
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async #onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  };
}
