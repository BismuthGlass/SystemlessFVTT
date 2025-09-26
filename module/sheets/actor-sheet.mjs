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
    sheet: {
      template: 'systems/crow-systemless/templates/generic/document-sheet.hbs',
      templates: [
        "templates/generic/tab-navigation.hbs",
        "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
        "systems/crow-systemless/templates/actor/actor-sheet-items.hbs"
      ],
    },
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

    // Required UI properties
    context.verticalTabs = true;

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.isOwner = this.actor.isOwner;
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.actor = context.source;

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    const enrichedBiography = await GlobalTextEditor.enrichHTML(
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

    // Define all tab sources
    context.tabSources = [
      {
        source: () => "systems/crow-systemless/templates/generic/text-editor-tab.hbs",
        data: {
          tab: context.tabs["biography"],
          system: actorData.system,
          enrichedText: await this.#enrichHTMLField(this.actor.system.biography),
          rawText: this.actor.system.biography,
          textSource: "system.biography",
        }
      },
      {
        source: () => "systems/crow-systemless/templates/actor/actor-sheet-items.hbs",
        data: {
          tab: context.tabs["items"],
          system: actorData.system,
          items: this.#prepareItems(context.document.items, 'item'),
        }
      }
    ];

    return context;
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
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  #prepareItems(documentItems, type) {
    const items = [];

    for (let i of documentItems) {
      i.img = i.img || Item.DEFAULT_ICON;
      if (i.type === type) {
        items.push(i);
      }
    }
    items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    return items;
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
