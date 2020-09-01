const config = require('../config.json');
module.exports = {
	name: 'ready',
	description: 'Elapses an active game SignUp timer',
	execute(message, args, game) {
		return new Promise((resolve, reject) => {
			if(game !== null) {
				game.signUpAccessor.end();
				resolve();
			}
			else {
				message.channel.send(`there are no games running here at the moment try ${config.prefix}start to begin one!`).catch(reject);
			}
		});
	},
};