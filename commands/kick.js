const prefix = require('../config');

module.exports = {
	name: 'kick',
	description: 'starts a vote to kick a user from an active game',
	execute(message, args, game) {
		return new Promise(resolve => {
			if(game.started === true) {
				for (const user of args) {
					user.replace('@!', '');
					game.KickUser(message, user, game);
				}
				resolve();
			}
			else {
				message.reply(`, sorry there's no games running at the minute. use the command ${prefix}start to start one!`)
					.then(resolve)
					.catch(err => console.error(err));
			}
		});
	},
};
