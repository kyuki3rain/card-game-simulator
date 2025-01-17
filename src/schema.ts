import { z } from "zod";

// SchemaNodeType
const SchemaNodeTypeSchema = z.enum([
	"string",
	"number",
	"boolean",
	"object",
	"array",
]);
type SchemaNodeType = z.infer<typeof SchemaNodeTypeSchema>;

// SchemaNodeBase
const SchemaNodeBaseSchema = z.object({
	type: SchemaNodeTypeSchema,
	key: z.string(),
	required: z.boolean(),
});
type SchemaNodeBase = z.infer<typeof SchemaNodeBaseSchema>;

// NormalSchemaNode
const NormalSchemaNodeSchema = SchemaNodeBaseSchema.extend({
	type: z.enum(["string", "number", "boolean"]),
});
type NormalSchemaNode = z.infer<typeof NormalSchemaNodeSchema>;

// ObjectSchemaNode
const ObjectSchemaNodeSchema = SchemaNodeBaseSchema.extend({
	type: z.literal("object"),
	properties: z.record(
		z.string(),
		// ここは、ObjectSchemaNode に対して再帰的に定義する必要がある
		// or で接続
		z.lazy(() => z.union([z.array(SchemaNodeSchema), SchemaNodeSchema])),
	),
});
type ObjectSchemaNode = z.infer<typeof ObjectSchemaNodeSchema>;

// ItemSchemaNode
const ItemSchemaNodeSchema = z.lazy(() =>
	z.union([
		NormalSchemaNodeSchema.omit({ required: true, key: true }),
		ObjectSchemaNodeSchema.omit({ required: true, key: true }),
		ArraySchemaNodeSchema.omit({ required: true, key: true }),
	]),
);
type ItemSchemaNode = z.infer<typeof ItemSchemaNodeSchema>;

// ArraySchemaNode
const ArraySchemaNodeSchema = SchemaNodeBaseSchema.extend({
	type: z.literal("array"),
	// or で接続
	items: z.union([z.array(ItemSchemaNodeSchema), ItemSchemaNodeSchema]),
});
type ArraySchemaNode = z.infer<typeof ArraySchemaNodeSchema>;

// SchemaNode
const SchemaNodeSchema = z.lazy(() =>
	z.union([
		NormalSchemaNodeSchema,
		ObjectSchemaNodeSchema,
		ArraySchemaNodeSchema,
	]),
);
type SchemaNode = z.infer<typeof SchemaNodeSchema>;

// FunctionId
const FunctionIdSchema = z.string().brand("FunctionId");
type FunctionId = z.infer<typeof FunctionIdSchema>;

// GameFunction
const GameFunctionSchema = z.object({
	id: FunctionIdSchema,
	requestSchema: z.union([SchemaNodeSchema, z.null()]),
	responseSchema: z.union([SchemaNodeSchema, z.null()]),
	handler: z.string(), // ここは、FunctionIdに対応する関数が存在するかを動的にチェックする必要がある。
});
type GameFunction = z.infer<typeof GameFunctionSchema>;

// EffectId
const EffectIdSchema = z.string().brand("EffectId");
type EffectId = z.infer<typeof EffectIdSchema>;

// MapperEntry
const MapperEntrySchema = z.object({
	// stateはゲーム実行時のグローバルな状態から取得する値、previousOutputは直前のエフェクトの出力から取得する値、literalは文字列、数値、真偽値のいずれか
	type: z.enum(["state", "previousOutput", "literal"]),
	value: z.string(), // "state" または "previousOutput" の場合は JSONPath 形式、"literal" の場合は文字列、数値、真偽値
});
type MapperEntry = z.infer<typeof MapperEntrySchema>;

const MapperNodeBaseSchema = z.object({
	type: z.enum(["string", "number", "boolean", "object", "array"]),
	entry: MapperEntrySchema.optional(),
});
type MapperNodeBase = z.infer<typeof MapperNodeBaseSchema>;

const NormalMapperNodeSchema = MapperNodeBaseSchema.extend({
	type: z.enum(["string", "number", "boolean"]),
	entry: MapperEntrySchema,
});
type NormalMapperNode = z.infer<typeof NormalMapperNodeSchema>;

const ObjectMapperNodeSchema = MapperNodeBaseSchema.extend({
	type: z.literal("object"),
	properties: z
		.record(
			z.string(),
			z.lazy(() => MapperNodeSchema),
		)
		.optional(),
});
type ObjectMapperNode = z.infer<typeof ObjectMapperNodeSchema>;

const ArrayMapperNodeSchema = MapperNodeBaseSchema.extend({
	type: z.literal("array"),
	items: z.array(MapperNodeBaseSchema).optional(),
});
type ArrayMapperNode = z.infer<typeof ArrayMapperNodeSchema>;

const MapperNodeSchema = z.lazy(() =>
	z.union([
		NormalMapperNodeSchema,
		ObjectMapperNodeSchema,
		ArrayMapperNodeSchema,
	]),
);
type MapperNode = z.infer<typeof MapperNodeSchema>;

