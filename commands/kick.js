const prefix = require('../config');

module.exports = {
	name: 'kick',
	description: 'starts a vote to kick a user from an active game',
	execute(JSON) {
		return new Promise(resolve => {
			if(JSON.game !== null && JSON.game.started === true) {
				for (const user of JSON.arguments) {
					user.replace('@!', '');
					JSON.game.KickUser(JSON.message, user, JSON.game);
				}
				resolve();
			}
			else {
				JSON.message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`)
					.then(resolve)
					.catch(err => console.error(err));
			}
		});
	},
};
