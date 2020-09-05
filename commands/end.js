module.exports = {
	name: 'end',
	description: 'Ends an active game, totaling scores',
	execute(JSON) {
		return new Promise(resolve => {
			JSON.game.end().then(resolve);
		});
	},
};