const Discord = require('discord.js');
const prefix = require('../config');
module.exports = {
	name: 'join',
	description: 'joins an active game',
	execute(JSON) {
		if(JSON.game !== null) {
			return new Promise(resolve => {
				if(JSON.game.started === true) {
					if(JSON.game.roundStarted === true) {
						Discord.client.users.cache.get(`${JSON.message.author.id}`).createDM().catch(err => console.error(err));
						Discord.client.users.cache.get(`${JSON.message.author.id}`).send(`${JSON.game.currentPrompt}`).catch(err => console.error(err));
					}
					JSON.game.playerList.push({ id: JSON.message.author.id, score: 0 }).then(resolve);
				}

			});
		}
		else {
			return new Promise(resolve => {
				JSON.message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`).then(resolve)
					.catch(err => console.error(err));
			});
		}
	},
};