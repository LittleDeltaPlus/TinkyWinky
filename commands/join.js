const Discord = require('discord.js');
const prefix = require('../config');
module.exports = {
	name: 'join',
	description: 'joins an active game',
	execute(message, args, game) {
		if(game !== null) {
			return new Promise(resolve => {
				if(game.started === true) {
					if(game.roundStarted === true) {
						Discord.client.users.cache.get(`${message.author.id}`).createDM().catch(err => console.error(err));
						Discord.client.users.cache.get(`${message.author.id}`).send(`${game.currentPrompt}`).catch(err => console.error(err));
					}
					game.playerList.push({ id: message.author.id, score: 0 }).then(resolve);
				}

			});
		}
		else {
			return new Promise(resolve => {
				message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`).then(resolve)
					.catch(err => console.error(err));
			});
		}
	},
};