import {
	type GameConfig,
	FunctionIdSchema,
	EffectIdSchema,
	CardTypeIdSchema,
	ContainerIdSchema,
	PlayerIdSchema,
	RoleSchema,
	GameActionTypeSchema,
} from "../schema"; // スキーマファイルのパスを適切に設定してください

// FunctionId
const ShuffleDeckFunctionId = FunctionIdSchema.parse("shuffleDeck");
const DealCardsFunctionId = FunctionIdSchema.parse("dealCards");
const CheckMatchFunctionId = FunctionIdSchema.parse("checkMatch");
const NextPlayerFunctionId = FunctionIdSchema.parse("nextPlayer");
const ResetFlippedCardsFunctionId = FunctionIdSchema.parse("resetFlippedCards");

// EffectId
const ShuffleDeckEffectId = EffectIdSchema.parse("shuffleDeckEffect");
const DealCardsEffectId = EffectIdSchema.parse("dealCardsEffect");
const CheckMatchEffectId = EffectIdSchema.parse("checkMatchEffect");
const NextPlayerEffectId = EffectIdSchema.parse("nextPlayerEffect");
const ResetFlippedCardsEffectId = EffectIdSchema.parse(
	"resetFlippedCardsEffect",
);

// CardTypeId
const Card1Id = CardTypeIdSchema.parse("card1");
const Card2Id = CardTypeIdSchema.parse("card2");

// ContainerId
const DeckId = ContainerIdSchema.parse("deck");
const TrashId = ContainerIdSchema.parse("trash");
const Field1Id = ContainerIdSchema.parse("field1");
const Field2Id = ContainerIdSchema.parse("field2");
const Field3Id = ContainerIdSchema.parse("field3");
const Field4Id = ContainerIdSchema.parse("field4");
const HandPlayer1Id = ContainerIdSchema.parse("hand-player1");
const HandPlayer2Id = ContainerIdSchema.parse("hand-player2");

// PlayerId
const Player1Id = PlayerIdSchema.parse("player1");
const Player2Id = PlayerIdSchema.parse("player2");

// Role
const PlayerRole = RoleSchema.parse("player");

// GameActionType
const FlipAction = GameActionTypeSchema.parse("flip");
const MoveAction = GameActionTypeSchema.parse("move");