// FunctionEffect
const FunctionEffectSchema = z.object({
	id: EffectIdSchema,
	type: z.literal("function"),
	function: FunctionIdSchema,
	requestMapper: MapperNodeSchema, // ここは、対応する GameFunction の requestSchema の key に基づいて、MapperEntrySchema の型を動的にチェックする必要がある
	responseMapper: MapperNodeSchema, // ここは、対応する GameFunction の responseSchema の key に基づいて、MapperEntrySchema の型を動的にチェックする必要がある
	next: EffectIdSchema.optional(),
	error: EffectIdSchema.optional(),
});
type FunctionEffect = z.infer<typeof FunctionEffectSchema>;

// SwitchEffect
// 出力は一つ前のエフェクトの出力がそのまま使われる
const SwitchEffectSchema = z.object({
	id: EffectIdSchema,
	type: z.literal("switch"),
	condition: z.string(), // 条件式 (JavaScript の式を想定)
	cases: z.record(z.string(), EffectIdSchema), // key: 条件式の評価結果, value: エフェクト ID
	default: z.union([EffectIdSchema, z.null()]),
	error: z.union([EffectIdSchema, z.null()]),
});
type SwitchEffect = z.infer<typeof SwitchEffectSchema>;

// Effect
const EffectSchema = z.lazy(() =>
	z.union([FunctionEffectSchema, SwitchEffectSchema]),
);
type Effect = z.infer<typeof EffectSchema>;

// Role
const RoleSchema = z.string().brand("Role");
type Role = z.infer<typeof RoleSchema>;

// Regex
const RegexSchema = z.string().brand("Regex");
type Regex = z.infer<typeof RegexSchema>;

// Action
const ActionSchema = z.object({
	permissions: z.object({
		allowed: z.array(RoleSchema),
		denied: z.array(RoleSchema),
		overrides: z
			.array(
				z.object({
					condition: z.record(z.string(), RegexSchema).optional(), // ここは、親の要素に応じたキー (例: CardActionConditionTypeSchema, ContainerActionConditionTypeSchema のキー) のみを受け入れるように動的にチェックする必要がある
					allowed: z.array(RoleSchema),
					denied: z.array(RoleSchema),
				}),
			)
			.optional(),
	}),
	// actionごとに固有のinitialRequestがある。
	// flip: { containerId: "string", cardId: "string" }
	// move: { containerId: "string", cardId: "string", targetContainerId: "string" }
	// など
	effects: z.record(EffectIdSchema, EffectSchema),
	before: EffectIdSchema.optional(),
	after: EffectIdSchema.optional(),
});
type Action = z.infer<typeof ActionSchema>;

// CardActionType
const CardActionTypeSchema = z.enum(["flip", "move"]);
type CardActionType = z.infer<typeof CardActionTypeSchema>;

// CardActionConditionType
const CardActionConditionTypeSchema = z.object({
	flip: z.tuple([z.literal("isFaceUp"), z.literal("isFaceDown")]),
	move: z.tuple([
		z.literal("containerId"),
		z.literal("cardId"),
		z.literal("targetContainerId"),
	]),
});
type CardActionConditionType = {
	flip: ["isFaceUp", "isFaceDown"];
	move: ["containerId", "cardId", "targetContainerId"];
};

// CardTypeId
const CardTypeIdSchema = z.string().brand("CardTypeId");
type CardTypeId = z.infer<typeof CardTypeIdSchema>;

// CardType
const CardTypeSchema = z.object({
	id: CardTypeIdSchema,
	actions: z.record(CardActionTypeSchema, ActionSchema).optional(),
});
type CardType = z.infer<typeof CardTypeSchema>;

// ContainerType
const ContainerTypeSchema = z.enum(["deck", "trash", "hand", "field"]);
type ContainerType = z.infer<typeof ContainerTypeSchema>;

// ContainerActionType
const ContainerActionTypeSchema = z.enum(["flip", "move", "shuffle"]);
type ContainerActionType = z.infer<typeof ContainerActionTypeSchema>;

// ContainerActionConditionType
const ContainerActionConditionTypeSchema = z.object({
	flip: z.tuple([z.literal("isFaceUp"), z.literal("isFaceDown")]),
	move: z.tuple([
		z.literal("containerId"),
		z.literal("cardId"),
		z.literal("targetContainerId"),
	]),
	shuffle: z.tuple([z.literal("containerId")]),
});
type ContainerActionConditionType = {
	flip: ["isFaceUp", "isFaceDown"];
	move: ["containerId", "cardId", "targetContainerId"];
	shuffle: ["containerId"];
};

// ContainerId
const ContainerIdSchema = z.string().brand("ContainerId");
type ContainerId = z.infer<typeof ContainerIdSchema>;

