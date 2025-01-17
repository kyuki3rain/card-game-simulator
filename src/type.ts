// biome-ignore lint/suspicious/noExplicitAny: 型パラメータのため実際には適切な型が入る
export type ObjectValueList<T extends Record<any, any>> = T[keyof T];

const SchemaNodeType = {
	STRING: "string",
	NUMBER: "number",
	BOOLEAN: "boolean",
	OBJECT: "object",
	ARRAY: "array",
} as const;

export type SchemaNodeType = ObjectValueList<typeof SchemaNodeType>;

export type SchemaNodeBase = {
	type: SchemaNodeType;
	key: string;
	required: boolean;
};

export type NormalSchemaNode = SchemaNodeBase & {
	type: "string" | "number" | "boolean";
};

export type ObjectSchemaNode = SchemaNodeBase & {
	type: "object";
	properties: { [key: string]: SchemaNode };
};

export type ItemSchemaNode =
	| Omit<NormalSchemaNode, "required" | "key">
	| Omit<ObjectSchemaNode, "required" | "key">
	| Omit<ArraySchemaNode, "required" | "key">;

export type ArraySchemaNode = SchemaNodeBase & {
	type: "array";
	// 配列の型を配列で指定（orで接続）
	items: ItemSchemaNode[];
};

export type SchemaNode = NormalSchemaNode | ObjectSchemaNode | ArraySchemaNode;

const functionIdBrand = Symbol();

export type FunctionId = string & { [functionIdBrand]: unknown };

export const createFunctionId = (id: string): FunctionId => id as FunctionId;

export type GameFunction = {
	id: FunctionId;
	requestSchema: SchemaNode | null;
	responseSchema: SchemaNode | null;
	// 関数を記述
	handler: string;
};

const effectIdBrand = Symbol();

export type EffectId = string & { [effectIdBrand]: unknown };

export const createEffectId = (id: string): EffectId => id as EffectId;

export type FunctionEffect = {
	id: EffectId;
	function: FunctionId;
	// biome-ignore lint/suspicious/noExplicitAny: ここは対応するfunctionのrequestSchemaを参照して動的にバリデーションを行う
	additionalParams: { [key: string]: any };
	next: EffectId | null;
	error: EffectId | null;
};

export type SwitchEffect = {
	id: string;
	// 前のeffectのresponseのobjectのうち、参照したいkeyを指定
	referenceKey: string;
	cases: {
		[key: string]: EffectId; // key: 評価結果に対するケース(e.g., "2", "matched", "unmatched")
	};
	default: EffectId | null;
	error: EffectId | null;
};

export type Effect = FunctionEffect | SwitchEffect;

const roleBrand = Symbol();

export type Role = string & { [roleBrand]: unknown };

export const createRole = (role: string): Role => role as Role;

const regexBrand = Symbol();

export type Regex = string & { [regexBrand]: unknown };

export const createRegex = (regex: string): Regex => regex as Regex;

export type Action<P extends string[]> = {
	permissions: {
		allowed: Role[];
		denied: Role[];
		overrides?: {
			condition: {
				[K in P[number]]?: Regex;
			};
			allowed: Role[];
			denied: Role[];
		}[];
	};
	effects: Effect[];
	before?: EffectId;
	after?: EffectId;
};

// const testAction: Action<["containerId"]> = {
// 	permissions: {
// 		allowed: [createRole("admin")],
// 		denied: [],
// 		overrides: [
// 			{
// 				condition: {
// 					containerId: createRegex("deck.*"),
// 					test: createRegex(".*"),
// 				},
// 				allowed: [],
// 				denied: [],
// 			},
// 		],
// 	},
// 	effects: [],
// };

const CardActionType = {
	FLIP: "flip",
	MOVE: "move",
} as const;

export type CardActionType = ObjectValueList<typeof CardActionType>;

const CardActionConditionType = {
	[CardActionType.FLIP]: ["isFaceUp", "isFaceDown"],
	[CardActionType.MOVE]: ["containerId", "cardId", "targetContainerId"],
} as const;

export type CardActionConditionType = {
	[K in keyof typeof CardActionConditionType]: (typeof CardActionConditionType)[K][number][];
};

const CardTypeIdBrand = Symbol();

export type CardTypeId = string & { [CardTypeIdBrand]: unknown };

export const createCardTypeId = (id: string): CardTypeId => id as CardTypeId;

export type CardType = {
	id: CardTypeId;
	actions?: {
		[K in CardActionType]?: Action<CardActionConditionType[K]>;
	};
};

const ContainerType = {
	DECK: "deck",
	TRASH: "trash",
	HAND: "hand",
	FIELD: "field",
} as const;

export type ContainerType = ObjectValueList<typeof ContainerType>;

const ContainerActionType = {
	...CardActionType,
	SHUFFLE: "shuffle",
} as const;

export type ContainerActionType = ObjectValueList<typeof ContainerActionType>;

const ContainerActionConditionType = {
	...CardActionConditionType,
	[ContainerActionType.SHUFFLE]: ["containerId"],
} as const;

export type ContainerActionConditionType = {
	[K in keyof typeof ContainerActionConditionType]: (typeof ContainerActionConditionType)[K][number][];
};

const ContainerIdBrand = Symbol();

export type ContainerId = string & { [ContainerIdBrand]: unknown };

export const createContainerId = (id: string): ContainerId => id as ContainerId;

export type Container = {
	id: ContainerId;
	type: ContainerType;
	maxCards?: number;
	initialCards: {
		[cardTypeId: string]: number;
	};
	actions?: {
		[K in ContainerActionType]?: Action<ContainerActionConditionType[K]>;
	};
};

const PlayerIdBrand = Symbol();

export type PlayerId = string & { [PlayerIdBrand]: unknown };

export const createPlayerId = (id: string): PlayerId => id as PlayerId;

export type Player = {
	id: PlayerId;
	initialRoles: Role[];
};

const GameActionType = {
	...ContainerActionType,
} as const;

export type GameActionType = ObjectValueList<typeof GameActionType>;

const GameActionConditionType = {
	...ContainerActionConditionType,
} as const;

export type GameActionConditionType = {
	[K in keyof typeof GameActionConditionType]: (typeof GameActionConditionType)[K][number][];
};

export type EndCondition = {
	function: FunctionId;
	// biome-ignore lint/suspicious/noExplicitAny: ここは対応するfunctionのrequestSchemaを参照して動的にバリデーションを行う
	additionalParams: { [key: string]: any };
	// functionのresponseのobjectのうち、参照したいkeyを指定
	referenceKey: string;
};

export type ResultOrder = {
	function: FunctionId;
	// biome-ignore lint/suspicious/noExplicitAny: ここは対応するfunctionのrequestSchemaを参照して動的にバリデーションを行う
	additionalParams: { [key: string]: any };
	// functionのresponseのobjectのうち、参照したいkeyを指定
	referenceKey: string;
	by: "asc" | "desc";
};

export type GameConfig = {
	customFunctions: {
		[functionId: FunctionId]: GameFunction;
	};
	cardPool: {
		[cardTypeId: CardTypeId]: CardType;
	};
	containers: {
		[containerId: ContainerId]: Container;
	};
	players: {
		[playerId: PlayerId]: Player;
	};
	actions: {
		[K in GameActionType]?: Action<GameActionConditionType[K]>;
	};
	roles: Role[];
	turnOrder: PlayerId[];
	winningConditions: {
		type: "mostCards" | "custom";
		target: string;
		orderBy: "asc" | "desc";
	};
	endConditions: EndCondition[];
	ResultOrder: ResultOrder;
	initialEffects: Effect[];
};
