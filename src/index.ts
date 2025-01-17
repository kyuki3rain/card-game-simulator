import { writeFileSync } from "node:fs";
import memoryGameConfig from "./example/memoryGame";

function main() {
	try {
		writeFileSync(
			"data/memoryGame.json",
			JSON.stringify(memoryGameConfig, null, 2),
		);
	} catch (error) {
		console.error(error);
	}
}

main();
