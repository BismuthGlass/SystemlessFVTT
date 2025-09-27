const {HTMLField} = foundry.data.fields;

export class GenericActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      biography: new HTMLField(),
      notes: new HTMLField(),
    }
  }
}

export class GenericItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      notes: new HTMLField(),
    }
  }
}

export class TokenData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      notes: new HTMLField(),
    }
  }
}
