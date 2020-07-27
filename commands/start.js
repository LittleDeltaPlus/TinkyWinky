module.exports = {
	name: 'start',
	description: 'sends a start message',
	execute(message, args) {
		message.reply(` wants to start a game, react to this message with a \ud83d\ude4b to be included!`);
		return('\ud83d\ude4b');
	},
};