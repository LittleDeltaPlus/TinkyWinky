module.exports = {
	name: 'ready',
	description: 'Elapses an active game SignUp timer',
	execute(message, args, game) {
		return new Promise((resolve, reject) => {
			game.signUpAccessor.end().then(resolve).catch(reject);
		});
	},
};