const memoryGameConfig: GameConfig = {
	customFunctions: {
		[ShuffleDeckFunctionId]: {
			id: ShuffleDeckFunctionId,
			requestSchema: {
				type: "object",
				key: "request",
				required: true,
				properties: {
					containerId: {
						type: "string",
						key: "containerId",
						required: true,
					},
				},
			},
			responseSchema: null,
			handler: `
          const container = game.state.containers[params.containerId];
          if (!container) throw new Error('Container not found');
          container.cards.sort(() => Math.random() - 0.5);
        `,
		},
		[DealCardsFunctionId]: {
			id: DealCardsFunctionId,
			requestSchema: null,
			responseSchema: null,
			handler: `
          const deck = game.state.containers[DeckId];
          const fields = [Field1Id, Field2Id, Field3Id, Field4Id];
          fields.forEach(fieldId => {
            const cardId = deck.cards.pop()?.id;
            if (cardId) {
              game.runAction('move', params.playerId, { fromId: DeckId, toId: fieldId, cardId: cardId });
            }
          });
        `,
		},
		[CheckMatchFunctionId]: {
			id: CheckMatchFunctionId,
			requestSchema: null,
			responseSchema: null,
			handler: `
          const flippedCards = Object.values(game.state.containers).flatMap(c => c.cards).filter(c => c.faceUp);
          if (flippedCards.length === 2) {
            if (flippedCards[0].cardTypeId === flippedCards[1].cardTypeId) {
              game.runAction('move', params.playerId, { cardId: flippedCards[0].id, fromId: flippedCards[0].containerId, toId: 'hand-' + params.playerId });
              game.runAction('move', params.playerId, { cardId: flippedCards[1].id, fromId: flippedCards[1].containerId, toId: 'hand-' + params.playerId });
            } else {
              game.runAction('resetFlippedCards', params.playerId, {});
              game.runAction('nextPlayer', params.playerId, {});
            }
          }
        `,
		},
		[NextPlayerFunctionId]: {
			id: NextPlayerFunctionId,
			requestSchema: null,
			responseSchema: null,
			handler: `
          game.state.nextTurnOrder = (game.state.nextTurnOrder + 1) % game.state.turnOrder.length;
          game.state.currentPlayer = game.state.turnOrder[game.state.nextTurnOrder];
        `,
		},
		[ResetFlippedCardsFunctionId]: {
			id: ResetFlippedCardsFunctionId,
			requestSchema: null,
			responseSchema: null,
			handler: `
          Object.values(game.state.containers).flatMap(c => c.cards).filter(c => c.faceUp).forEach(card => card.faceUp = false);
        `,
		},
	},
	cardPool: {
		[Card1Id]: {
			id: Card1Id,
			actions: {},
		},
		[Card2Id]: {
			id: Card2Id,
			actions: {},
		},
	},
	containers: {
		[DeckId]: {
			id: DeckId,
			type: "deck",
			maxCards: 4,
			initialCards: {
				[Card1Id]: 2,
				[Card2Id]: 2,
			},
			actions: {},
		},
		[TrashId]: {
			id: TrashId,
			type: "trash",
			maxCards: 104,
			initialCards: {},
			actions: {},
		},
		[Field1Id]: {
			id: Field1Id,
			type: "field",
			maxCards: 1,
			initialCards: {},
			actions: {},
		},
		[Field2Id]: {
			id: Field2Id,
			type: "field",
			maxCards: 1,
			initialCards: {},
			actions: {},
		},
		[Field3Id]: {
			id: Field3Id,
			type: "field",
			maxCards: 1,
			initialCards: {},
			actions: {},
		},
		[Field4Id]: {
			id: Field4Id,
			type: "field",
			maxCards: 1,
			initialCards: {},
			actions: {},
		},
		[HandPlayer1Id]: {
			id: HandPlayer1Id,
			type: "hand",
			initialCards: {},
			actions: {},
		},
		[HandPlayer2Id]: {
			id: HandPlayer2Id,
			type: "hand",
			initialCards: {},
			actions: {},
		},
	},
	players: {
		[Player1Id]: {
			id: Player1Id,
			initialRoles: [PlayerRole],
		},
		[Player2Id]: {
			id: Player2Id,
			initialRoles: [PlayerRole],
		},
	},
	actions: {
		[FlipAction]: {
			type: "flip",
			metadata: {
				allowed: [PlayerRole],
				denied: [],
				overrides: [],
			},
			before: [],
			after: [CheckMatchEffectId],
		},
		[MoveAction]: {
			type: "move",
			metadata: {
				allowed: [PlayerRole],
				denied: [],
				overrides: [],
			},
			before: [],
			after: [],
		},
	},
	globalEffects: {
		[DealCardsEffectId]: {
			id: DealCardsEffectId,
			type: "function",
			function: DealCardsFunctionId,
			requestMapper: {
				type: "object",
			},
			responseMapper: {
				type: "object",
			},
		},
		[ShuffleDeckEffectId]: {
			id: ShuffleDeckEffectId,
			type: "function",
			function: ShuffleDeckFunctionId,
			requestMapper: {
				type: "object",
				properties: {
					containerId: {
						type: "string",
						entry: {
							type: "literal",
							value: "deck",
						},
					},
				},
			},
			responseMapper: {
				type: "object",
			},
		},
		[CheckMatchEffectId]: {
			id: CheckMatchEffectId,
			type: "function",
			function: CheckMatchFunctionId,
			requestMapper: {
				type: "object",
				properties: {
					playerId: {
						type: "string",
						entry: {
							type: "state",
							value: "playerId",
						},
					},
				},
			},
			responseMapper: {
				type: "object",
			},
		},
		[ResetFlippedCardsEffectId]: {
			id: ResetFlippedCardsEffectId,
			type: "function",
			function: ResetFlippedCardsFunctionId,
			requestMapper: {
				type: "object",
			},
			responseMapper: {
				type: "object",
			},
		},
		[NextPlayerEffectId]: {
			id: NextPlayerEffectId,
			type: "function",
			function: NextPlayerFunctionId,
			requestMapper: {
				type: "object",
			},
			responseMapper: {
				type: "object",
			},
		},
	},
	roles: [PlayerRole],
	turnOrder: [Player1Id, Player2Id],
	winningConditions: {
		type: "mostCards",
		target: "hand", // 各プレイヤーの 'hand' の枚数を比較
		orderBy: "desc",
	},
	endConditions: [],
	ResultOrder: {
		function: FunctionIdSchema.parse("calculateScore"), // スコアを計算する関数
		additionalParams: {},
		referenceKey: "score", // スコアを比較するためのキー
		by: "desc",
	},
	initialize: [ShuffleDeckEffectId, DealCardsEffectId],
};

export default memoryGameConfig;
