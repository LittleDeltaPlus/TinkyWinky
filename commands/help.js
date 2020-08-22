const Discord = require('discord.js');
const prefix = require('../config.json');
module.exports = {
	name: 'help',
	description: 'sends a message containing a list of available commands',
	execute(message) {
		return new Promise((resolve, reject) => {
			const helpMessage = new Discord.MessageEmbed().setTitle('Hi there, I\'m TinkyWinky! Here are some commands to get you started!');
			helpMessage.addField('Game Commands',
				`**${prefix}start** - starts a game
			**${prefix}ready** - starts a game immediately if everyone is in
			**${prefix}join** - lets you join an ongoing game for the next round
			**${prefix}kick @user** - starts a vote to remove a player from the game`,
				false);
			message.channel.send(helpMessage).then(resolve).catch(err => {
				console.error(err);
				reject();
			});
		});
	},
};