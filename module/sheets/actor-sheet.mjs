const GlobalTextEditor = foundry.applications.ux.TextEditor.implementation;
const { ActorSheetV2 } = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;


/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SystemlessActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['systemless', 'sheet', 'actor'],
    position: {width: 600},
  }

  static PARTS = {
    header: {template: 'systems/crow-systemless/templates/actor/actor-sheet-header.hbs'},
    tabs: {template: "templates/generic/tab-navigation.hbs"},
    bio: {template: 'systems/crow-systemless/templates/actor/actor-sheet-bio.hbs'},
    page2: {template: 'systems/crow-systemless/templates/actor/actor-sheet-page2.hbs'},
    items: {template: 'systems/crow-systemless/templates/actor/actor-sheet-items.hbs'},
  }

  static TABS = {
    sheet: {
      initial: "bio",
      tabs: [
        {id: "bio", label: "Description"},
        {id: "page2", label: "Page 2"},
        {id: "items", label: "Items"}
      ],
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    console.log(context);

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.actor = context.source;
    console.log(context);

    // Adding a pointer to CONFIG.SYSTEMLESS
    context.config = CONFIG.SYSTEMLESS;

    // Prepare character data and items.
    if (actorData.type == 'actor') {
      this.#prepareItems(context.document);
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
    console.log("prepare part");
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in partContext.tabs)
      partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    const html = $(this.element)

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this.#onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
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
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
    }

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
    const data = duplicate(header.dataset);
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