// Container
const ContainerSchema = z.object({
	id: ContainerIdSchema,
	type: ContainerTypeSchema,
	maxCards: z.number().optional(),
	initialCards: z.record(CardTypeIdSchema, z.number()),
	actions: z.record(ContainerActionTypeSchema, ActionSchema).optional(),
});
type Container = z.infer<typeof ContainerSchema>;

// PlayerId
const PlayerIdSchema = z.string().brand("PlayerId");
type PlayerId = z.infer<typeof PlayerIdSchema>;

// Player
const PlayerSchema = z.object({
	id: PlayerIdSchema,
	initialRoles: z.array(RoleSchema),
});
type Player = z.infer<typeof PlayerSchema>;

// GameActionType
const GameActionTypeSchema = ContainerActionTypeSchema; // Assuming they are the same
type GameActionType = z.infer<typeof GameActionTypeSchema>;

// GameActionConditionType
const GameActionConditionTypeSchema = ContainerActionConditionTypeSchema; // Assuming they are the same

// EndCondition
const EndConditionSchema = z.object({
	function: FunctionIdSchema,
	additionalParams: z.record(z.any()), // ここは、対応する GameFunction の requestSchema に基づいて、パラメータの型を動的にチェックする必要がある
	referenceKey: z.string(), // ここは、指定された function の responseSchema の key のいずれかである必要がある。動的にチェックする必要がある
});
type EndCondition = z.infer<typeof EndConditionSchema>;

// ResultOrder
const ResultOrderSchema = z.object({
	function: FunctionIdSchema,
	additionalParams: z.record(z.any()), // ここは、対応する GameFunction の requestSchema に基づいて、パラメータの型を動的にチェックする必要がある
	referenceKey: z.string(), // ここは、指定された function の responseSchema の key のいずれかである必要がある。動的にチェックする必要がある
	by: z.enum(["asc", "desc"]),
});
type ResultOrder = z.infer<typeof ResultOrderSchema>;

// GameConfig
const GameConfigSchema = z.object({
	customFunctions: z.record(FunctionIdSchema, GameFunctionSchema),
	cardPool: z.record(CardTypeIdSchema, CardTypeSchema),
	containers: z.record(ContainerIdSchema, ContainerSchema),
	players: z.record(PlayerIdSchema, PlayerSchema),
	actions: z.record(GameActionTypeSchema, ActionSchema).optional(),
	roles: z.array(RoleSchema),
	turnOrder: z.array(PlayerIdSchema),
	winningConditions: z.object({
		type: z.enum(["mostCards", "custom"]),
		target: z.string(),
		orderBy: z.enum(["asc", "desc"]),
	}),
	endConditions: z.array(EndConditionSchema),
	ResultOrder: ResultOrderSchema,
	initialize: z.array(EffectIdSchema),
	globalEffects: z.record(EffectIdSchema, EffectSchema),
});
type GameConfig = z.infer<typeof GameConfigSchema>;

export {
	SchemaNodeTypeSchema,
	SchemaNodeBaseSchema,
	NormalSchemaNodeSchema,
	ObjectSchemaNodeSchema,
	ItemSchemaNodeSchema,
	ArraySchemaNodeSchema,
	SchemaNodeSchema,
	MapperEntrySchema,
	MapperNodeBaseSchema,
	NormalMapperNodeSchema,
	ObjectMapperNodeSchema,
	ArrayMapperNodeSchema,
	MapperNodeSchema,
	FunctionIdSchema,
	GameFunctionSchema,
	EffectIdSchema,
	FunctionEffectSchema,
	SwitchEffectSchema,
	EffectSchema,
	RoleSchema,
	RegexSchema,
	ActionSchema,
	CardActionTypeSchema,
	CardActionConditionTypeSchema,
	CardTypeIdSchema,
	CardTypeSchema,
	ContainerTypeSchema,
	ContainerActionTypeSchema,
	ContainerActionConditionTypeSchema,
	ContainerIdSchema,
	ContainerSchema,
	PlayerIdSchema,
	PlayerSchema,
	GameActionTypeSchema,
	GameActionConditionTypeSchema,
	EndConditionSchema,
	ResultOrderSchema,
	GameConfigSchema,
};

export type {
	SchemaNodeType,
	SchemaNodeBase,
	NormalSchemaNode,
	ObjectSchemaNode,
	ItemSchemaNode,
	ArraySchemaNode,
	SchemaNode,
	MapperEntry,
	MapperNodeBase,
	NormalMapperNode,
	ObjectMapperNode,
	ArrayMapperNode,
	MapperNode,
	FunctionId,
	GameFunction,
	EffectId,
	FunctionEffect,
	SwitchEffect,
	Effect,
	Role,
	Regex,
	Action,
	CardActionType,
	CardActionConditionType,
	CardTypeId,
	CardType,
	ContainerType,
	ContainerActionType,
	ContainerActionConditionType,
	ContainerId,
	Container,
	PlayerId,
	Player,
	GameActionType,
	EndCondition,
	ResultOrder,
	GameConfig,
};
