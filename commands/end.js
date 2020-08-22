module.exports = {
	name: 'end',
	description: 'Ends an active game, totaling scores',
	execute(message, args, game) {
		return new Promise(resolve => {
			game.end().then(resolve);
		});
	},
};