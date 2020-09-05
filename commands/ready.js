const config = require('../config.json');
module.exports = {
	name: 'ready',
	description: 'Elapses an active game SignUp timer',
	execute(JSON) {
		return new Promise((resolve, reject) => {
			if(JSON.game !== null) {
				JSON.game.signUpAccessor.end();
				resolve();
			}
			else {
				JSON.message.channel.send(`there are no games running here at the moment try ${config.prefix}start to begin one!`).catch(reject);
			}
		});
	},
};