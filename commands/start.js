const PromptGame = require('../src/PromptGame');
const config = require('../config.json');
module.exports = {
	name: 'start',
	description: 'sends a start message',
	execute(message, args, game) {
		return new Promise((resolve, reject) => {
			let newGame;
			if(game === null) {
				newGame = new PromptGame(message);
				resolve(newGame);
			}
			else {
				message.channel.send(`there appears to already be a game running in this channel, try ${config.prefix}join to join in!`)
					.catch(reject);
			}
		});
	},
}