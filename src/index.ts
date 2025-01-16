import {
	createCardTypeId,
	createContainerId,
	createEffectId,
	createFunctionId,
	createPlayerId,
	createRegex,
	createRole,
	type GameConfig,
} from "./type";

// 神経衰弱の GameConfig
const memoryGameConfig: GameConfig = {
	functions: {
		// カードをシャッフルする関数
		[createFunctionId("shuffle")]: {
			id: createFunctionId("shuffle"),
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
        function shuffle(request: { containerId: string }) {
          // request.containerId のコンテナのカードをシャッフルする
          const container = state.containers[request.containerId];
          if (!container) {
            throw new Error("Container not found");
          }
          // シャッフルアルゴリズム (例: Fisher-Yates)
          for (let i = container.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [container.cards[i], container.cards[j]] = [container.cards[j], container.cards[i]];
          }
          return null;
        }
      `,
		},
		// カードを移動する関数
		[createFunctionId("moveCards")]: {
			id: createFunctionId("moveCards"),
			requestSchema: {
				type: "object",
				key: "request",
				required: true,
				properties: {
					fromContainerId: {
						type: "string",
						key: "fromContainerId",
						required: true,
					},
					toContainerId: {
						type: "string",
						key: "toContainerId",
						required: true,
					},
					cardIds: {
						type: "array",
						key: "cardIds",
						required: true,
						items: [{ type: "string" }],
					},
				},
			},
			responseSchema: null,
			handler: `
			function moveCards(request: { fromContainerId: string[] | "mainDeck" | "field"; toContainerId: string | "currentPlayerHand"; cardIds: { cardId: string; cardTypeId: string, containerId: string }[] | "allCards" }) {
				// toContainerIdがcurrentPlayerHandの場合、現在のプレイヤーのハンドを取得
				const finalToContainerId = request.toContainerId === "currentPlayerHand" ? \`player\${state.currentPlayerId}Hand\` : request.toContainerId;
			
				const toContainer = state.containers[finalToContainerId];
				if (!toContainer) {
					throw new Error(\`To container not found: \${finalToContainerId}\`);
				}
			
				let fromContainerIds = [];
				if (typeof request.fromContainerId === "string") {
					if (request.fromContainerId === "field") {
					// fromContainerIdがfieldの場合、全てのfieldコンテナを取得
						fromContainerIds = Object.keys(state.containers).filter(
							(id) => state.containers[id].type === "field"
						);
					} else if (request.fromContainerId === "mainDeck") {
					// fromContainerIdがmainDeckの場合、mainDeckコンテナを取得
						fromContainerIds = ["mainDeck"];
					}
				} else {
					fromContainerIds = request.fromContainerId;
				}
			
				const movedCards: { id: string; cardTypeId: string; faceUp: boolean }[] = [];
				for (const containerId of fromContainerIds) {
					const fromContainer = state.containers[containerId];
					if (!fromContainer) {
					throw new Error(\`From container not found: \${containerId}\`);
					}
			
					if (request.cardIds === "allCards") {
					// fromContainerの全てのカードを移動
					movedCards.push(...fromContainer.cards);
					fromContainer.cards = [];
					} else {
						for (const { cardId } of request.cardIds) {
							const cardIndex = fromContainer.cards.findIndex(
								(c) => c.id === cardId
							);
			
							if (cardIndex === -1) {
								continue;
							}
			
							// 状態からカードを取り除く
							const [card] = fromContainer.cards.splice(cardIndex, 1);
							// 取り除いたカードを保存
							movedCards.push(card);
						}
					}
				}
			
				// カードを移動する
				toContainer.cards.push(...movedCards);
			
				return null;
			}
`,
		},
		// カードを表向きにする関数
		[createFunctionId("flipCard")]: {
			id: createFunctionId("flipCard"),
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
					cardId: {
						type: "string",
						key: "cardId",
						required: true,
					},
				},
			},
			responseSchema: null,
			handler: `
			function flipCard(request: { cardId: { cardId: string; cardTypeId: string, containerId: string }[] | "allCards" }) {
				if (request.cardId === "allCards") {
					// 全ての field のカードを対象にする
					for (const containerId in state.containers) {
						const container = state.containers[containerId];
						if (container.type === "field") {
						for (const card of container.cards) {
							card.faceUp = false; // カードを裏向きにする
						}
						}
					}
				} else {
					// 通常のカード ID の処理
					for (const { cardId, containerId } of request.cardId) {
						const container = state.containers[containerId];
						if (!container) {
							throw new Error("Container not found");
						}
						const card = container.cards.find((c) => c.id === cardId);
			
						if (!card) {
							throw new Error("Card not found");
						}
						card.faceUp = !card.faceUp;
					}
				}
				return null;
			}
			`,
		},
		// 表向きのカードを取得する関数
		[createFunctionId("getFaceUpCards")]: {
			id: createFunctionId("getFaceUpCards"),
			requestSchema: null,
			responseSchema: {
				type: "array",
				key: "faceUpCards",
				required: true,
				items: [
					{
						type: "object",
						properties: {
							cardId: { type: "string", key: "cardId", required: true },
							cardTypeId: { type: "string", key: "cardTypeId", required: true },
							containerId: {
								type: "string",
								key: "containerId",
								required: true,
							},
						},
					},
				],
			},
			handler: `
        function getFaceUpCards(): { cardId: string; cardTypeId: string, containerId: string }[] {
          const faceUpCards: { cardId: string; cardTypeId: string, containerId: string }[] = [];
          for (const containerId in state.containers) {
            const container = state.containers[containerId];
            for (const card of container.cards) {
              if (card.faceUp) {
                faceUpCards.push({ cardId: card.id, cardTypeId: card.cardTypeId, containerId });
              }
            }
          }
          return faceUpCards;
        }
      `,
		},
		// カードの枚数を数える関数
		[createFunctionId("countCards")]: {
			id: createFunctionId("countCards"),
			requestSchema: {
				type: "array",
				key: "cards",
				required: true,
				items: [
					{
						type: "object",
						properties: {
							cardId: { type: "string", key: "cardId", required: true },
							cardTypeId: { type: "string", key: "cardTypeId", required: true },
							containerId: {
								type: "string",
								key: "containerId",
								required: true,
							},
						},
					},
				],
			},
			responseSchema: {
				type: "number",
				key: "count",
				required: true,
			},
			handler: `
        function countCards(request: { cards: { cardId: string; cardTypeId: string, containerId: string }[] }): number {
          return request.cards.length;
        }
      `,
		},
		// カードが一致するかどうかを判定する関数
		[createFunctionId("checkMatch")]: {
			id: createFunctionId("checkMatch"),
			requestSchema: {
				type: "array",
				key: "cards",
				required: true,
				items: [
					{
						type: "object",
						properties: {
							cardId: { type: "string", key: "cardId", required: true },
							cardTypeId: { type: "string", key: "cardTypeId", required: true },
							containerId: {
								type: "string",
								key: "containerId",
								required: true,
							},
						},
					},
				],
			},
			responseSchema: {
				type: "object", // オブジェクト型に変更
				key: "matchResult",
				required: true,
				properties: {
					result: {
						type: "string",
						key: "result",
						required: true,
					},
					fromContainerIds: {
						type: "array",
						key: "fromContainerIds",
						required: true,
						items: [{ type: "string" }],
					},
				},
			},
			handler: `
				function checkMatch(request: { cards: { cardId: string; cardTypeId: string, containerId: string }[] }): { result: "matched" | "unmatched"; fromContainerIds: string[] } {
				if (request.cards.length !== 2) {
					throw new Error("Exactly two cards are required for checkMatch");
				}
				return request.cards[0].cardTypeId === request.cards[1].cardTypeId
					? { result: "matched", fromContainerIds: [request.cards[0].containerId, request.cards[1].containerId] }
					: { result: "unmatched", fromContainerIds: [] };
				}
			`,
		},
		// ターンを変更する関数
		[createFunctionId("changeTurn")]: {
			id: createFunctionId("changeTurn"),
			requestSchema: null,
			responseSchema: null,
			handler: `
        function changeTurn() {
          state.currentTurn = (state.currentTurn + 1) % state.turnOrder.length;
          return null;
        }
      `,
		},
		// 勝利判定用の関数
		[createFunctionId("countCardsByContainerType")]: {
			id: createFunctionId("countCardsByContainerType"),
			requestSchema: {
				type: "object",
				key: "request",
				required: true,
				properties: {
					containerType: {
						type: "string",
						key: "containerType",
						required: true,
					},
				},
			},
			responseSchema: {
				type: "array",
				key: "result",
				required: true,
				items: [
					{
						type: "object",
						properties: {
							containerId: {
								type: "string",
								key: "containerId",
								required: true,
							},
							count: { type: "number", key: "count", required: true },
						},
					},
				],
			},
			handler: `
        function countCardsByContainerType(request: { containerType: string }): { containerId: string; count: number }[] {
          const result: { containerId: string; count: number }[] = [];
          for (const containerId in state.containers) {
            const container = state.containers[containerId];
            if (container.type === request.containerType) {
              result.push({ containerId, count: container.cards.length });
            }
          }
          return result;
        }
      `,
		},
	},
	cardPool: {
		// 使用するカード
		[createCardTypeId("cardTypeA")]: {
			id: createCardTypeId("cardTypeA"),
		},
		[createCardTypeId("cardTypeB")]: {
			id: createCardTypeId("cardTypeB"),
		},
		[createCardTypeId("cardTypeC")]: {
			id: createCardTypeId("cardTypeC"),
		},
		[createCardTypeId("cardTypeD")]: {
			id: createCardTypeId("cardTypeD"),
		},
		[createCardTypeId("cardTypeE")]: {
			id: createCardTypeId("cardTypeE"),
		},
		[createCardTypeId("cardTypeF")]: {
			id: createCardTypeId("cardTypeF"),
		},
		[createCardTypeId("cardTypeG")]: {
			id: createCardTypeId("cardTypeG"),
		},
		[createCardTypeId("cardTypeH")]: {
			id: createCardTypeId("cardTypeH"),
		},
		[createCardTypeId("cardTypeI")]: {
			id: createCardTypeId("cardTypeI"),
		},
		[createCardTypeId("cardTypeJ")]: {
			id: createCardTypeId("cardTypeJ"),
		},
		[createCardTypeId("cardTypeK")]: {
			id: createCardTypeId("cardTypeK"),
		},
		[createCardTypeId("cardTypeL")]: {
			id: createCardTypeId("cardTypeL"),
		},
	},
	containers: {
		// メインデッキ
		[createContainerId("mainDeck")]: {
			id: createContainerId("mainDeck"),
			type: "deck",
			initialCards: {
				[createCardTypeId("cardTypeA")]: 4,
				[createCardTypeId("cardTypeB")]: 4,
				[createCardTypeId("cardTypeC")]: 4,
				[createCardTypeId("cardTypeD")]: 4,
				[createCardTypeId("cardTypeE")]: 4,
				[createCardTypeId("cardTypeF")]: 4,
				[createCardTypeId("cardTypeG")]: 4,
				[createCardTypeId("cardTypeH")]: 4,
				[createCardTypeId("cardTypeI")]: 4,
				[createCardTypeId("cardTypeJ")]: 4,
				[createCardTypeId("cardTypeK")]: 4,
				[createCardTypeId("cardTypeL")]: 4,
			},
		},
		// フィールド
		[createContainerId("field1")]: {
			id: createContainerId("field1"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field2")]: {
			id: createContainerId("field2"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field3")]: {
			id: createContainerId("field3"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field4")]: {
			id: createContainerId("field4"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field5")]: {
			id: createContainerId("field5"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field6")]: {
			id: createContainerId("field6"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field7")]: {
			id: createContainerId("field7"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field8")]: {
			id: createContainerId("field8"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field9")]: {
			id: createContainerId("field9"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field10")]: {
			id: createContainerId("field10"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field11")]: {
			id: createContainerId("field11"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field12")]: {
			id: createContainerId("field12"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field13")]: {
			id: createContainerId("field13"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field14")]: {
			id: createContainerId("field14"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field15")]: {
			id: createContainerId("field15"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field16")]: {
			id: createContainerId("field16"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field17")]: {
			id: createContainerId("field17"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field18")]: {
			id: createContainerId("field18"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field19")]: {
			id: createContainerId("field19"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field20")]: {
			id: createContainerId("field20"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field21")]: {
			id: createContainerId("field21"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field22")]: {
			id: createContainerId("field22"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field23")]: {
			id: createContainerId("field23"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		[createContainerId("field24")]: {
			id: createContainerId("field24"),
			type: "field",
			maxCards: 1,
			initialCards: {},
		},
		// プレイヤーの手札
		[createContainerId("player1Hand")]: {
			id: createContainerId("player1Hand"),
			type: "hand",
			initialCards: {},
		},
		[createContainerId("player2Hand")]: {
			id: createContainerId("player2Hand"),
			type: "hand",
			initialCards: {},
		},
	},
	players: {
		[createPlayerId("player1")]: {
			id: createPlayerId("player1"),
			initialRoles: [createRole("currentPlayer")],
		},
		[createPlayerId("player2")]: {
			id: createPlayerId("player2"),
			initialRoles: [],
		},
	},
	actions: {
		flip: {
			permissions: {
				allowed: [createRole("currentPlayer")],
				denied: [],
				overrides: [
					{
						condition: {
							isFaceUp: createRegex("true"), // faceUpがtrueのカードに対するオーバーライド
						},
						allowed: [], // 許可されるロールを空にすることで、フリップを禁止
						denied: [createRole("currentPlayer")], // 現在のプレイヤーを拒否リストに追加（明示的に示すため）
					},
				],
			},
			effects: [
				// faceUpがtrueのカードに対するオーバーライド
				{
					id: createEffectId("getFaceUpCardsEffect"),
					function: createFunctionId("getFaceUpCards"),
					additionalParams: {}, // 動的にパラメータを解決
					next: createEffectId("countFaceUpCardsEffect"),
					error: null,
				},
				{
					id: createEffectId("countFaceUpCardsEffect"),
					function: createFunctionId("countCards"),
					additionalParams: {
						cards: "faceUpCards",
					}, // 動的にパラメータを解決
					next: createEffectId("switchOnCountEffect"),
					error: null,
				},
				{
					id: createEffectId("switchOnCountEffect"),
					referenceKey: "count",
					cases: {
						"2": createEffectId("checkMatchEffect"),
					},
					default: null,
					error: null,
				},
				{
					id: createEffectId("checkMatchEffect"),
					function: createFunctionId("checkMatch"),
					additionalParams: {
						cards: "faceUpCards",
					}, // 動的にパラメータを解決
					next: createEffectId("switchOnMatchEffect"),
					error: null,
				},
				{
					id: createEffectId("switchOnMatchEffect"),
					referenceKey: "matchResult.result", // result を参照するように変更
					cases: {
						matched: createEffectId("moveMatchedCardsEffect"),
						unmatched: createEffectId("flipDownCardsEffect"),
					},
					default: null,
					error: null,
				},
				{
					id: createEffectId("moveMatchedCardsEffect"),
					function: createFunctionId("moveCards"),
					additionalParams: {
						fromContainerId: "matchResult.fromContainerIds",
						toContainerId: "currentPlayerHand", // 動的に解決
						cardIds: "faceUpCards", // cardIds を解決
					},
					next: null,
					error: null,
				},
				{
					id: createEffectId("flipDownCardsEffect"),
					function: createFunctionId("flipCard"),
					additionalParams: {
						containerId: "field", // containerIdを解決する必要があります
					}, // 動的にパラメータを解決
					next: createEffectId("changeTurnEffect"),
					error: null,
				},
				{
					id: createEffectId("changeTurnEffect"),
					function: createFunctionId("changeTurn"),
					additionalParams: {}, // 動的にパラメータを解決
					next: null,
					error: null,
				},
			],
			after: createEffectId("flipCardEffect"),
			before: undefined,
		},
		move: {
			permissions: {
				allowed: [createRole("system")],
				denied: [],
			},
			effects: [],
		},
		shuffle: {
			permissions: {
				allowed: [createRole("system")],
				denied: [],
			},
			effects: [],
		},
	},
	roles: [createRole("currentPlayer")],
	turnOrder: [createPlayerId("player1"), createPlayerId("player2")],
	winningConditions: {
		type: "mostCards",
		target: "hand",
		orderBy: "desc",
	},
	endConditions: [
		{
			function: createFunctionId("countCardsByContainerType"),
			additionalParams: {
				containerType: "field",
			},
			referenceKey: "count",
		},
	],
	ResultOrder: {
		function: createFunctionId("countCardsByContainerType"),
		additionalParams: {
			containerType: "hand",
		},
		referenceKey: "result",
		by: "desc",
	},
	initialEffects: [
		{
			id: createEffectId("shuffleMainDeckEffect"),
			function: createFunctionId("shuffle"),
			additionalParams: {
				containerId: "mainDeck",
			},
			next: createEffectId("distributeCardsEffect"),
			error: null,
		},
		{
			id: createEffectId("distributeCardsEffect"),
			function: createFunctionId("moveCards"),
			additionalParams: {
				fromContainerId: "mainDeck",
				toContainerId: "field",
			},
			next: null,
			error: null,
		},
		{
			id: createEffectId("flipAllFieldCards"),
			function: createFunctionId("flipCard"),
			additionalParams: {
				cardId: "allCards", // 全てのカードを対象にする
			},
			next: null,
			error: null,
		},
	],
};
